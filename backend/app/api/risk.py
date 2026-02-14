from fastapi import APIRouter, HTTPException
from app.services.ml.price_predictor import predict_price
from app.services.ml.risk_predictor import predict_risk
from app.services.advisor import Advisor
from app.services.alpha_vintage import get_historical
from app.services.ml.risk_vs_predict import (
    load_and_validate_data,
    generate_prediction_response
)
import traceback
import pandas as pd

router = APIRouter()
advisor = Advisor()

def load_stock_dataframe(symbol: str):
    """
    Helper to load historical data as a DataFrame for the advisor.
    """
    series = get_historical(symbol)
    return series.to_frame(name="Close")

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
        price_result = predict_price(symbol, steps)
        risk_result = predict_risk(symbol)

        # 3️⃣ Advisor (safe)
        try:
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

@router.get("/risk-vs-prediction")
def risk_vs_prediction():
    try:
        df = load_and_validate_data()
        return {
            "success": True,
            "data": generate_prediction_response(df)
        }
    except Exception as e:
        # 🔥 TEMPORARY: return actual error
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
