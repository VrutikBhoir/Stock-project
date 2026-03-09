import pandas as pd
from backend.app.services.data_processor import fetch_price_series


class TechnicalIndicators:
    def __init__(self):
        pass

    # ---------- BASIC INDICATORS ----------
    def calculate_sma(self, data, window=20):
        return data.rolling(window=window).mean()

    def calculate_ema(self, data, window=20):
        return data.ewm(span=window).mean()

    def calculate_rsi(self, data, window=14):
        delta = data.diff()
        gain = delta.where(delta > 0, 0).rolling(window=window).mean()
        loss = -delta.where(delta < 0, 0).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    def calculate_macd(self, data):
        ema_fast = self.calculate_ema(data, 12)
        ema_slow = self.calculate_ema(data, 26)
        macd = ema_fast - ema_slow
        signal = self.calculate_ema(macd, 9)
        return macd.iloc[-1], signal.iloc[-1]

    def calculate_bollinger(self, data):
        sma = self.calculate_sma(data)
        std = data.rolling(20).std()
        return sma.iloc[-1], (sma + 2 * std).iloc[-1], (sma - 2 * std).iloc[-1]


# ----------------------------------
# 🔥 SYMBOL-LEVEL FUNCTIONS
# ----------------------------------

_indicators = TechnicalIndicators()


def calculate_rsi(symbol: str) -> float:
    prices = fetch_price_series(symbol)
    rsi_series = _indicators.calculate_rsi(prices)
    return round(float(rsi_series.iloc[-1]), 2)


def detect_trend(symbol: str) -> str:
    prices = fetch_price_series(symbol)

    sma_20 = _indicators.calculate_sma(prices, 20).iloc[-1]
    sma_50 = _indicators.calculate_sma(prices, 50).iloc[-1]
    last_price = prices.iloc[-1]

    if last_price > sma_20 > sma_50:
        return "Uptrend"
    elif last_price < sma_20 < sma_50:
        return "Downtrend"
    else:
        return "Sideways"