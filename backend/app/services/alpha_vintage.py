import yfinance as yf
import pandas as pd
import requests
import os
import logging
from dotenv import load_dotenv
from app.services.symbol_resolver import resolve_symbol

logger = logging.getLogger(__name__)

def normalize_symbol_for_yfinance(symbol: str) -> str:
    """
    Normalize symbol for yfinance queries.
    yfinance uses hyphens for class shares (e.g., BRK-A, BRK-B, BF-A)
    """
    symbol = symbol.upper()
    # Replace dots with hyphens for class shares (BRK.A -> BRK-A)
    symbol = symbol.replace(".", "-")
    return symbol


load_dotenv()

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")

def get_historical(user_input: str):
    base_symbol = resolve_symbol(user_input).upper()

    # ============================
    # 1️⃣ TRY ALPHA VANTAGE
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
                    return df["Close"]

            except Exception as e:
                logger.debug(f"Alpha Vantage failed for {symbol}: {str(e)}")
                pass

    # ============================
    # 2️⃣ FALLBACK TO YFINANCE
    # ============================
    # Normalize symbol for yfinance (dots -> hyphens)
    yf_symbol = normalize_symbol_for_yfinance(base_symbol)
    
    # Try US stocks first (without suffix), then Indian exchanges
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
                return df["Close"]
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



def get_live_price(user_input: str):
    base_symbol = resolve_symbol(user_input).upper()

    # ============================
    # 1️⃣ TRY ALPHA VANTAGE
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
                    return price, str(pd.Timestamp.now())

            except Exception as e:
                logger.debug(f"Alpha Vantage failed for {symbol}: {str(e)}")
                pass

    # ============================
    # 2️⃣ FALLBACK TO YFINANCE
    # ============================
    # Normalize symbol for yfinance (dots -> hyphens)
    yf_symbol = normalize_symbol_for_yfinance(base_symbol)
    
    # Try US stocks first (without suffix), then Indian exchanges
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
                return float(latest["Close"]), str(df.index[-1])

            # Final fallback: info
            info = ticker.info
            price = (
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )
            if price:
                logger.info(f"✅ Fetched price from ticker.info for {symbol}: ${price:.2f}")
                return float(price), str(pd.Timestamp.now())

        except Exception as e:
            logger.debug(f"yfinance failed for {symbol}: {str(e)}")
            pass

    # ============================
    # ❌ NOTHING WORKED
    # ============================
    logger.error(f"❌ All live price sources failed for {base_symbol}. Tried: {yf_candidates}")
    raise ValueError(f"No live data found for '{base_symbol}'. Tried Alpha Vantage and yfinance. Please verify the symbol is correct.")

