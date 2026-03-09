from fastapi import APIRouter, Query
import yfinance as yf

router = APIRouter()

@router.get("/candles")
def get_candles(
    symbol: str = Query(...),
    limit: int = Query(20)
):
    try:
        symbol = symbol.upper().strip()

        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d", interval="5m")

        if hist.empty:
            return []

        candles = []
        for _, row in hist.tail(limit).iterrows():
            candles.append({
                "time": int(row.name.timestamp()),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
            })

        return candles

    except Exception as e:
        return []