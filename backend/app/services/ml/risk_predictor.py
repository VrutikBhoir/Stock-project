"""
Risk Predictor ML Service
========================
Pure ML logic - NO FastAPI imports, NO circular imports.
Model is lazily loaded to prevent app startup crashes.
Render-deployment safe.
"""

import joblib
import numpy as np
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_model.pkl")


class RiskPredictor:
    """
    AI Risk Predictor for stock market decisions.
    Pure ML class with no FastAPI dependencies.
    Models are lazily loaded on first use.
    """

    REQUIRED_FEATURES = [
        "volatility",
        "drawdown",
        "trend_strength",
        "volume_spike"
    ]

    def __init__(self):
        """Initialize without loading model (lazy loading)"""
        self.model: Optional[Any] = None
        self.model_loaded = False

    # =====================================================================
    # Model Loading (Lazy)
    # =====================================================================

    def load_model(self) -> bool:
        """
        Lazily load the risk prediction model.
        Returns True if successful, False otherwise.
        """
        if self.model_loaded:
            return self.model is not None
        
        try:
            if not os.path.exists(MODEL_PATH):
                logger.warning(f"Risk model not found at {MODEL_PATH}. Using fallback.")
                self.model_loaded = True
                self.model = None
                return False
            
            self.model = joblib.load(MODEL_PATH)
            self.model_loaded = True
            logger.info("Risk model loaded successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error loading risk model: {str(e)}")
            self.model_loaded = True
            self.model = None
            return False

    # =====================================================================
    # Feature Validation
    # =====================================================================

    def _validate_features(self, features: Dict[str, Any]) -> None:
        """
        Validate that all required features are present.
        
        Raises:
            ValueError: If required features are missing
        """
        missing = [f for f in self.REQUIRED_FEATURES if f not in features]
        if missing:
            raise ValueError(f"Missing required features: {missing}")
        
        # Validate feature values are numeric
        for key, value in features.items():
            if key in self.REQUIRED_FEATURES:
                try:
                    float(value)
                except (TypeError, ValueError):
                    raise ValueError(f"Feature '{key}' must be numeric, got {type(value)}")

    # =====================================================================
    # Risk Level Mapping
    # =====================================================================

    @staticmethod
    def _risk_level_from_score(score: float) -> str:
        """
        Map continuous risk score to discrete risk level.
        
        Args:
            score: Risk score between 0 and 1
        
        Returns:
            Risk level: "LOW", "MEDIUM", or "HIGH"
        """
        if score < 0.33:
            return "LOW"
        elif score < 0.66:
            return "MEDIUM"
        return "HIGH"

    # =====================================================================
    # Main Prediction
    # =====================================================================

    def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict risk from feature inputs.
        
        Args:
            features: Dictionary with keys: volatility, drawdown, trend_strength, volume_spike
                     All values should be floats between 0 and 1
        
        Returns:
            Dictionary with risk_score, risk_level, and input_features
        
        Raises:
            ValueError: If features are invalid
        """
        # Validate input features
        self._validate_features(features)
        
        # Prepare feature vector
        X = np.array([[
            features["volatility"],
            features["drawdown"],
            features["trend_strength"],
            features["volume_spike"]
        ]])
        
        # Attempt to load model
        model_available = self.load_model()
        
        # If no model available, use fallback
        if not model_available or self.model is None:
            logger.warning("Using fallback risk prediction (no model)")
            return self._fallback_predict(features)
        
        try:
            # Try regression prediction
            if not hasattr(self.model, "predict_proba"):
                score = float(self.model.predict(X)[0])
                score = max(0.0, min(1.0, score))  # Clamp to [0, 1]
                level = self._risk_level_from_score(score)
            
            # Try classification prediction
            else:
                probs = self.model.predict_proba(X)[0]
                score = float(np.max(probs))
                level = ["LOW", "MEDIUM", "HIGH"][int(np.argmax(probs))]
            
            return {
                "risk_score": round(score, 4),
                "risk_level": level,
                "input_features": features,
                "model_used": True
            }
        
        except Exception as e:
            logger.error(f"Error during model prediction: {str(e)}")
            return self._fallback_predict(features)

    # =====================================================================
    # Fallback Prediction (No Model)
    # =====================================================================

    def _fallback_predict(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Fallback prediction when model is not available.
        Uses simple heuristic based on features.
        
        Args:
            features: Feature dictionary
        
        Returns:
            Risk prediction using fallback logic
        """
        # Simple weighted average of risk indicators
        volatility = features.get("volatility", 0.5)
        drawdown = features.get("drawdown", 0.5)
        trend_strength = abs(features.get("trend_strength", 0.5) - 0.5) * 2  # Extreme trends = risk
        volume_spike = features.get("volume_spike", 0.5)
        
        # Compute risk score as weighted average
        score = (
            volatility * 0.4 +
            drawdown * 0.3 +
            trend_strength * 0.2 +
            volume_spike * 0.1
        )
        
        score = max(0.0, min(1.0, score))
        level = self._risk_level_from_score(score)
        
        return {
            "risk_score": round(score, 4),
            "risk_level": level,
            "input_features": features,
            "model_used": False,
            "fallback": True,
            "note": "Using heuristic fallback (model not available)"
        }

    # =====================================================================
    # Backward Compatibility
    # =====================================================================

    def predict(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Alias for predict_risk() for backward compatibility.
        """
        return self.predict_risk(features)
