from typing import Any, Dict, List

import numpy as np
import pandas as pd

from backend.app.services.alpha_vintage import get_historical


def _build_features_from_series(series: pd.Series) -> Dict[str, float]:
    close = series.dropna().astype(float)
    if len(close) < 20:
        raise ValueError("Not enough historical data to build features")

    returns = close.pct_change()

    features = {
        "close": float(close.iloc[-1]),
        "return_1d": float(returns.iloc[-1]) if len(returns) > 1 else 0.0,
        "return_5d": float((close.iloc[-1] - close.iloc[-6]) / close.iloc[-6]) if len(close) > 6 else 0.0,
        "sma_5": float(close.tail(5).mean()),
        "sma_10": float(close.tail(10).mean()),
        "sma_20": float(close.tail(20).mean()),
        "volatility_10": float(returns.tail(10).std() or 0.0),
        "volatility_20": float(returns.tail(20).std() or 0.0),
    }

    return features


def _features_to_frame(features: Dict[str, Any]) -> pd.DataFrame:
    return pd.DataFrame([features])


def _predict_lightgbm(days: int, input_data: Dict[str, Any], model) -> List[float]:
    symbol = input_data.get("symbol") if isinstance(input_data, dict) else None

    if symbol:
        history = get_historical(symbol)
        history = history.dropna().astype(float)
        if len(history) < 20:
            raise ValueError("Not enough historical data to forecast")

        closes = list(history.tail(60).values)
        predictions: List[float] = []

        for _ in range(days):
            series = pd.Series(closes)
            features = _build_features_from_series(series)
            df = _features_to_frame(features)
            pred = float(model.predict(df)[0])
            predictions.append(pred)
            closes.append(pred)

        return predictions

    features = input_data.get("features") if isinstance(input_data, dict) else None
    if isinstance(features, dict):
        df = _features_to_frame(features)
    elif isinstance(features, list):
        df = pd.DataFrame(features)
    else:
        raise ValueError("LightGBM requires input_data.features or input_data.symbol")

    preds = model.predict(df)
    preds = np.array(preds, dtype=float).flatten().tolist()

    if len(preds) >= days:
        return preds[:days]
    if len(preds) == 1:
        return [preds[0] for _ in range(days)]

    last = preds[-1] if preds else 0.0
    return preds + [last for _ in range(days - len(preds))]


def _forecast_from_arima(days: int, model) -> List[float]:
    if hasattr(model, "forecast"):
        forecast = model.forecast(steps=days)
    elif hasattr(model, "get_forecast"):
        forecast = model.get_forecast(steps=days).predicted_mean
    else:
        raise ValueError("ARIMA/SARIMA model does not support forecast")

    if hasattr(forecast, "tolist"):
        return [float(x) for x in forecast.tolist()]

    return [float(x) for x in list(forecast)]


def _prepare_lstm_sequence(input_data: Dict[str, Any]) -> np.ndarray:
    sequence = input_data.get("sequence") if isinstance(input_data, dict) else None
    symbol = input_data.get("symbol") if isinstance(input_data, dict) else None

    if sequence is None and symbol:
        history = get_historical(symbol)
        history = history.dropna().astype(float)
        sequence = history.tail(60).values.tolist()

    if sequence is None:
        raise ValueError("LSTM requires input_data.sequence or input_data.symbol")

    seq_array = np.array(sequence, dtype=float)
    if seq_array.ndim == 1:
        seq_array = seq_array.reshape(-1, 1)

    return seq_array


def _inverse_scale(values: np.ndarray, scaler) -> np.ndarray:
    if values.ndim == 1:
        values = values.reshape(-1, 1)

    n_features = getattr(scaler, "n_features_in_", values.shape[1])

    if n_features == values.shape[1]:
        return scaler.inverse_transform(values)

    padded = np.zeros((values.shape[0], n_features))
    padded[:, 0] = values[:, 0]
    return scaler.inverse_transform(padded)[:, :1]


def _predict_lstm(days: int, input_data: Dict[str, Any], model, scaler) -> List[float]:
    sequence = _prepare_lstm_sequence(input_data)
    scaled_sequence = scaler.transform(sequence)

    n_features = scaled_sequence.shape[1]
    window = scaled_sequence.copy()
    seq_len = scaled_sequence.shape[0]

    predictions_scaled: List[float] = []

    for _ in range(days):
        x_in = window[-seq_len:].reshape(1, seq_len, n_features)
        yhat = model.predict(x_in, verbose=0)
        yhat = np.array(yhat)

        if yhat.ndim > 2:
            yhat = yhat.reshape(yhat.shape[0], -1)

        yhat_flat = yhat.flatten()
        next_step = np.zeros(n_features)
        next_step[0] = float(yhat_flat[0])

        if yhat_flat.size == n_features:
            next_step = yhat_flat.astype(float)

        predictions_scaled.append(float(next_step[0]))
        window = np.vstack([window, next_step])

    inversed = _inverse_scale(np.array(predictions_scaled), scaler).flatten()
    return [float(x) for x in inversed.tolist()]


def predict_future(days: int, input_data: Dict[str, Any]) -> Dict[str, Any]:
    if days < 1 or days > 180:
        raise ValueError("Days must be between 1 and 180")
    if not input_data or not isinstance(input_data, dict):
        raise ValueError("input_data is required")

    from backend.app.services.ml.hybrid.model_loader import get_models
    models = get_models()

    if days <= 7:
        model_used = "LightGBM"
        if models.get("lightgbm") is None:
            raise RuntimeError("LightGBM model is not available")
        predictions = _predict_lightgbm(days, input_data, models["lightgbm"])
    elif days <= 30:
        model_used = "ARIMA/SARIMA"
        predictions = _forecast_from_arima(days, models["arima"])
    else:
        model_used = "LSTM"
        predictions = _predict_lstm(days, input_data, models["lstm"], models["scaler"])

    return {
        "model_used": model_used,
        "duration_days": days,
        "predictions": predictions,
        "status": "success",
    }
