from fastapi import APIRouter, Query
import yfinance as yf

from backend.app.services.analysis.market_signals import generate_market_signals
from backend.app.services.news.news_sentiment import analyze_news_sentiment_for_symbol
from backend.app.utils import RateLimiter, cache_manager, get_yfinance_symbol

router = APIRouter(prefix="/api", tags=["Quotes"])


@router.get("/quotes")
def get_quotes(symbols: str = Query(..., description="Comma-separated symbols")):
    """
    Returns live quotes + AI signals + news sentiment.
    NEVER crashes frontend.
    """

    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    quotes = {}

    # 1️⃣ Generate AI signals ONCE
    signals = generate_market_signals(symbol_list)
    signal_map = {s["symbol"]: s for s in signals}

    for symbol in symbol_list:
        try:
            # --- PRICE ---
            yf_symbol = get_yfinance_symbol(symbol)
            ticker = yf.Ticker(yf_symbol)
            info = ticker.fast_info

            price = info.get("lastPrice")
            prev = info.get("previousClose")

            change = None
            change_percent = None
            if price and prev:
                change = price - prev
                change_percent = (change / prev) * 100

            # --- NEWS ---
            news = analyze_news_sentiment_for_symbol(symbol)
            headlines = news.get("headlines", [])

            # --- RESPONSE ---
            quotes[symbol] = {
                "symbol": symbol,
                "currentPrice": price,
                "price": price,
                "change": change,
                "changePercent": change_percent,
                "volume": info.get("volume"),

                # 🔥 AI SIGNAL
                "signal": signal_map.get(symbol, {}).get("signal", "neutral"),
                "confidence": signal_map.get(symbol, {}).get("confidence", 60),

                # 📰 NEWS
                "news": {
                    "sentiment": news.get("sentiment", "Neutral"),
                    "confidence": int(news.get("confidence", 0.0) * 100),
                    "headline": headlines[0] if headlines else "No recent headline available",
                    "summary": news.get("summary", ""),
                    "impact": news.get("market_impact", "Low"),
                }
            }

        except Exception:
            # 🔒 SAFE FALLBACK
            quotes[symbol] = {
                "symbol": symbol,
                "currentPrice": None,
                "price": None,
                "change": None,
                "changePercent": None,
                "volume": None,
                "signal": "neutral",
                "confidence": 60,
                "news": {
                    "sentiment": "Neutral",
                    "confidence": 50,
                    "headline": "Market data unavailable",
                    "summary": "",
                    "impact": "Low",
                }
            }

    return quotes