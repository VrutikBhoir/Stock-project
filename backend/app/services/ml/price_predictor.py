import os
import pickle
import logging
import joblib
import pandas as pd
import numpy as np
from datetime import timedelta
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from backend.app.services.alpha_vintage import get_last_closed_price
from backend.app.services.alpha_vintage import get_historical, get_live_price
from backend.app.services.ml.model_loader import ensure_model_file

logger = logging.getLogger(__name__)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "all_forecasts.pkl")
LSTM_MODEL_PATH = os.path.join(BASE_DIR, "models", "lstm_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "models", "feature_scaler.pkl")


def predict_price(symbol: str, steps: int = 10, confidence_level: float = 0.95):
    """
    Enhanced stock price prediction with confidence intervals and accuracy metrics
    
    Args:
        symbol: Stock ticker symbol
        steps: Number of days to forecast
        confidence_level: Confidence level for prediction intervals (default 0.95)
    
    Returns:
        Dictionary containing predictions, confidence intervals, and metrics
    """
    
    # 1️⃣ Fetch REAL historical data
    historical = get_historical(symbol)

    # 2️⃣ Fetch near-realtime price
    live_price, live_time = get_live_price(symbol)
    historical.index = pd.to_datetime(historical.index)
    historical = historical.sort_index().tail(120)
    historical = historical.asfreq("B", method="ffill")
    last_close_price, last_close_time = get_last_closed_price(symbol)
    logger.info(
        "[MODEL_INPUT] symbol=%s steps=%s live_price=%.4f hist_points=%s last_hist=%.4f",
        symbol,
        steps,
        float(live_price),
        len(historical),
        float(historical.iloc[-1]) if len(historical) else 0.0,
        last_close_price,
        last_close_time
    )

    # 3️⃣ Load trained model metadata (fail fast if missing)
    try:
        model_path = ensure_model_file(path=MODEL_PATH)
        bundle = joblib.load(model_path)
    except (FileNotFoundError, EOFError, pickle.UnpicklingError, Exception) as e:
        raise RuntimeError(f"Model file missing or invalid: {str(e)}") from e

    arima_order = bundle.get("order", (5, 1, 0))
    sarima_seasonal = bundle.get("seasonal_order", (1, 1, 1, 5))

    # Avoid overlap between seasonal and non-seasonal AR lags
    if sarima_seasonal[0] > 0 and sarima_seasonal[3] <= arima_order[0]:
        sarima_seasonal = (0, sarima_seasonal[1], sarima_seasonal[2], sarima_seasonal[3])

    # 4️⃣ Re-fit models with error handling
    try:
        arima = ARIMA(historical, order=arima_order).fit()
        sarima = SARIMAX(
            historical,
            order=arima_order,
            seasonal_order=sarima_seasonal
        ).fit(disp=False)
        
        # 5️⃣ Generate forecasts with confidence intervals
        arima_forecast_obj = arima.get_forecast(steps=steps)
        sarima_forecast_obj = sarima.get_forecast(steps=steps)
        
        # Extract point forecasts
        arima_fc = arima_forecast_obj.predicted_mean
        sarima_fc = sarima_forecast_obj.predicted_mean
        
        # Extract confidence intervals
        arima_ci = arima_forecast_obj.conf_int(alpha=1-confidence_level)
        sarima_ci = sarima_forecast_obj.conf_int(alpha=1-confidence_level)
        
        # Ensemble: Average predictions
        final_fc = (arima_fc.values + sarima_fc.values) / 2
        
        # Ensemble: Average confidence intervals
        lower_bound = (arima_ci.iloc[:, 0].values + sarima_ci.iloc[:, 0].values) / 2
        upper_bound = (arima_ci.iloc[:, 1].values + sarima_ci.iloc[:, 1].values) / 2

        # 6️⃣ Calculate prediction uncertainty metrics
        forecast_std = np.std([arima_fc.values, sarima_fc.values], axis=0)

    except Exception as e:
        print(f"WARNING: Model fitting failed ({str(e)}). Using simple fallback.")
        # Fallback: Simple Moving Average (last 5 points)
        last_price = float(historical.iloc[-1])
        ma = float(historical.tail(5).mean())
        
        # Use a simple trend based on MA vs Last Price
        trend = (last_price - ma) / 10  # Damped trend
        
        final_fc = np.array([last_price + (trend * (i+1)) for i in range(steps)])
        
        # Wide confidence intervals for fallback
        std = historical.std()
        lower_bound = final_fc - (1.96 * std)
        upper_bound = final_fc + (1.96 * std)
        forecast_std = np.full(steps, std)
        
        accuracy_metrics = None # Cannot calculate accuracy for fallback
    
    # 7️⃣ Backtest on recent data for accuracy metrics
    train_size = int(len(historical) * 0.8)
    train, test = historical[:train_size], historical[train_size:]
    
    try:
        if len(test) > 0:
            # Refit on training data
            arima_train = ARIMA(train, order=arima_order).fit()
            sarima_train = SARIMAX(train, order=arima_order, seasonal_order=sarima_seasonal).fit(disp=False)
            
            # Forecast test period
            test_steps = len(test)
            arima_test_fc = arima_train.forecast(steps=test_steps)
            sarima_test_fc = sarima_train.forecast(steps=test_steps)
            ensemble_test_fc = (arima_test_fc + sarima_test_fc) / 2
            
            # Calculate metrics
            rmse = np.sqrt(mean_squared_error(test, ensemble_test_fc))
            mae = mean_absolute_error(test, ensemble_test_fc)
            mape = mean_absolute_percentage_error(test, ensemble_test_fc) * 100
            
            accuracy_metrics = {
                "rmse": float(rmse),
                "mae": float(mae),
                "mape": float(mape),
                "test_size": len(test)
            }
        else:
            accuracy_metrics = None
    except Exception as e:
        print(f"WARNING: Backtesting failed ({str(e)}). Skipping metrics.")
        accuracy_metrics = None

    # 8️⃣ Generate future dates
    future_dates = [
        (historical.index[-1] + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(steps)
    ]

    # 9️⃣ Calculate trend and volatility (and other indicators)
    indicators = _calculate_indicators(historical)
    
    # Recalculate volatility correctly for confidence score
    returns = historical.pct_change().dropna()
    volatility = returns.std() * np.sqrt(252) * live_price 
    
    recent_change = ((live_price - historical.iloc[-10]) / historical.iloc[-10]) * 100 if len(historical) > 10 else 0
    
    # 🔟 Determine prediction confidence score
    confidence_score = _calculate_confidence_score(
        forecast_std, 
        volatility, 
        accuracy_metrics
    )

    logger.info(
        "[MODEL_OUTPUT_RAW] symbol=%s model=ARIMA_SARIMA predicted_t1=%.4f predicted_tN=%.4f",
        symbol,
        float(final_fc[0]),
        float(final_fc[-1]),
    )

    return {
        "symbol": symbol,
        "live_price": float(live_price),
        "live_time": live_time,
        "reference_price": float(historical.iloc[-1]),
        "reference_type": "LAST_MARKET_CLOSE",
        "historical": [
            {"date": str(d).split()[0], "price": float(p)}
            for d, p in historical.items()
        ],
        "forecast": [
            {
                "date": future_dates[i],
                "price": float(final_fc[i]),
                "lower_bound": float(lower_bound[i]),
                "upper_bound": float(upper_bound[i]),
                "std_dev": float(forecast_std[i])
            }
            for i in range(steps)
        ],
        "indicators": indicators,
        "predicted_t1": float(final_fc[0]),
        "predicted_t10": float(final_fc[-1]),
        "trend": {
            "direction": "up" if final_fc[-1] > live_price else "down",
            "percentage_change": float(((final_fc[-1] - live_price) / live_price) * 100),
            "recent_10d_change": float(recent_change)
        },
        "volatility": float(volatility),
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "accuracy_metrics": accuracy_metrics,
        "model_info": {
            "arima_order": arima_order,
            "sarima_seasonal_order": sarima_seasonal,
            "ensemble_method": "simple_average"
        }
    }


# ============================================================================
# 🤖 LSTM LONG-TERM PREDICTOR
# ============================================================================

def predict_price_lstm(symbol: str, steps: int = 30, confidence_level: float = 0.95):
    """
    Long-term price prediction using the trained LSTM model.
    - Fetches OHLCV data (5 features) to match the scaler trained on those features.
    - Uses a 60-day lookback window.
    - Returns the same response shape as predict_price() so the frontend is unchanged.
    """
    import os
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

    try:
        from tensorflow.keras.models import load_model  # type: ignore
    except ImportError:
        raise RuntimeError("TensorFlow is not installed. Run: pip install tensorflow")

    import yfinance as yf
    from backend.app.services.alpha_vintage import normalize_symbol_for_yfinance, get_live_price
    from backend.app.services.symbol_resolver import resolve_symbol

    # ── 1. Resolve symbol and fetch OHLCV ────────────────────────────────────
    base_symbol = resolve_symbol(symbol).upper()
    yf_symbol   = normalize_symbol_for_yfinance(base_symbol)

    # Build a list of symbols to try - avoid double-adding exchange suffixes
    symbols_to_try = [yf_symbol]
    # Only add .NS/.BO suffixes if the symbol doesn't already have an exchange suffix
    if not any(yf_symbol.endswith(suffix) for suffix in [".NS", ".BO", ".L", ".AX", ".TO", ".HK", ".SI"]):
        symbols_to_try.extend([base_symbol + ".NS", base_symbol + ".BO"])

    raw_df = None
    for sym in symbols_to_try:
        try:
            t  = yf.Ticker(sym)
            df = t.history(period="2y")
            if not df.empty:
                if df.index.tz is not None:
                    df.index = df.index.tz_localize(None)
                raw_df = df
                break
        except Exception:
            continue

    if raw_df is None or raw_df.empty:
        raise RuntimeError(f"Could not fetch OHLCV data for {symbol}")

    # Keep only the five columns the scaler was trained on
    ohlcv_cols = ["Open", "High", "Low", "Close", "Volume"]
    # Use whichever columns are available (Volume may be missing on some feeds)
    available = [c for c in ohlcv_cols if c in raw_df.columns]
    df = raw_df[available].copy().dropna().tail(200)

    # ── 2. Fetch live price for the response ─────────────────────────────────
    try:
        live_price, live_time = get_live_price(symbol)
    except Exception:
        live_price = float(df["Close"].iloc[-1])
        live_time  = str(df.index[-1])

    # ── 3. Load model + scaler ───────────────────────────────────────────────
    if not os.path.exists(LSTM_MODEL_PATH):
        raise RuntimeError(f"LSTM model not found at {LSTM_MODEL_PATH}")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"Feature scaler not found at {SCALER_PATH}")

    model  = load_model(LSTM_MODEL_PATH, compile=False)
    scaler = joblib.load(SCALER_PATH)

    # ── 4. Scale features ────────────────────────────────────────────────────
    LOOKBACK = 60
    n_expected = getattr(scaler, "n_features_in_", len(available))

    # If scaler expects more features than we have, pad with zeros
    data = df[available].values  # shape (T, n_available)
    if data.shape[1] < n_expected:
        pad = np.zeros((data.shape[0], n_expected - data.shape[1]))
        data = np.hstack([data, pad])
    elif data.shape[1] > n_expected:
        data = data[:, :n_expected]

    scaled_all = scaler.transform(data)  # shape (T, n_expected)

    # Close column index in our OHLCV ordering
    close_idx = available.index("Close") if "Close" in available else 3
    scaled_close = scaled_all[:, close_idx]  # shape (T,)

    # ── 5. Auto-detect LSTM input shape ──────────────────────────────────────
    lstm_input_shape = model.input_shape  # e.g. (None, 60, 1) or (None, 60, 5)
    n_lstm_features  = lstm_input_shape[-1]  # 1 or 5

    # ── 6. Rollout forecast ──────────────────────────────────────────────────
    # Build the seed sequence
    if n_lstm_features == 1:
        # LSTM trained on Close only (1 feature)
        seq_close = list(scaled_close[-LOOKBACK:])
        preds_scaled = []
        for _ in range(steps):
            x = np.array(seq_close[-LOOKBACK:]).reshape(1, LOOKBACK, 1)
            p = float(model.predict(x, verbose=0)[0][0])
            preds_scaled.append(p)
            seq_close.append(p)
        # Inverse-transform: build a dummy full-feature array, set Close col, invert
        dummy = np.zeros((steps, n_expected))
        dummy[:, close_idx] = preds_scaled
        preds_inv = scaler.inverse_transform(dummy)[:, close_idx]

    else:
        # LSTM trained on all n_lstm_features
        seq_all = list(scaled_all[-LOOKBACK:])  # list of 1-D arrays
        preds_scaled = []
        for _ in range(steps):
            x = np.array(seq_all[-LOOKBACK:]).reshape(1, LOOKBACK, n_lstm_features)
            p_row = model.predict(x, verbose=0)[0]  # shape (n_features,) or (1,)
            p_row = np.array(p_row).flatten()
            if len(p_row) == 1:
                # Output is just Close — expand to full row using last known row
                last_row      = np.array(seq_all[-1]).copy()
                last_row[close_idx] = p_row[0]
                p_row = last_row
            preds_scaled.append(p_row[close_idx])
            seq_all.append(p_row)
        dummy = np.zeros((steps, n_expected))
        dummy[:, close_idx] = preds_scaled
        preds_inv = scaler.inverse_transform(dummy)[:, close_idx]

    raw_predicted_t1 = float(preds_inv[0]) if len(preds_inv) else 0.0
    raw_predicted_tn = float(preds_inv[-1]) if len(preds_inv) else 0.0

    logger.info(
        "[MODEL_OUTPUT_RAW] symbol=%s model=LSTM predicted_t1=%.4f predicted_tN=%.4f",
        symbol,
        raw_predicted_t1,
        raw_predicted_tn,
    )

    # ── 7. Live-price anchoring ──────────────────────────────────────────────
    # The LSTM was trained on historical data at a different price level.
    # Raw absolute predictions will therefore drift toward the training mean.
    # Fix: extract the *relative % changes* the LSTM implies and replay them
    # starting from today's live_price. This keeps the learned trend/momentum
    # while anchoring the forecast to the current market price.
    close_series = df["Close"] if "Close" in df else df.iloc[:, close_idx]
    lstm_last_close = float(close_series.iloc[-1])

    # Compute the step-by-step log-return implied by the LSTM
    # seed: last actual close → first LSTM step, then LSTM step-to-step
    lstm_series = np.concatenate([[lstm_last_close], preds_inv])
    step_returns = np.diff(lstm_series) / lstm_series[:-1]   # shape (steps,)

    # Replay from live_price
    anchored = np.empty(steps)
    prev = live_price
    for i, r in enumerate(step_returns):
        prev = prev * (1.0 + r)
        anchored[i] = prev
    preds_inv = anchored

    # ── 8. Confidence intervals ──────────────────────────────────────────────
    # Scale std to current price level (historical cv × live_price)
    hist_cv      = close_series.std() / close_series.mean()   # coefficient of variation
    hist_std     = hist_cv * live_price                        # price-level-aware std
    lower_bound  = preds_inv - 1.96 * hist_std
    upper_bound  = preds_inv + 1.96 * hist_std
    forecast_std = np.full(steps, hist_std)


    # ── 8. Future dates ──────────────────────────────────────────────────────
    last_date    = pd.Timestamp(df.index[-1])
    future_dates = [
        (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(steps)
    ]

    # ── 9. Indicators + scores (use Close series for indicators) ─────────────
    indicators     = _calculate_indicators(close_series)
    returns        = close_series.pct_change().dropna()
    volatility     = returns.std() * np.sqrt(252) * live_price
    recent_change  = (
        ((live_price - float(close_series.iloc[-10])) / float(close_series.iloc[-10])) * 100
        if len(close_series) > 10 else 0
    )
    confidence_score = _calculate_confidence_score(forecast_std, volatility, None)

    return {
        "symbol":     symbol,
        "live_price": float(live_price),
        "live_time":  live_time,
        "historical": [
            {"date": str(d).split()[0], "price": float(p)}
            for d, p in close_series.items()
        ],
        "forecast": [
            {
                "date":        future_dates[i],
                "price":       float(preds_inv[i]),
                "lower_bound": float(lower_bound[i]),
                "upper_bound": float(upper_bound[i]),
                "std_dev":     float(forecast_std[i]),
            }
            for i in range(steps)
        ],
        "indicators":    indicators,
        "predicted_t1":  float(preds_inv[0]),
        "predicted_t10": float(preds_inv[-1]),
        "trend": {
            "direction":         "up" if preds_inv[-1] > live_price else "down",
            "percentage_change": float(((preds_inv[-1] - live_price) / live_price) * 100),
            "recent_10d_change": float(recent_change),
        },
        "volatility":       float(volatility),
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "accuracy_metrics": None,
        "model_info": {
            "model_type":      "LSTM",
            "lookback_window": LOOKBACK,
            "n_features":      n_lstm_features,
            "ensemble_method": "single_model",
        },
    }



# ============================================================================
# 🔀 HORIZON-BASED DISPATCHER
# ============================================================================

def _anchor_forecast_to_live(result: dict) -> dict:
    """
    Post-process any model's forecast so prices are anchored to today's live_price.

    Strategy:
      - Day 1  = live_price  (discard the model's stale level offset)
      - Day 2+ = apply the internal step-to-step % changes the model implies
                 (day1→day2, day2→day3, ...) from the live_price anchor

    This preserves the model's learned trend/momentum while eliminating
    the mean-reversion artifact caused by stale training-time price levels.
    """
    live_price = float(result.get("live_price", 0))
    forecast   = result.get("forecast", [])
    if not forecast or live_price <= 0:
        return result

    raw_prices = [f["price"] for f in forecast]

    # Compute % change from live_price to model's first prediction
    # Then compute INTERNAL step-to-step % changes within the model output
    # (day0→day1, day1→day2, ... within raw_prices)
    
    # Calculate the initial adjustment from live_price to model's day 1
    if len(raw_prices) > 0 and raw_prices[0] != 0:
        # Use model's prediction for day 1, but adjust for any systematic offset
        model_day1 = raw_prices[0]
        # If the model's forecast is far from live price, apply partial adjustment
        # to preserve the model's signal while reducing extreme jumps
        day1_pct = (model_day1 - live_price) / live_price
        # Dampen extreme jumps but preserve the direction
        dampened_pct = day1_pct * 0.7  # Keep 70% of the model's signal
        anchored_prices = [live_price * (1.0 + dampened_pct)]
    else:
        anchored_prices = [live_price]
    
    # Apply internal step-to-step changes for subsequent days
    internal_pcts = []
    for i in range(1, len(raw_prices)):
        prev = raw_prices[i - 1]
        if prev == 0:
            internal_pcts.append(0.0)
        else:
            internal_pcts.append((raw_prices[i] - prev) / prev)
    
    for pct in internal_pcts:
        anchored_prices.append(anchored_prices[-1] * (1.0 + pct))

    # If only 1 step, just use live_price
    if len(anchored_prices) < len(forecast):
        anchored_prices = anchored_prices + [anchored_prices[-1]] * (len(forecast) - len(anchored_prices))

    # Scale confidence bands as a fraction of live price (coefficient of variation)
    raw_std  = float(np.std(raw_prices)) if len(raw_prices) > 1 else 0.0
    raw_mean = float(np.mean(raw_prices)) or 1.0
    band_half = (raw_std / raw_mean) * live_price

    new_forecast = []
    for i, f in enumerate(forecast):
        p = anchored_prices[i]
        new_forecast.append({
            **f,
            "price":       round(p, 4),
            "lower_bound": round(p - 1.96 * band_half, 4),
            "upper_bound": round(p + 1.96 * band_half, 4),
        })

    final_price = anchored_prices[-1]
    result["forecast"]      = new_forecast
    result["predicted_t1"]  = round(anchored_prices[0], 4)   # = live_price
    result["predicted_t10"] = round(final_price, 4)
    result["trend"] = {
        "direction":         "up" if final_price > live_price else "down",
        "percentage_change": round(((final_price - live_price) / live_price) * 100, 4),
        "recent_10d_change": result.get("trend", {}).get("recent_10d_change", 0),
    }
    return result
def is_market_index(symbol: str) -> bool:
    """
    Return True if symbol represents a market index
    """
    index_symbols = {
        "^NSEI",     # NIFTY 50
        "^BSESN",    # SENSEX
        "^GSPC",     # S&P 500
        "^DJI",      # Dow Jones
        "^IXIC",     # NASDAQ
    }
    return symbol.upper() in index_symbols
def predict_price_by_horizon(
    symbol: str,
    steps: int = 10,
    investment_horizon: str = "medium_term",
    confidence_level: float = 0.95,
):
    """
    Route prediction to the right model based on investment_horizon:
      * short_term  (<=10 days)  → ARIMA/SARIMA  (all_forecasts.pkl)
      * medium_term (<=30 days)  → ARIMA/SARIMA  (all_forecasts.pkl)  [default]
      * long_term   (30-90 days) → LSTM          (lstm_model.h5)

    All results are post-processed with live-price anchoring so the forecast
    always starts from today's actual market price, not the training-time mean.
    """
    logger.info(
        "[PREDICT_REQUEST] symbol=%s steps=%s horizon=%s",
        symbol,
        steps,
        investment_horizon,
    )
    
    # ── Market Index Guard ────────────────────────────────────────────────
    if is_market_index(symbol):
        historical = get_historical(symbol)
        live_price, live_time = get_live_price(symbol)

        indicators = _calculate_indicators(historical)

        return {
            "symbol": symbol,
            "live_price": float(live_price),
            "live_time": live_time,
            "historical": [
                {"date": str(d).split()[0], "price": float(p)}
                for d, p in historical.items()
            ],
            "forecast": [],                 # ❌ no future prediction
            "indicators": indicators,       # ✅ charts still work
            "predicted_t1": float(live_price),
            "predicted_t10": float(live_price),
            "trend": {
                "direction": ( "up"
                              if len(historical) > 1 and historical.iloc[-1] > historical.iloc[-2]
                              else "down"),
                "percentage_change": 0.0,
                "recent_10d_change": 0.0,
            },
            "volatility": 0.0,
            "confidence_score": 0.0,
            "confidence_level": confidence_level,
            "accuracy_metrics": None,
            "model_info": {
                "model_type": "INDEX",
                "note": "Market indices do not support price prediction",
            },
        }
    if investment_horizon == "long_term":
        lstm_steps = max(steps, 30)
        try:
            result = predict_price_lstm(symbol, steps=lstm_steps, confidence_level=confidence_level)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[WARN] LSTM failed ({e!r}), falling back to ARIMA/SARIMA")
            result = predict_price(symbol, steps=steps, confidence_level=confidence_level)
    else:
        result = predict_price(symbol, steps=steps, confidence_level=confidence_level)

    logger.info(
        "[MODEL_OUTPUT_RAW] symbol=%s predicted_t1=%.4f predicted_tN=%.4f",
        symbol,
        float(result.get("predicted_t1", 0.0)),
        float(result.get("predicted_t10", 0.0)),
    )

    # ── Universal live-price anchoring ────────────────────────────────────────
    # Anchors forecast to today's live price regardless of the model used.
    if result.get("model_info", {}).get("model_type") == "LSTM":
        result = _anchor_forecast_to_live(result)
    logger.info(
        "[MODEL_OUTPUT_FINAL] symbol=%s predicted_t1=%.4f predicted_tN=%.4f",
        symbol,
        float(result.get("predicted_t1", 0.0)),
        float(result.get("predicted_t10", 0.0)),
    )

    return result



def _calculate_indicators(historical_series):
    """
    Calculate technical indicators for charts
    """
    try:
        df = pd.DataFrame(historical_series)
        df.columns = ["Close"]
        
        # SMA 20
        df["SMA_20"] = df["Close"].rolling(window=20).mean()
        
        # EMA 20
        df["EMA_20"] = df["Close"].ewm(span=20, adjust=False).mean()
        
        # Bollinger Bands (20, 2)
        df["BB_Middle"] = df["Close"].rolling(window=20).mean()
        df["BB_Std"] = df["Close"].rolling(window=20).std()
        df["BB_Upper"] = df["BB_Middle"] + (2 * df["BB_Std"])
        df["BB_Lower"] = df["BB_Middle"] - (2 * df["BB_Std"])
        
        # RSI 14
        delta = df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df["RSI"] = 100 - (100 / (1 + rs))
        
        # MACD (12, 26, 9)
        exp1 = df["Close"].ewm(span=12, adjust=False).mean()
        exp2 = df["Close"].ewm(span=26, adjust=False).mean()
        df["MACD"] = exp1 - exp2
        df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
        df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]
        
        # Fill NaN
        df = df.fillna(0)
        
        # Convert to list of dicts/arrays
        dates = [str(d).split()[0] for d in df.index]
        
        return {
            "dates": dates,
            "sma_20": df["SMA_20"].tolist(),
            "ema_20": df["EMA_20"].tolist(),
            "rsi": df["RSI"].tolist(),
            "macd": df["MACD"].tolist(),
            "macd_signal": df["MACD_Signal"].tolist(),
            "macd_hist": df["MACD_Hist"].tolist(),
            "bb_upper": df["BB_Upper"].tolist(),
            "bb_lower": df["BB_Lower"].tolist()
        }
    except Exception as e:
        print(f"Error calculating indicators: {e}")
        return {}


def _calculate_confidence_score(forecast_std, volatility, accuracy_metrics):
    """
    Calculate a confidence score (0-100) based on prediction uncertainty.

    Args:
        forecast_std (array-like): Standard deviation of forecasts.
        volatility (float): Historical market volatility.
        accuracy_metrics (dict or None): Dictionary containing model accuracy metrics.

    Returns:
        float: Confidence score between 0 and 100.
    """

    # Start with maximum confidence
    score = 100.0

    try:
        # ------------------------------------------------------------------
        # 1️⃣ Forecast uncertainty penalty
        # ------------------------------------------------------------------
        if forecast_std is not None and len(forecast_std) > 0:
            avg_std = float(np.mean(forecast_std))

            # Larger forecast std means lower confidence
            std_penalty = min(avg_std * 5, 25)
            score -= std_penalty

        # ------------------------------------------------------------------
        # 2️⃣ Market volatility penalty
        # ------------------------------------------------------------------
        if volatility is not None and volatility > 0:
            vol_penalty = min(volatility * 0.5, 20)
            score -= vol_penalty

        # ------------------------------------------------------------------
        # 3️⃣ Model accuracy penalty (MAPE based)
        # ------------------------------------------------------------------
        if accuracy_metrics:
            mape = accuracy_metrics.get("mape", None)

            if mape is not None:
                if mape > 20:
                    score -= 25
                elif mape > 10:
                    score -= 15
                elif mape > 5:
                    score -= 8

        # ------------------------------------------------------------------
        # Clamp the score between 0 and 100
        # ------------------------------------------------------------------
        score = max(0.0, min(100.0, score))

    except Exception:
        # Fallback confidence if calculation fails
        score = 50.0

    return float(score)

# ============================================================================
# 🤖 AI INVESTMENT ANALYZER - NEW FEATURE
# ============================================================================

def analyze_investment(
    symbol: str,
    investment_horizon: str = "short_term",
    prediction_data: dict | None = None,
):
    """
    AI-powered investment analysis and recommendation
    
    Args:
        symbol: Stock ticker symbol
        investment_horizon: 'short_term' (days-weeks), 'medium_term' (months), 'long_term' (years)
    
    Returns:
        Comprehensive investment recommendation with scoring and reasoning
    """
    # Get prediction data (use provided data to avoid mismatches)
    if prediction_data is None:
        prediction_data = predict_price_by_horizon(
            symbol,
            steps=10,
            investment_horizon=investment_horizon,
        )
    
    # Extract key metrics
    live_price = prediction_data["live_price"]
    predicted_t1 = prediction_data["predicted_t1"]
    predicted_t10 = prediction_data["predicted_t10"]
    trend = prediction_data["trend"]
    volatility = prediction_data["volatility"]
    confidence_score = prediction_data["confidence_score"]
    indicators = prediction_data["indicators"]
    
    # Calculate additional metrics
    historical_data = pd.Series([h["price"] for h in prediction_data["historical"]])
    
    # Perform multi-factor analysis
    technical_score = _analyze_technical_factors(indicators, live_price, historical_data)
    trend_score = _analyze_trend_strength(trend, predicted_t1, predicted_t10, live_price)
    risk_score = _analyze_risk_factors(volatility, confidence_score, historical_data)
    momentum_score = _analyze_momentum(historical_data, indicators)
    
    # Calculate overall investment score (0-100)
    overall_score = (
        technical_score * 0.30 +
        trend_score * 0.30 +
        risk_score * 0.25 +
        momentum_score * 0.15
    )
    
    if investment_horizon == "short_term":
       price_delta = (predicted_t1 - live_price) / live_price
    else:
       price_delta = (predicted_t10 - live_price) / live_price
    # Generate recommendation (direction anchored to price delta)
    recommendation = _generate_recommendation(
        price_delta,
        overall_score,
        investment_horizon,
        risk_score,
        trend_score,
        confidence_score,
    )
    
    # Generate detailed reasoning
    reasoning = _generate_reasoning(
        symbol,
        overall_score,
        technical_score,
        trend_score,
        risk_score,
        momentum_score,
        prediction_data
    )
    
    # Calculate risk-reward ratio
    expected_return = ((predicted_t10 - live_price) / live_price) * 100
    risk_reward_ratio = abs(expected_return / volatility) if volatility > 0 else 0
    
    # Determine entry and exit points
    # Choose horizon-aligned predicted price
    predicted_price = predicted_t1 if investment_horizon == "short_term" else predicted_t10

    entry_exit = _calculate_entry_exit_points(
    live_price=live_price,
    predicted_price=predicted_price,
    action=recommendation["action"],
    indicators=indicators,
    trend=trend,
    investment_horizon=investment_horizon
)
    
    return {
        "symbol": symbol,
        "recommendation": recommendation,
        "overall_score": round(overall_score, 2),
        "investment_horizon": investment_horizon,
        "scores": {
            "technical": round(technical_score, 2),
            "trend": round(trend_score, 2),
            "risk": round(risk_score, 2),
            "momentum": round(momentum_score, 2)
        },
        "risk_assessment": {
            "level": _get_risk_level(risk_score),
            "volatility": round(volatility, 2),
            "confidence": round(confidence_score, 2)
        },
        "expected_performance": {
            "short_term_return": round(((predicted_t1 - live_price) / live_price) * 100, 2),
            "medium_term_return": round(expected_return, 2),
            "risk_reward_ratio": round(risk_reward_ratio, 2)
        },
        "entry_exit_strategy": entry_exit,
        "reasoning": reasoning,
        "key_insights": _generate_key_insights(
            prediction_data,
            technical_score,
            trend_score,
            risk_score
        ),
        "warnings": _generate_warnings(risk_score, volatility, confidence_score, trend)
    }


def _analyze_technical_factors(indicators, live_price, historical_data):
    """
    Analyze technical indicators and return a score (0-100)
    """
    score = 50.0  # Neutral starting point
    
    if not indicators or len(indicators.get("rsi", [])) == 0:
        return score
    
    try:
        # Get latest values
        rsi = indicators["rsi"][-1] if indicators["rsi"][-1] != 0 else 50
        macd = indicators["macd"][-1]
        macd_signal = indicators["macd_signal"][-1]
        sma_20 = indicators["sma_20"][-1]
        ema_20 = indicators["ema_20"][-1]
        bb_upper = indicators["bb_upper"][-1]
        bb_lower = indicators["bb_lower"][-1]
        
        # RSI Analysis (30-70 range)
        if 30 < rsi < 70:
            score += 10  # Healthy range
        elif rsi < 30:
            score += 15  # Oversold - potential buy
        elif rsi > 70:
            score -= 15  # Overbought - potential sell
        
        # MACD Analysis
        if macd > macd_signal:
            score += 10  # Bullish crossover
        else:
            score -= 10  # Bearish crossover
        
        # Moving Average Analysis
        if live_price > sma_20 and live_price > ema_20:
            score += 15  # Price above moving averages
        elif live_price < sma_20 and live_price < ema_20:
            score -= 15  # Price below moving averages
        
        # Bollinger Bands Analysis
        bb_position = (live_price - bb_lower) / (bb_upper - bb_lower) if (bb_upper - bb_lower) != 0 else 0.5
        if bb_position < 0.2:
            score += 10  # Near lower band - oversold
        elif bb_position > 0.8:
            score -= 10  # Near upper band - overbought
        
    except Exception as e:
        print(f"Error in technical analysis: {e}")
    
    return max(0.0, min(100.0, score))


def _analyze_trend_strength(trend, predicted_t1, predicted_t10, live_price):
    """
    Analyze trend strength and direction (0-100)
    """
    score = 50.0
    
    # Predicted change percentage
    short_term_change = ((predicted_t1 - live_price) / live_price) * 100
    medium_term_change = ((predicted_t10 - live_price) / live_price) * 100
    
    # Positive trend scoring
    if trend["direction"] == "up":
        if medium_term_change > 5:
            score += 30  # Strong uptrend
        elif medium_term_change > 2:
            score += 20  # Moderate uptrend
        elif medium_term_change > 0:
            score += 10  # Weak uptrend
    else:
        if medium_term_change < -5:
            score -= 30  # Strong downtrend
        elif medium_term_change < -2:
            score -= 20  # Moderate downtrend
        elif medium_term_change < 0:
            score -= 10  # Weak downtrend
    
    # Consistency bonus (if short and medium term align)
    if (short_term_change > 0 and medium_term_change > 0) or \
       (short_term_change < 0 and medium_term_change < 0):
        score += 10
    
    return max(0.0, min(100.0, score))


def _analyze_risk_factors(volatility, confidence_score, historical_data):
    """
    Analyze risk factors - higher score means lower risk (0-100)
    """
    score = 100.0
    
    # Volatility penalty (normalized)
    avg_price = historical_data.mean()
    volatility_ratio = (volatility / avg_price) * 100 if avg_price > 0 else 0
    
    if volatility_ratio > 5:
        score -= 40  # Very high volatility
    elif volatility_ratio > 3:
        score -= 25  # High volatility
    elif volatility_ratio > 1.5:
        score -= 10  # Moderate volatility
    
    # Confidence penalty
    if confidence_score < 40:
        score -= 30  # Low confidence
    elif confidence_score < 60:
        score -= 15  # Moderate confidence
    
    # Historical stability bonus
    returns = historical_data.pct_change().dropna()
    if len(returns) > 0:
        stability = 1 / (returns.std() + 0.01)  # Inverse of std dev
        stability_bonus = min(stability * 5, 20)
        score += stability_bonus
    
    return max(0.0, min(100.0, score))


def _analyze_momentum(historical_data, indicators):
    """
    Analyze price momentum (0-100)
    """
    score = 50.0
    
    if len(historical_data) < 20:
        return score
    
    try:
        # Recent performance
        recent_5d = historical_data.tail(5)
        recent_10d = historical_data.tail(10)
        recent_20d = historical_data.tail(20)
        
        change_5d = ((recent_5d.iloc[-1] - recent_5d.iloc[0]) / recent_5d.iloc[0]) * 100
        change_10d = ((recent_10d.iloc[-1] - recent_10d.iloc[0]) / recent_10d.iloc[0]) * 100
        change_20d = ((recent_20d.iloc[-1] - recent_20d.iloc[0]) / recent_20d.iloc[0]) * 100
        
        # Momentum scoring
        if change_5d > 2 and change_10d > 2:
            score += 25  # Strong positive momentum
        elif change_5d > 0 and change_10d > 0:
            score += 15  # Positive momentum
        elif change_5d < -2 and change_10d < -2:
            score -= 25  # Strong negative momentum
        elif change_5d < 0 and change_10d < 0:
            score -= 15  # Negative momentum
        
        # Acceleration bonus
        if change_5d > change_10d > change_20d and change_5d > 0:
            score += 15  # Accelerating upward
        elif change_5d < change_10d < change_20d and change_5d < 0:
            score -= 15  # Accelerating downward
        
    except Exception as e:
        print(f"Error in momentum analysis: {e}")
    
    return max(0.0, min(100.0, score))


def _generate_recommendation(
    price_delta,
    overall_score,
    investment_horizon,
    risk_score,
    trend_score,
    confidence_score,
):
    """
    Generate investment recommendation based on overall score
    """
    threshold = 0.005
    if price_delta > threshold:
        base_action = "BUY"
    elif price_delta < -threshold:
        base_action = "SELL"
    else:
        base_action = "HOLD"

    if base_action == "BUY":
        action = "STRONG BUY" if overall_score >= 75 and confidence_score >= 60 and risk_score >= 55 else "BUY"
        description = "Model projects upside from current price"
    elif base_action == "SELL":
        action = "STRONG SELL" if overall_score <= 35 or confidence_score <= 40 or risk_score <= 35 else "SELL"
        description = "Model projects downside from current price"
    else:
        action = "HOLD"
        description = "Model projects limited short-term movement"
    
    # Adjust for investment horizon
    horizon_note = ""
    if investment_horizon == "long_term":
        if risk_score > 60:
            horizon_note = " Suitable for long-term buy-and-hold strategy."
        else:
            horizon_note = " High volatility may impact long-term returns."
    elif investment_horizon == "short_term":
        if trend_score > 60:
            horizon_note = " Short-term momentum is favorable."
        else:
            horizon_note = " Limited short-term upside potential."
    
    return {
        "action": action,
        "description": description + horizon_note,
        "confidence": "high" if overall_score > 70 or overall_score < 30 else "medium"
    }


def _generate_reasoning(symbol, overall_score, technical_score, trend_score, 
                       risk_score, momentum_score, prediction_data):
    """
    Generate human-readable reasoning for the recommendation
    """
    reasoning = []
    
    # Overall assessment
    if overall_score >= 70:
        reasoning.append(f"📈 {symbol} shows strong overall investment potential with a score of {overall_score:.1f}/100.")
    elif overall_score >= 50:
        reasoning.append(f"📊 {symbol} presents moderate investment opportunity with a score of {overall_score:.1f}/100.")
    else:
        reasoning.append(f"📉 {symbol} shows weak investment signals with a score of {overall_score:.1f}/100.")
    
    # Technical analysis
    if technical_score >= 70:
        reasoning.append(f"OK: Technical indicators are strongly bullish (score: {technical_score:.1f}).")
    elif technical_score >= 50:
        reasoning.append(f"➡️ Technical indicators show neutral to positive signals (score: {technical_score:.1f}).")
    else:
        reasoning.append(f"WARNING: Technical indicators suggest caution (score: {technical_score:.1f}).")
    
    # Trend analysis
    trend = prediction_data["trend"]
    if trend["direction"] == "up":
        reasoning.append(f"📊 Price trend is {trend['direction']} with projected {abs(trend['percentage_change']):.2f}% gain over 10 days.")
    else:
        reasoning.append(f"📉 Price trend is {trend['direction']} with projected {abs(trend['percentage_change']):.2f}% decline over 10 days.")
    
    # Risk assessment
    if risk_score >= 70:
        reasoning.append(f"🛡️ Low risk profile makes this suitable for conservative investors (risk score: {risk_score:.1f}).")
    elif risk_score >= 50:
        reasoning.append(f"⚖️ Moderate risk level - suitable for balanced portfolios (risk score: {risk_score:.1f}).")
    else:
        reasoning.append(f"WARNING: High risk level - only for aggressive investors (risk score: {risk_score:.1f}).")
    
    # Momentum
    if momentum_score >= 65:
        reasoning.append(f"🚀 Strong positive momentum detected (score: {momentum_score:.1f}).")
    elif momentum_score <= 35:
        reasoning.append(f"🔻 Negative momentum suggests downward pressure (score: {momentum_score:.1f}).")
    
    return reasoning


def _get_risk_level(risk_score):
    """
    Convert risk score to risk level
    """
    if risk_score >= 70:
        return "LOW"
    elif risk_score >= 50:
        return "MEDIUM"
    elif risk_score >= 30:
        return "HIGH"
    else:
        return "VERY HIGH"


def _calculate_entry_exit_points(live_price, predicted_price, action, indicators, trend, investment_horizon):

    """
    Calculate optimal entry and exit points
    """
    try:
        bb_lower = indicators["bb_lower"][-1] if indicators.get("bb_lower") else live_price * 0.98
        bb_upper = indicators["bb_upper"][-1] if indicators.get("bb_upper") else live_price * 1.02
        sma_20 = indicators["sma_20"][-1] if indicators.get("sma_20") else live_price
        
        # Entry points
        if trend["direction"] == "up":
            entry_optimal = round(min(live_price * 0.99, sma_20 * 0.995), 2)
            entry_acceptable = round(live_price, 2)
        else:
            entry_optimal = round(bb_lower * 1.005, 2)
            entry_acceptable = round(live_price * 0.97, 2)
        
        
        # Exit points (ACTION-AWARE)
        if action in ["BUY", "STRONG BUY"]:
         target = round(predicted_price, 2)
         stop_loss = round(live_price * (0.97 if investment_horizon == "short_term" else 0.94), 2)

        elif action in ["SELL", "STRONG SELL"]:
          target = round(predicted_price, 2)
          stop_loss = round(live_price * (1.03 if investment_horizon == "short_term" else 1.06), 2)

        else:  # HOLD
            target = round(predicted_price, 2)
            # Provide stop loss even for HOLD to protect against downside
            stop_loss = round(live_price * (0.96 if investment_horizon == "short_term" else 0.93), 2)
        
        return {
            "entry_points": {
                "optimal": entry_optimal,
                "acceptable": entry_acceptable
            },
            "exit_points": {
                "target": target,
                "stop_loss": stop_loss
            }
        }
    except Exception as e:
        print(f"Error calculating entry/exit points: {e}")
        return {
            "entry_points": {"optimal": live_price * 0.99, "acceptable": live_price},
            "exit_points": {"target": live_price * 1.05, "stop_loss": live_price * 0.95}
        }


def _generate_key_insights(prediction_data, technical_score, trend_score, risk_score):
    """
    Generate key insights for quick decision making
    """
    insights = []
    
    live_price = prediction_data["live_price"]
    indicators = prediction_data["indicators"]
    
    # RSI insight
    if indicators and indicators.get("rsi"):
        rsi = indicators["rsi"][-1]
        if rsi < 30:
            insights.append("🔵 RSI indicates oversold conditions - potential buying opportunity")
        elif rsi > 70:
            insights.append("🔴 RSI indicates overbought conditions - consider taking profits")
    
    # Moving average insight
    if indicators and indicators.get("sma_20"):
        sma = indicators["sma_20"][-1]
        if live_price > sma * 1.05:
            insights.append("📈 Price is significantly above 20-day SMA - strong bullish signal")
        elif live_price < sma * 0.95:
            insights.append("📉 Price is significantly below 20-day SMA - weak momentum")
    
    # Volatility insight
    volatility = prediction_data["volatility"]
    if volatility > 3:
        insights.append("⚡ High volatility detected - expect significant price swings")
    elif volatility < 1:
        insights.append("😴 Low volatility - stable but limited upside potential")
    
    # Confidence insight
    if prediction_data["confidence_score"] > 70:
        insights.append("OK: High prediction confidence - reliable forecast")
    elif prediction_data["confidence_score"] < 40:
        insights.append("WARNING: Low prediction confidence - proceed with caution")
    
    return insights


def _generate_warnings(risk_score, volatility, confidence_score, trend):
    """
    Generate warnings for risk management
    """
    warnings = []
    
    if risk_score < 40:
        warnings.append("WARNING: HIGH RISK: This stock exhibits significant risk factors")
    
    if volatility > 5:
        warnings.append("⚡ EXTREME VOLATILITY: Price swings may be severe")
    
    if confidence_score < 50:
        warnings.append("❓ LOW CONFIDENCE: Predictions may be unreliable")
    
    if abs(trend["recent_10d_change"]) > 15:
        warnings.append("📊 RAPID MOVEMENT: Stock has moved >15% in past 10 days")
    
    if not warnings:
        warnings.append("OK: No major warnings detected")
    
    return warnings


# ============================================================================
# ENHANCED API FUNCTIONS
# ============================================================================

def get_prediction_with_analysis(symbol: str, investment_horizon: str = "medium_term"):
    """
    Get complete prediction with AI investment analysis
    
    Args:
        symbol: Stock ticker symbol
        investment_horizon: Investment time horizon
    
    Returns:
        Combined prediction and investment analysis
    """
    prediction = predict_price_by_horizon(
        symbol,
        steps=10,
        investment_horizon=investment_horizon,
    )
    if is_market_index(symbol):
        return {
        "symbol": symbol,
        "recommendation": {
            "action": "HOLD",
            "description": "Market indices reflect overall market sentiment and are not directly tradable.",
            "confidence": "high",
        },
        "overall_score": 50.0,
        "investment_horizon": investment_horizon,
        "scores": {
            "technical": 50,
            "trend": 50,
            "risk": 50,
            "momentum": 50,
        },
        "risk_assessment": {
            "level": "MEDIUM",
            "volatility": 0.0,
            "confidence": 100.0,
        },
        "expected_performance": {
            "short_term_return": 0.0,
            "medium_term_return": 0.0,
            "risk_reward_ratio": 0.0,
        },
        "entry_exit_strategy": None,
        "reasoning": [
            "Market indices represent aggregated market performance.",
            "They are used for sentiment and trend analysis, not BUY/SELL decisions.",
        ],
        "key_insights": [],
        "warnings": [],
    }
    analysis = analyze_investment(
        symbol,
        investment_horizon=investment_horizon,
        prediction_data=prediction,
    )
    
    return {
        "prediction": prediction,
        "investment_analysis": analysis
    }


def get_prediction_summary(symbol: str):
    """
    Get a quick summary prediction for dashboard display
    
    Args:
        symbol: Stock ticker symbol
    
    Returns:
        Simplified prediction summary
    """
    full_prediction = predict_price(symbol, steps=5)
    
    return {
        "symbol": symbol,
        "current_price": full_prediction["live_price"],
        "next_day_prediction": full_prediction["predicted_t1"],
        "week_prediction": full_prediction["predicted_t10"],
        "trend": full_prediction["trend"]["direction"],
        "confidence": full_prediction["confidence_score"]
    }


def compare_models(symbol: str, steps: int = 10):
    """
    Compare individual model performances
    
    Args:
        symbol: Stock ticker symbol
        steps: Number of days to forecast
    
    Returns:
        Dictionary with individual model predictions
    """
    historical = get_historical(symbol)
    live_price, live_time = get_live_price(symbol)
    
    historical.loc[pd.Timestamp.now()] = live_price
    historical = historical.tail(120)
    
    try:
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        
        arima_order = bundle.get("order", (5, 1, 0))
        sarima_seasonal = bundle.get("seasonal_order", (1, 1, 1, 5))
    except (FileNotFoundError, EOFError, pickle.UnpicklingError, Exception):
        arima_order = (5, 1, 0)
        sarima_seasonal = (1, 1, 1, 5)
    
    # Fit both models
    arima = ARIMA(historical, order=arima_order).fit()
    sarima = SARIMAX(historical, order=arima_order, seasonal_order=sarima_seasonal).fit(disp=False)
    
    # Generate forecasts
    arima_fc = arima.forecast(steps)
    sarima_fc = sarima.forecast(steps)
    
    return {
        "symbol": symbol,
        "live_price": float(live_price),
        "arima_prediction": {
            "t1": float(arima_fc.iloc[0]),
            "t10": float(arima_fc.iloc[-1]),
            "aic": float(arima.aic),
            "bic": float(arima.bic)
        },
        "sarima_prediction": {
            "t1": float(sarima_fc.iloc[0]),
            "t10": float(sarima_fc.iloc[-1]),
            "aic": float(sarima.aic),
            "bic": float(sarima.bic)
        }
    }


def batch_analyze_stocks(symbols: list, investment_horizon: str = "medium_term"):
    """
    Analyze multiple stocks at once for portfolio optimization
    
    Args:
        symbols: List of stock ticker symbols
        investment_horizon: Investment time horizon
    
    Returns:
        List of analyses sorted by investment score
    """
    results = []
    
    for symbol in symbols:
        try:
            analysis = analyze_investment(symbol, investment_horizon)
            results.append(analysis)
        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            continue
    
    # Sort by overall score (descending)
    results.sort(key=lambda x: x["overall_score"], reverse=True)
    
    return {
        "analyzed_stocks": len(results),
        "investment_horizon": investment_horizon,
        "top_picks": results[:3] if len(results) >= 3 else results,
        "all_results": results
    }