import yfinance as yf
import pandas as pd
import requests
import os
import logging
import time
from dotenv import load_dotenv
from pathlib import Path
from backend.app.services.symbol_resolver import resolve_symbol

logger = logging.getLogger(__name__)

HISTORICAL_CACHE: dict[str, dict[str, object]] = {}
HISTORICAL_CACHE_TTL = 300  # 5 minutes
LIVE_PRICE_CACHE: dict[str, dict[str, object]] = {}
LIVE_PRICE_CACHE_TTL = 30  # 30 seconds

# Exchange suffixes yfinance uses directly — must NOT be replaced with hyphens
_EXCHANGE_SUFFIXES = {".NS", ".BO", ".L", ".AX", ".TO", ".HK", ".SI", ".PA", ".DE", ".F"}

def normalize_symbol_for_yfinance(symbol: str) -> str:
    """
    Normalize symbol for yfinance:
    - Preserves exchange suffixes like .NS, .BO unchanged
    - Replaces dots only for share-class suffixes (BRK.A → BRK-A)
    """
    symbol = symbol.upper()
    # If the symbol already ends with a known exchange suffix, return as-is
    for suffix in _EXCHANGE_SUFFIXES:
        if symbol.endswith(suffix):
            return symbol
    # Otherwise replace dots with hyphens (BRK.A → BRK-A, BF.B → BF-B)
    return symbol.replace(".", "-")


# Load .env from project root (/backend)
# This file is at: backend/app/services/alpha_vintage.py
# We need to go up to: backend/.env
env_path = Path(__file__).resolve().parents[2] / ".env"
logger.info(f"[SEARCH] Looking for .env file at: {env_path}")
logger.info(f"[CHECK] File exists: {env_path.exists()}")
load_dotenv(env_path)

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")

if ALPHA_VANTAGE_KEY:
    logger.info(f"[OK] Alpha Vantage API key loaded successfully (starts with: {ALPHA_VANTAGE_KEY[:4]}...)")
else:
    logger.error(f"[ERROR] Alpha Vantage API key not found!")
    logger.error(f"   Searched in: {env_path}")
    logger.error(f"   File exists: {env_path.exists()}")
    # Try to read and show what's in the .env file (without exposing secrets)
    if env_path.exists():
        with open(env_path, 'r') as f:
            lines = f.readlines()
            logger.error(f"   .env file has {len(lines)} lines")
            for line in lines:
                if 'ALPHA' in line.upper():
                    logger.error(f"   Found line with ALPHA: {line.split('=')[0]}=...")

def get_historical(user_input: str):
    base_symbol = resolve_symbol(user_input).upper()
    cache_key = base_symbol
    cached = HISTORICAL_CACHE.get(cache_key)
    if cached and (time.time() - float(cached.get("ts", 0)) < HISTORICAL_CACHE_TTL):
        cached_series = cached.get("data")
        if isinstance(cached_series, pd.Series):
            return cached_series.copy()

    # ============================
    # [1] TRY ALPHA VANTAGE
    # ============================
    if ALPHA_VANTAGE_KEY:
        alpha_candidates = [base_symbol]

        # Try Indian exchanges automatically
        for suffix in [".NSE", ".BSE"]:
            alpha_candidates.append(base_symbol + suffix)

        for symbol in alpha_candidates:
            try:
                url = (
                    "https://www.alphavantage.co/query"
                    f"?function=TIME_SERIES_DAILY"
                    f"&symbol={symbol}"
                    f"&apikey={ALPHA_VANTAGE_KEY}"
                    f"&outputsize=full"
                )
                r = requests.get(url, timeout=10)
                data = r.json()

                if "Time Series (Daily)" in data:
                    df = pd.DataFrame(data["Time Series (Daily)"]).T
                    df.index = pd.to_datetime(df.index)
                    df = df.sort_index()
                    df["Close"] = df["4. close"].astype(float)
                    series = df["Close"].copy()
                    HISTORICAL_CACHE[cache_key] = {"ts": time.time(), "data": series}
                    return series

            except Exception as e:
                logger.debug(f"Alpha Vantage failed for {symbol}: {str(e)}")
                pass

    # ============================
    # [2] FALLBACK TO YFINANCE
    # ============================
    # If the symbol already has an exchange suffix (.NS, .BO etc.) use it directly.
    # Otherwise apply dot→hyphen normalisation and try adding Indian suffixes.
    has_exchange_suffix = any(base_symbol.upper().endswith(s) for s in _EXCHANGE_SUFFIXES)

    if has_exchange_suffix:
        # e.g. HCLTECH.NS  →  try as-is, then swap to the other Indian exchange
        yf_candidates = [base_symbol]
        if base_symbol.upper().endswith(".NS"):
            yf_candidates.append(base_symbol[:-3] + ".BO")
        elif base_symbol.upper().endswith(".BO"):
            yf_candidates.append(base_symbol[:-3] + ".NS")
    else:
        yf_symbol     = normalize_symbol_for_yfinance(base_symbol)
        yf_candidates = [yf_symbol, base_symbol + ".NS", base_symbol + ".BO"]

    for symbol in yf_candidates:
        try:
            logger.info(f"Trying yfinance for: {symbol}")
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="2y")

            if not df.empty:
                logger.info(f"✅ Successfully fetched historical data for {symbol}")
                if df.index.tz is not None:
                    df.index = df.index.tz_localize(None)
                series = df["Close"].copy()
                HISTORICAL_CACHE[cache_key] = {"ts": time.time(), "data": series}
                return series
            else:
                logger.debug(f"Empty dataframe for {symbol}")

        except Exception as e:
            logger.debug(f"yfinance failed for {symbol}: {str(e)}")
            pass

    # ============================
    # ❌ NOTHING WORKED
    # ============================
    logger.error(f"❌ All data sources failed for {base_symbol}. Tried: Alpha Vantage and yfinance with variants: {yf_candidates}")
    raise ValueError(f"No historical data found for '{base_symbol}'. Tried Alpha Vantage and yfinance. Please verify the symbol is correct.")

