
import joblib
import numpy as np
import os
from typing import Dict, Any
from app.services.ml.price_predictor import predict_price
from app.services.advisor import Advisor
from app.services.data_processor import DataProcessor

from fastapi import APIRouter

router = APIRouter()

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_model.pkl")

advisor = Advisor()
# risk_predictor.py

def predict_risk(symbol: str) -> dict:
    # load trained model here
    # example output
    return {
        "risk_score": 0.72,
        "label": "HIGH",
        "volatility": 0.031
    }

@router.post("/predict-ai")
def predict_ai(payload: dict):
    symbol = payload["symbol"]

    # 1️⃣ Load historical stock data
    df = DataProcessor.fetch_stock_data(symbol) # pyright: ignore[reportCallIssue]

    # 2️⃣ Run trained ML models
    price_result = predict_price(symbol)
    risk_predictor = RiskPredictor()
    risk_result = risk_predictor.predict_risk(symbol)

    # 3️⃣ Run advisor (uses ML outputs)
    advisor_result = advisor.suggest(
        df=df,
        ml_risk=risk_result,
        ticker=symbol
    )

    # 4️⃣ Return everything to frontend
    return {
        "price": price_result,
        "risk": risk_result,
        "advisor": advisor_result
    }

class RiskPredictor:
    """
    AI Risk Predictor for stock market decisions.

    Supports:
    - Regression models (risk score 0–1)
    - Classification models (LOW / MEDIUM / HIGH)
    """

    REQUIRED_FEATURES = [
        "volatility",
        "drawdown",
        "trend_strength",
        "volume_spike"
    ]

    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Risk model not found at {MODEL_PATH}")

        self.model = joblib.load(MODEL_PATH)

    # -----------------------------
    # Feature validation
    # -----------------------------
    def _validate_features(self, features: Dict[str, Any]):
        missing = [f for f in self.REQUIRED_FEATURES if f not in features]
        if missing:
            raise ValueError(f"Missing required features: {missing}")

    # -----------------------------
    # Risk level mapping
    # -----------------------------
    @staticmethod
    def _risk_level_from_score(score: float) -> str:
        if score < 0.33:
            return "LOW"
        elif score < 0.66:
            return "MEDIUM"
        return "HIGH"

    # -----------------------------
    # Main prediction
    # -----------------------------
    def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Input:
        {
            "volatility": 0.32,
            "drawdown": -0.18,
            "trend_strength": 0.65,
            "volume_spike": 1.3
        }
        """

        self._validate_features(features)

        X = np.array([[  
            features["volatility"],
            features["drawdown"],
            features["trend_strength"],
            features["volume_spike"]
        ]])

        # -----------------------------
        # Case 1: Regression model
        # -----------------------------
        if hasattr(self.model, "predict") and not hasattr(self.model, "predict_proba"):
            score = float(self.model.predict(X)[0])
            score = max(0.0, min(1.0, score))  # clamp
            level = self._risk_level_from_score(score)

        # -----------------------------
        # Case 2: Classification model
        # -----------------------------
        else:
            probs = self.model.predict_proba(X)[0]
            score = float(np.max(probs))
            level = ["LOW", "MEDIUM", "HIGH"][int(np.argmax(probs))]

        explanation = self._generate_explanation(features, level)

        return {
            "risk_score": round(score, 4),
            "risk_level": level,
            "risk_explanation": explanation,
            "input_features": features
        }

    # -----------------------------
    # Explainability (VERY IMPORTANT)
    # -----------------------------
    def _generate_explanation(self, features: Dict[str, float], level: str) -> str:
        reasons = []

        if features["volatility"] > 0.4:
            reasons.append("high market volatility")
        if features["drawdown"] < -0.15:
            reasons.append("significant recent drawdown")
        if features["trend_strength"] < 0.4:
            reasons.append("weak price trend")
        if features["volume_spike"] > 1.5:
            reasons.append("unusual trading volume")

        if not reasons:
            reasons.append("stable technical indicators")

        return f"Risk classified as {level} due to " + ", ".join(reasons) + "."

