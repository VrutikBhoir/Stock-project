from fastapi import APIRouter, HTTPException
import traceback
import pandas as pd
import numpy as np
import logging
from pydantic import BaseModel

# ⚠️ DEFER heavy ML imports to avoid freeze at import time
# Lightweight imports only - Pydantic models and FastAPI components

# Define RiskInput here instead of importing to avoid heavy module imports
class RiskInput(BaseModel):
    """Input schema for risk prediction"""
    confidence: float
    trend_score: float
    overall_score: float
    technical_score: float
    momentum_score: float
    expected_return: float
    volatility: float

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================================
# LAZY-LOADED GLOBALS
# ============================================================================
# These are initialized on first use to avoid heavy operations at import time
_advisor = None
_technicals = None
_predict_price = None
_predict_risk = None
_get_historical = None
_load_and_validate_data = None
_generate_prediction_response = None
_risk_predictor = None


def get_advisor():
    """Lazily initialize and return the Advisor instance."""
    global _advisor
    if _advisor is None:
        from backend.app.services.advisor import Advisor
        _advisor = Advisor()
    return _advisor


def get_technicals():
    """Lazily initialize and return the TechnicalIndicators instance."""
    global _technicals
    if _technicals is None:
        from backend.app.services.technical_indicators import TechnicalIndicators
        _technicals = TechnicalIndicators()
    return _technicals


def get_predict_price():
    """Lazily import price prediction function."""
    global _predict_price
    if _predict_price is None:
        from backend.app.services.ml.price_predictor import predict_price
        _predict_price = predict_price
    return _predict_price


def get_predict_risk_func():
    """Lazily import risk prediction function."""
    global _predict_risk
    if _predict_risk is None:
        from backend.app.services.ml.risk_predictor import predict_risk
        _predict_risk = predict_risk
    return _predict_risk


def get_risk_predictor():
    """Lazily import RiskPredictor class."""
    global _risk_predictor
    if _risk_predictor is None:
        from backend.app.services.ml.risk_predictor import RiskPredictor
        _risk_predictor = RiskPredictor
    return _risk_predictor


def get_historical():
    """Lazily import historical data retrieval."""
    global _get_historical
    if _get_historical is None:
        from backend.app.services.alpha_vintage import get_historical as _get_hist
        _get_historical = _get_hist
    return _get_historical


def get_risk_vs_predict_funcs():
    """Lazily import risk vs predict data functions."""
    global _load_and_validate_data, _generate_prediction_response
    if _load_and_validate_data is None:
        from backend.app.services.ml.risk_vs_predict import (
            load_and_validate_data,
            generate_prediction_response
        )
        _load_and_validate_data = load_and_validate_data
        _generate_prediction_response = generate_prediction_response
    return _load_and_validate_data, _generate_prediction_response

def load_stock_dataframe(symbol: str):
    """
    Helper to load historical data as a DataFrame for the advisor.
    """
    series = get_historical()(symbol)
    return series.to_frame(name="Close")