def get_last_closed_price(user_input: str):
    """
    Returns the official LAST COMPLETED market close price.
    NOT live tick, NOT forming candle.
    """
    series = get_historical(user_input)

    if series.empty:
        raise ValueError("Historical series is empty")

    # Ensure datetime index
    series.index = pd.to_datetime(series.index)
    series = series.sort_index()

    last_close_price = float(series.iloc[-1])
    last_close_time  = str(series.index[-1])

    return last_close_price, last_close_time

def get_live_price(user_input: str):
    base_symbol = resolve_symbol(user_input).upper()
    cache_key = base_symbol
    cached = LIVE_PRICE_CACHE.get(cache_key)
    if cached and (time.time() - float(cached.get("ts", 0)) < LIVE_PRICE_CACHE_TTL):
        cached_price = cached.get("price")
        cached_time = cached.get("time")
        if isinstance(cached_price, (int, float)) and isinstance(cached_time, str):
            return float(cached_price), cached_time

    # ============================
    # [1] TRY ALPHA VANTAGE
    # ============================
    if ALPHA_VANTAGE_KEY:
        alpha_candidates = [base_symbol]

        for suffix in [".NSE", ".BSE"]:
            alpha_candidates.append(base_symbol + suffix)

        for symbol in alpha_candidates:
            try:
                url = (
                    "https://www.alphavantage.co/query"
                    f"?function=GLOBAL_QUOTE"
                    f"&symbol={symbol}"
                    f"&apikey={ALPHA_VANTAGE_KEY}"
                )
                r = requests.get(url, timeout=5)
                data = r.json()

                if (
                    "Global Quote" in data
                    and "05. price" in data["Global Quote"]
                    and data["Global Quote"]["05. price"]
                ):
                    price = float(data["Global Quote"]["05. price"])
                    ts = str(pd.Timestamp.now())
                    LIVE_PRICE_CACHE[cache_key] = {"ts": time.time(), "price": price, "time": ts}
                    return price, ts

            except Exception as e:
                logger.debug(f"Alpha Vantage failed for {symbol}: {str(e)}")
                pass

    # ============================
    # [2] FALLBACK TO YFINANCE
    # ============================
    # If the symbol already has an exchange suffix (.NS, .BO etc.) use it directly.
    has_exchange_suffix = any(base_symbol.upper().endswith(s) for s in _EXCHANGE_SUFFIXES)

    if has_exchange_suffix:
        yf_candidates = [base_symbol]
        if base_symbol.upper().endswith(".NS"):
            yf_candidates.append(base_symbol[:-3] + ".BO")
        elif base_symbol.upper().endswith(".BO"):
            yf_candidates.append(base_symbol[:-3] + ".NS")
    else:
        yf_symbol     = normalize_symbol_for_yfinance(base_symbol)
        yf_candidates = [yf_symbol, base_symbol + ".NS", base_symbol + ".BO"]

    for symbol in yf_candidates:
        try:
            logger.info(f"Trying yfinance for live price: {symbol}")
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="1d", interval="1m")

            if df.empty:
                df = ticker.history(period="1d")

            if not df.empty:
                latest = df.iloc[-1]
                logger.info(f"✅ Successfully fetched live price for {symbol}: ${latest['Close']:.2f}")
                price = float(latest["Close"])
                ts = str(df.index[-1])
                LIVE_PRICE_CACHE[cache_key] = {"ts": time.time(), "price": price, "time": ts}
                return price, ts

            # Final fallback: info
            info = ticker.info
            price = (
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )
            if price:
                logger.info(f"✅ Fetched price from ticker.info for {symbol}: ${price:.2f}")
                ts = str(pd.Timestamp.now())
                LIVE_PRICE_CACHE[cache_key] = {"ts": time.time(), "price": float(price), "time": ts}
                return float(price), ts

        except Exception as e:
            logger.debug(f"yfinance failed for {symbol}: {str(e)}")
            pass

    # ============================
    # ❌ NOTHING WORKED
    # ============================
    logger.error(f"❌ All live price sources failed for {base_symbol}. Tried: {yf_candidates}")
    raise ValueError(f"No live data found for '{base_symbol}'. Tried Alpha Vantage and yfinance. Please verify the symbol is correct.")

