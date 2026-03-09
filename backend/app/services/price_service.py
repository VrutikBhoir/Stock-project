import requests
import yfinance as yf
import os
import json
import re
from pathlib import Path
from backend.app.utils import get_yfinance_symbol

ALPHA_KEY = os.getenv("ALPHA_VANTAGE_KEY")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Multi-Currency Support: Convert USD prices to INR for unified portfolio tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Currency conversion rate (can be refreshed periodically)
USD_TO_INR = 83.5

# USD-traded exchanges
US_EXCHANGES = {"NASDAQ", "NYSE"}

# INR-traded exchanges
INDIA_EXCHANGES = {"NSE", "BSE"}

_STOCK_EXCHANGE_MAP = {}


def _normalize_exchange_label(exchange: str) -> str:
    """Normalize exchange labels from different data sources."""
    if not exchange:
        return "NASDAQ"

    normalized = exchange.upper().strip()
    if normalized in {"US", "USA"}:
        return "NASDAQ"
    if normalized in {"INDIA", "NSE"}:
        return "NSE"
    if normalized == "BSE":
        return "BSE"
    if normalized in {"NYSE", "NASDAQ"}:
        return normalized
    if normalized in {"NMS", "NAS"}:
        return "NASDAQ"
    if normalized in {"NYQ", "NYS"}:
        return "NYSE"
    return "NASDAQ"


def _load_stock_exchange_map() -> None:
    """Load symbol -> exchange mapping from shared JSON and frontend stocks.ts."""
    global _STOCK_EXCHANGE_MAP

    project_root = Path(__file__).resolve().parents[3]
    map_data = {}

    # 1) shared/stocks.json
    shared_stocks = project_root / "shared" / "stocks.json"
    if shared_stocks.exists():
        try:
            raw = json.loads(shared_stocks.read_text(encoding="utf-8"))
            for symbol, meta in raw.items():
                exchange = _normalize_exchange_label(meta.get("exchange", ""))
                map_data[symbol.upper()] = exchange
        except Exception:
            pass

    # 2) frontend/data/stocks.ts (authoritative per project context)
    stocks_ts = project_root / "frontend" / "data" / "stocks.ts"
    if stocks_ts.exists():
        try:
            content = stocks_ts.read_text(encoding="utf-8")
            pattern = re.compile(
                r'symbol:\s*"([^"]+)"[\s\S]*?exchange:\s*"(NASDAQ|NYSE|NSE|BSE)"',
                re.IGNORECASE,
            )
            for symbol, exchange in pattern.findall(content):
                map_data[symbol.upper()] = _normalize_exchange_label(exchange)
        except Exception:
            pass

    _STOCK_EXCHANGE_MAP = map_data


_load_stock_exchange_map()


def get_exchange_for_symbol(symbol: str) -> str:
    """
    Determine the exchange for a given stock symbol.
    
    Priority:
    1. Check stocks.json for explicit exchange mapping
    2. Fall back to symbol suffix heuristics (.NS = NSE, .BO = BSE)
    3. Default to US exchange if no suffix
    
    Returns: Exchange identifier (NASDAQ, NYSE, NSE, BSE)
    """
    normalized_symbol = symbol.upper().strip()

    # Remove common suffixes for lookup
    base_symbol = normalized_symbol.replace(".NS", "").replace(".BO", "")

    # Check stocks.json mapping
    if base_symbol in _STOCK_EXCHANGE_MAP:
        return _normalize_exchange_label(_STOCK_EXCHANGE_MAP[base_symbol])

    # Heuristic: suffix-based detection
    if normalized_symbol.endswith(".NS"):
        return "NSE"
    elif normalized_symbol.endswith(".BO"):
        return "BSE"

    # Default to US exchange for non-suffixed symbols
    return "NASDAQ"


def normalize_price(price: float, exchange: str) -> float:
    """
    Convert USD stocks to INR.
    NSE/BSE stocks remain unchanged.
    """
    normalized_exchange = _normalize_exchange_label(exchange)

    # Convert USD to INR for US exchanges
    if normalized_exchange in US_EXCHANGES:
        return price * USD_TO_INR

    # Return as-is for Indian exchanges (already in INR)
    return price


def get_stock_price(symbol: str):
    """
        Fetch the latest raw market price and exchange metadata.

        Returns:
            {
                "symbol": "AAPL",
                "price": 262.0,
                "exchange": "NASDAQ"
            }
    """
    normalized_symbol = symbol.upper().strip()
    yfinance_base_symbol = get_yfinance_symbol(normalized_symbol)

    candidates = [normalized_symbol]

    if yfinance_base_symbol not in candidates:
        candidates.append(yfinance_base_symbol)

    if not any(c.endswith(".NS") for c in candidates):
        candidates.append(f"{normalized_symbol}.NS")

    if not any(c.endswith(".BO") for c in candidates):
        candidates.append(f"{normalized_symbol}.BO")

    # Deduplicate while preserving order
    seen = set()
    candidates = [c for c in candidates if not (c in seen or seen.add(c))]

    raw_price = None
    used_symbol = normalized_symbol

    try:
        url = "https://www.alphavantage.co/query"

        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": normalized_symbol,
            "apikey": ALPHA_KEY
        }

        r = requests.get(url, params=params, timeout=10).json()

        if "Global Quote" in r and r["Global Quote"]:
            raw_price = float(r["Global Quote"]["05. price"])
            used_symbol = normalized_symbol

    except Exception:
        pass  # Fall through to yfinance

    # Fallback → yfinance
    if raw_price is None:
        for ticker_symbol in candidates:
            try:
                ticker = yf.Ticker(ticker_symbol)
                data = ticker.history(period="1d")

                if not data.empty:
                    raw_price = float(data["Close"].iloc[-1])
                    used_symbol = ticker_symbol
                    break
            except Exception:
                continue

    if raw_price is None:
        raise Exception(f"Could not fetch price for {normalized_symbol}")

    # Determine exchange but keep raw market currency here.
    exchange = get_exchange_for_symbol(used_symbol)

    return {
        "symbol": normalized_symbol,
        "price": raw_price,
        "exchange": exchange,
    }