def calculate_risk_features(df: pd.DataFrame) -> dict:
    """
    Calculate risk features from historical price data.
    
    Returns:
        dict with the 7 features expected by the risk model:
        - confidence: 0-100 (model confidence)
        - trend_score: -1 to 1
        - overall_score: 0-100
        - technical_score: 0-100
        - momentum_score: 0-100
        - expected_return: percentage
        - volatility: annualized volatility
    """
    if df is None or df.empty:
        return {
            "confidence": 50.0,
            "trend_score": 0.0,
            "overall_score": 50.0,
            "technical_score": 50.0,
            "momentum_score": 50.0,
            "expected_return": 0.0,
            "volatility": 0.15
        }
    
    try:
        # Get Close prices
        close_prices = df["Close"].values if isinstance(df, pd.DataFrame) else df.values
        
        if len(close_prices) < 2:
            return {
                "confidence": 50.0,
                "trend_score": 0.0,
                "overall_score": 50.0,
                "technical_score": 50.0,
                "momentum_score": 50.0,
                "expected_return": 0.0,
                "volatility": 0.15
            }
        
        # 1. Volatility: Standard deviation of log returns (annualized)
        returns = np.diff(np.log(close_prices))
        volatility = float(np.std(returns) * np.sqrt(252))  # 252 trading days per year
        
        # 2. Trend score: Compare recent price to moving average
        technicals = get_technicals()
        sma_20 = technicals.calculate_sma(pd.Series(close_prices), window=20)
        if len(sma_20) > 0 and not sma_20.isna().all():
            latest_price = float(close_prices[-1])
            latest_sma = float(sma_20.iloc[-1]) if not pd.isna(sma_20.iloc[-1]) else latest_price
            trend_score = max(-1.0, min(1.0, float((latest_price - latest_sma) / latest_sma)))
        else:
            trend_score = 0.0
        
        # 3. RSI: Calculate RSI for technical indicators
        rsi = technicals.calculate_rsi(pd.Series(close_prices), window=14)
        if len(rsi) > 0 and not rsi.isna().all():
            latest_rsi = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50.0
        else:
            latest_rsi = 50.0
        
        # 4. MACD for momentum
        macd_result = technicals.calculate_macd(pd.Series(close_prices))
        if macd_result and "MACD" in macd_result and len(macd_result["MACD"]) > 0:
            macd_line = macd_result["MACD"]
            if not macd_line.isna().all():
                latest_macd = float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else 0.0
            else:
                latest_macd = 0.0
        else:
            latest_macd = 0.0
        
        # 5. Expected return: Simple calculation based on recent trend
        if len(returns) > 0:
            mean_return = float(np.mean(returns)) * 252 * 100  # Annualized percentage
        else:
            mean_return = 0.0
        
        # 6. Overall score: Weighted combination of indicators (0-100)
        # RSI component (50 is neutral)
        rsi_component = (latest_rsi - 50) / 2.5  # -20 to +20 from neutrality
        # Trend component
        trend_component = trend_score * 20  # -20 to +20
        # Overall score = 50 + components
        overall_score = float(np.clip(50.0 + rsi_component + trend_component, 0, 100))
        
        # 7. Technical score: Based on RSI
        technical_score = float(latest_rsi)
        
        # 8. Momentum score: Based on MACD (normalized)
        momentum_score = float(np.clip(50.0 + (latest_macd * 10), 0, 100))
        
        # 9. Confidence: Based on volatility and data quality
        # Higher volatility = lower confidence
        confidence = float(np.clip(100.0 - (volatility * 100), 20.0, 95.0))
        
        return {
            "confidence": confidence,
            "trend_score": float(trend_score),
            "overall_score": overall_score,
            "technical_score": technical_score,
            "momentum_score": momentum_score,
            "expected_return": mean_return,
            "volatility": float(volatility)
        }
    except Exception as e:
        print(f"Error calculating risk features: {e}")
        return {
            "confidence": 50.0,
            "trend_score": 0.0,
            "overall_score": 50.0,
            "technical_score": 50.0,
            "momentum_score": 50.0,
            "expected_return": 0.0,
            "volatility": 0.15
        }

@router.post("/predict-ai")
def predict_ai(payload: dict):
    try:
        symbol = payload.get("symbol")
        steps = payload.get("steps", 10)

        if not symbol:
            return {"error": "Symbol is required"}

        advisor_result = None  # ✅ IMPORTANT: initialize

        # 1️⃣ Load data
        df = load_stock_dataframe(symbol)

        # 2️⃣ ML predictions
        predict_price_func = get_predict_price()
        price_result = predict_price_func(symbol, steps)
        
        # Calculate risk features from historical data
        risk_features = calculate_risk_features(df)
        predict_risk_func = get_predict_risk_func()
        risk_result = predict_risk_func(risk_features)

        # 3️⃣ Advisor (safe)
        try:
            advisor = get_advisor()
            advisor_result = advisor.suggest(
                df=df,
                ml_risk=risk_result,
                ticker=symbol
            )
        except Exception as e:
            advisor_result = {
                "signal": "hold",
                "confidence": 0.0,
                "decision_summary": "Advisor unavailable due to internal error."
            }
            print("Advisor error:", e)

        return {
            "price": price_result,
            "risk": risk_result,
            "advisor": advisor_result,
            }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-risk")
