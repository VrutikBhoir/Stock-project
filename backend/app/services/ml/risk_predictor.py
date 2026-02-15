import joblib
import numpy as np
import os
from typing import Dict, Any
from pydantic import BaseModel

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_model.pkl")


class RiskPredictor:
    """
    AI Risk Predictor for stock market decisions.
    """

    REQUIRED_FEATURES = [
        "confidence",
        "trend_score",
        "overall_score",
        "technical_score",
        "momentum_score",
        "expected_return",
        "volatility"
    ]

    def __init__(self):
        self.model = None

    # -----------------------------
    # Load model lazily
    # -----------------------------
    def load_model(self):
        if self.model is None:
            if not os.path.exists(MODEL_PATH):
                raise RuntimeError("Risk model not available")
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
        self.load_model()
        self._validate_features(features)

        X = np.array([[
            features["confidence"],
            features["trend_score"],
            features["overall_score"],
            features["technical_score"],
            features["momentum_score"],
            features["expected_return"],
            features["volatility"]
        ]])

        # Regression model
        if not hasattr(self.model, "predict_proba"):
            score = float(self.model.predict(X)[0])
            score = max(0.0, min(1.0, score))
            level = self._risk_level_from_score(score)

        # Classification model
        else:
            probs = self.model.predict_proba(X)[0]
            score = float(np.max(probs))
            level = ["LOW", "MEDIUM", "HIGH"][int(np.argmax(probs))]

        return {
            "risk_score": round(score, 4),
            "risk_level": level,
            "input_features": features
        }


class RiskInput(BaseModel):
    """Input schema for risk prediction"""
    confidence: float
    trend_score: float
    overall_score: float
    technical_score: float
    momentum_score: float
    expected_return: float
    volatility: float


# Global instance
_risk_predictor = RiskPredictor()


def predict_risk(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Standalone function to predict risk.
    Wraps the RiskPredictor class for easier importing.
    """
    return _risk_predictor.predict_risk(features)