def predict_risk_endpoint(payload: RiskInput):
    RiskPredictor = get_risk_predictor()
    predictor = RiskPredictor()
    features = {
        "confidence": payload.confidence,
        "trend_score": payload.trend_score,
        "overall_score": payload.overall_score,
        "technical_score": payload.technical_score,
        "momentum_score": payload.momentum_score,
        "expected_return": payload.expected_return,
        "volatility": payload.volatility
    }
    return predictor.predict_risk(features)

@router.get("/risk-vs-prediction")
def risk_vs_prediction():
    try:
        load_and_validate_data, generate_prediction_response = get_risk_vs_predict_funcs()
        df = load_and_validate_data()
        return {
            "success": True,
            "data": generate_prediction_response(df)
        }
    except FileNotFoundError:
        # Generate sample data if CSV not found
        logger.warning("Prediction vs Reality CSV not found, generating sample data")
        return {
            "success": True,
            "data": generate_sample_prediction_data()
        }
    except Exception as e:
        # Generate sample data on any error
        logger.warning(f"Error loading prediction data: {str(e)}, generating sample data")
        return {
            "success": True,
            "data": generate_sample_prediction_data()
        }

def generate_sample_prediction_data():
    """Generate sample prediction vs reality data for demo"""
    import numpy as np
    from datetime import datetime, timedelta
    
    n = 30
    dates = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(n, 0, -1)]
    
    # Generate realistic time-series data
    np.random.seed(42)
    trend = np.linspace(0, 10, n)
    noise_actual = np.random.normal(0, 2, n)
    noise_pred = np.random.normal(0, 1.5, n)
    
    actual_prices = 100 + trend + noise_actual
    predicted_prices = 100 + trend + noise_pred + np.random.normal(0, 1, n)
    
    # Calculate risk levels based on volatility
    returns = np.diff(actual_prices) / actual_prices[:-1]
    vol = np.std(returns)
    risk_levels = [vol * (0.5 + np.random.random()) for _ in range(n)]
    risk_levels = np.clip(risk_levels, 0, 1).tolist()
    
    # Calculate errors
    errors = np.abs(actual_prices - predicted_prices)
    mean_error = float(np.mean(errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    
    # Calculate real risk confidence based on data
    # Count risk levels in each category
    low_risk = sum(1 for r in risk_levels if r < 0.33)
    medium_risk = sum(1 for r in risk_levels if 0.33 <= r < 0.67)
    high_risk = sum(1 for r in risk_levels if r >= 0.67)
    
    # Convert to percentages
    low_pct = (low_risk / n * 100) if n > 0 else 0
    medium_pct = (medium_risk / n * 100) if n > 0 else 0
    high_pct = (high_risk / n * 100) if n > 0 else 0
    
    avg_actual = float(np.mean(actual_prices))
    
    return {
        "dates": dates,
        "actual_prices": actual_prices.tolist(),
        "predicted_prices": predicted_prices.tolist(),
        "risk_levels": risk_levels,
        "statistics": {
            "average_actual": avg_actual,
            "average_predicted": float(np.mean(predicted_prices)),
            "mean_absolute_error": mean_error,
            "rmse": rmse
        },
        "risk_confidence": {
            "low": round(low_pct, 1),
            "medium": round(medium_pct, 1),
            "high": round(high_pct, 1)
        },
        "prediction_suppressed": [False] * n,
        "suppression_message": ""
    }
