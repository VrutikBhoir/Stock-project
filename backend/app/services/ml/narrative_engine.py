"""
Production-Grade ML-Driven Narrative Engine

🎯 SYMBOL-AGNOSTIC DESIGN:
This engine works with ANY valid stock symbol (US, India, global).
- NO hardcoded symbol lists
- NO symbol-dependent features
- Uses ONLY numerical market signals

Uses trained ML models to determine:
- Sentiment: Bullish, Neutral, Bearish
- Conviction: High, Medium, Low

Based on universal market features:
- Confidence score
- Trend direction
- Technical indicators
- Momentum signals
- Expected returns
- Volatility metrics

NO rule-based logic for sentiment. NO mock values.
ONLY real ML predictions + investor-specific formatting.
"""

import os
import logging
import joblib
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)
BASE_DIR = os.path.dirname(__file__)

# Path to trained ML models
NARRATIVE_MODEL_PATH = os.path.join(BASE_DIR, "models", "narrative_engine_final.pkl")

# Global singleton
_narrative_engine = None


class NarrativeEngine:
    """ML-Driven Narrative Engine using trained sklearn models."""
    
    def __init__(self):
        """Initialize and load trained models."""
        self.model_package = None
        self.sentiment_model = None
        self.conviction_model = None
        self.scaler = None
        self._load_models()
    
    def _load_models(self):
        """Load trained ML models from pickle file."""
        try:
            if os.path.exists(NARRATIVE_MODEL_PATH):
                self.model_package = joblib.load(NARRATIVE_MODEL_PATH)
                self.sentiment_model = self.model_package.get("sentiment_model")
                self.conviction_model = self.model_package.get("conviction_model")
                self.scaler = self.model_package.get("scaler")
                
                if self.sentiment_model and self.conviction_model and self.scaler:
                    logger.info("✅ Loaded ML models: sentiment_model, conviction_model, scaler")
                else:
                    logger.error("❌ Model package incomplete. Missing required components.")
                    self.model_package = None
            else:
                logger.warning(f"⚠️ Model not found at {NARRATIVE_MODEL_PATH}")
                logger.info("   Run: python backend/train_narrative_model.py")
        except Exception as e:
            logger.error(f"❌ Failed to load models: {str(e)}")
            self.model_package = None
    
    def generate_from_prediction(
        self,
        symbol: str,
        prediction_data: dict,
        analysis_data: dict,
        investor_type: str = "Balanced",
        time_horizon: str = "medium_term",
        investment_goal: str = None
    ):
        """
        Generate ML-driven narrative from real prediction outputs.
        
        🎯 SYMBOL-AGNOSTIC: Works with ANY stock symbol.
        Symbol is used only for display/logging, NOT as an ML feature.
        
        Args:
            symbol: Stock ticker (display only, not used in ML inference)
            prediction_data: From predict_price() - contains market signals
            analysis_data: From analyze_investment() - contains technical scores
            investor_type: Conservative, Balanced, Aggressive
            time_horizon: short_term, medium_term, long_term
            investment_goal: Growth, Income, Capital Protection, Trading
        
        Returns:
            Structured narrative response powered by ML
        """
        try:
            # 1️⃣ Extract all features from real prediction outputs
            features = self._extract_features(prediction_data, analysis_data)
            
            # 2️⃣ Use ML models to predict sentiment and conviction
            sentiment, conviction, confidence_score = self._predict_with_ml(features)
            
            # If ML fails, raise error (don't fall back to rules)
            if sentiment is None or conviction is None:
                raise ValueError("ML model prediction failed. Model may not be trained.")
            
            # 3️⃣ Extract additional data for narrative
            trend_direction = prediction_data.get("trend", {}).get("direction", "neutral")
            trend_change = prediction_data.get("trend", {}).get("percentage_change", 0)
            live_price = prediction_data.get("live_price", 0)
            volatility = prediction_data.get("volatility", 0)
            
            overall_score = analysis_data.get("overall_score", 50)
            risk_level = analysis_data.get("risk_assessment", {}).get("level", "MEDIUM")
            expected_return = analysis_data.get("expected_performance", {}).get("medium_term_return", 0)
            recommendation_action = analysis_data.get("recommendation", {}).get("action", "HOLD")
            
            # 4️⃣ Convert volatility to level
            volatility_level = self._volatility_to_level(volatility, live_price)
            
            # 5️⃣ Calculate signal strength
            signal_strength = self._calculate_signal_strength(confidence_score, overall_score)
            
            # 6️⃣ Build structured narrative sections
            narrative_sections = self._build_narrative_sections(
                symbol=symbol,
                sentiment=sentiment,
                conviction=conviction,
                trend_direction=trend_direction,
                trend_change=trend_change,
                confidence=confidence_score,
                volatility_level=volatility_level,
                risk_level=risk_level,
                expected_return=expected_return,
                overall_score=overall_score
            )
            
            # 7️⃣ Generate investor-specific insights
            investor_insights = self._generate_investor_insights(
                investor_type=investor_type,
                sentiment=sentiment,
                conviction=conviction,
                risk_level=risk_level,
                expected_return=expected_return,
                volatility_level=volatility_level,
                time_horizon=time_horizon
            )
            
            # 8️⃣ Action guidance
            action_guidance = self._generate_action_guidance(
                sentiment=sentiment,
                conviction=conviction,
                risk_level=risk_level,
                investor_type=investor_type,
                time_horizon=time_horizon,
                volatility_level=volatility_level,
                expected_return=expected_return
            )
            
            # 9️⃣ Return structured response
            return {
                "symbol": symbol,
                "model_used": "narrative_engine_final.pkl",
                "narrative": {
                    "sentiment": sentiment,
                    "confidence": round(confidence_score, 1),
                    "conviction": conviction,
                    "signal_strength": signal_strength,
                    "sections": narrative_sections
                },
                "market_data": {
                    "trend": trend_direction,
                    "trend_change_pct": round(trend_change, 2),
                    "volatility": volatility_level,
                    "risk_level": risk_level,
                    "expected_return": round(expected_return, 2)
                },
                "investor_context": {
                    "investor_type": investor_type,
                    "time_horizon": time_horizon,
                    "investment_goal": investment_goal,
                    "recommendation": recommendation_action,
                    "action_guidance": action_guidance,
                    "insights": investor_insights
                },
                "explainability": {
                    "generated_by": "ML",
                    "model_info": "Random Forest (sentiment + conviction classifiers)"
                }
            }
        
        except ValueError as e:
            logger.error(f"Validation error for {symbol}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Narrative generation error for {symbol}: {str(e)}", exc_info=True)
            raise
    
    def _extract_features(self, prediction_data: dict, analysis_data: dict) -> np.ndarray:
        """
        Extract ML feature vector from prediction outputs.
        SYMBOL-AGNOSTIC: Uses only numerical market signals, works for ANY stock.
        
        Features (in order, all numerical):
        [confidence, trend_score, overall_score, technical_score, momentum_score, expected_return, volatility]
        
        Robust handling:
        - Missing values default to 50/0 (neutral)
        - All values clipped to valid ranges
        - NaN/Inf detection
        """
        try:
            # 1. Confidence score (0-100)
            confidence = float(prediction_data.get("confidence_score", 50))
            if confidence < 10:  # Too low confidence might indicate data quality issue
                confidence = 50  # Use neutral middle value
            confidence = np.clip(confidence, 0, 100)
            
            # 2. Trend score (-1 to +1): down=-1, neutral=0, up=+1
            trend_direction = prediction_data.get("trend", {}).get("direction", "neutral")
            if isinstance(trend_direction, str):
                trend_direction = trend_direction.lower().strip()
            
            if trend_direction == "up":
                trend_score = 1.0
            elif trend_direction == "down":
                trend_score = -1.0
            else:
                trend_score = 0.0
            
            # 3. Overall investment score (0-100)
            overall_score = float(analysis_data.get("overall_score", 50))
            overall_score = np.clip(overall_score, 0, 100)
            
            # 4. Technical analysis score (0-100)
            technical_score = float(analysis_data.get("scores", {}).get("technical", 50))
            technical_score = np.clip(technical_score, 0, 100)
            
            # 5. Momentum score (0-100)
            momentum_score = float(analysis_data.get("scores", {}).get("momentum", 50))
            momentum_score = np.clip(momentum_score, 0, 100)
            
            # 6. Expected return (percentage, -50 to +50)
            expected_return = float(analysis_data.get("expected_performance", {}).get("medium_term_return", 0))
            expected_return = np.clip(expected_return, -50, 50)
            
            # 7. Volatility (annualized, 0-1.0 = 0% to 100%)
            # Note: volatility is stored as percentage in prediction_data
            volatility_pct = float(prediction_data.get("volatility", 0.2))
            # Convert percentage to decimal (e.g., 20% = 0.2)
            if volatility_pct > 1:
                volatility = volatility_pct / 100.0  # Convert from percentage
            else:
                volatility = volatility_pct
            volatility = np.clip(volatility, 0, 1.0)
            
            # Construct feature vector
            features_values = [
                confidence,
                trend_score,
                overall_score,
                technical_score,
                momentum_score,
                expected_return,
                volatility
            ]
            
            # Validate before returning
            for i, val in enumerate(features_values):
                if np.isnan(val) or np.isinf(val):
                    logger.error(f"Feature {i} is NaN/Inf: {val}")
                    features_values[i] = 50 if i in [0, 2, 3, 4] else 0
            
            features = np.array([features_values], dtype=np.float64)
            
            logger.debug(f"✓ Features extracted: conf={confidence:.1f}, trend={trend_score:.1f}, overall={overall_score:.1f}, vol={volatility:.3f}")
            
            return features
        
        except (TypeError, ValueError, KeyError) as e:
            logger.error(f"❌ Feature extraction error (type/value/key): {str(e)}")
            raise ValueError(f"Cannot extract features from prediction data: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Unexpected error in feature extraction: {str(e)}", exc_info=True)
            raise ValueError(f"Feature extraction failed: {str(e)}")
    
    def _predict_with_ml(self, features: np.ndarray) -> tuple:
        """
        Use trained ML models to predict sentiment and conviction.
        
        Returns:
            (sentiment, conviction, confidence_score) 
        
        Raises:
            ValueError if models not loaded or prediction fails
        """
        if self.model_package is None:
            raise ValueError("ML models not loaded. Run: python train_narrative_model.py")
        
        if self.sentiment_model is None or self.conviction_model is None:
            raise ValueError("Sentiment/conviction models missing from model package")
        
        if self.scaler is None:
            raise ValueError("Feature scaler missing from model package")
        
        try:
            # Scale features using trained scaler
            features_scaled = self.scaler.transform(features)
            
            # Predict sentiment: Bearish (0), Neutral (1), Bullish (2)
            sentiment_pred = self.sentiment_model.predict(features_scaled)[0]
            sentiment_labels = self.model_package.get("sentiment_labels", {0: "Bearish", 1: "Neutral", 2: "Bullish"})
            sentiment = sentiment_labels.get(int(sentiment_pred), "Neutral")
            
            # Predict conviction: Low (0), Medium (1), High (2)
            conviction_pred = self.conviction_model.predict(features_scaled)[0]
            conviction_labels = self.model_package.get("conviction_labels", {0: "Low", 1: "Medium", 2: "High"})
            conviction = conviction_labels.get(int(conviction_pred), "Medium")
            
            # Get prediction confidence from probabilities
            sentiment_probs = self.sentiment_model.predict_proba(features_scaled)[0]
            max_prob = np.max(sentiment_probs)
            confidence_score = float(max_prob * 100)
            
            logger.info(f"✓ ML Prediction: {sentiment} (conf: {confidence_score:.1f}%), {conviction} conviction")
            
            return sentiment, conviction, confidence_score
        
        except ValueError as e:
            logger.error(f"❌ Model prediction value error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"❌ ML prediction failed: {str(e)}", exc_info=True)
            raise ValueError(f"Model inference error: {str(e)}")
    
    def _volatility_to_level(self, volatility: float, reference_price: float) -> str:
        """Convert numeric volatility to qualitative level."""
        if reference_price <= 0:
            return "Unknown"
        
        volatility_pct = (volatility / reference_price) * 100
        
        if volatility_pct > 5:
            return "Very High"
        elif volatility_pct > 3:
            return "High"
        elif volatility_pct > 1.5:
            return "Moderate"
        else:
            return "Low"
    
    def _calculate_signal_strength(self, confidence: float, overall_score: float) -> str:
        """Calculate signal strength from confidence and overall score."""
        avg = (confidence + overall_score) / 2
        if avg >= 75:
            return "Strong"
        elif avg >= 55:
            return "Moderate"
        else:
            return "Weak"
    
    def _build_narrative_sections(
        self,
        symbol: str,
        sentiment: str,
        conviction: str,
        trend_direction: str,
        trend_change: float,
        confidence: float,
        volatility_level: str,
        risk_level: str,
        expected_return: float,
        overall_score: float
    ) -> dict:
        """
        Build structured narrative sections for easy frontend display.
        """
        emoji = {"Bullish": "📈", "Bearish": "📉", "Neutral": "📊"}.get(sentiment, "📊")
        
        return {
            "market_summary": f"{emoji} The AI model indicates a **{sentiment}** outlook with {confidence:.0f}% confidence. Market conditions score {overall_score:.0f}/100.",
            "why_this_outlook": self._build_why_section(sentiment, confidence, conviction, trend_change),
            "key_factors": self._build_key_factors(trend_direction, confidence, expected_return, volatility_level, risk_level),
            "disclaimer": "⚠️ AI-generated analysis only. NOT financial advice. Consult a financial advisor before investing."
        }
    
    def _build_why_section(self, sentiment: str, confidence: float, conviction: str, trend_change: float) -> str:
        """Build explanation of why the model reached this conclusion."""
        lines = []
        
        reliability_map = {
            "High": "strong and well-aligned",
            "Medium": "moderate and fairly consistent",
            "Low": "mixed and uncertain"
        }
        reliability = reliability_map.get(conviction, "uncertain")
        
        lines.append(f"The model's signals are **{reliability}** ({conviction.lower()} conviction).")
        lines.append(f"Confidence: {confidence:.0f}% ({self._confidence_description(confidence)}).")
        
        if abs(trend_change) > 2:
            direction = "upside" if trend_change > 0 else "downside"
            lines.append(f"Expected {direction} momentum: {abs(trend_change):.1f}%.")
        
        return " ".join(lines)
    
    def _confidence_description(self, confidence: float) -> str:
        """Convert confidence score to human-readable description."""
        if confidence >= 80:
            return "very high confidence"
        elif confidence >= 65:
            return "high confidence"
        elif confidence >= 50:
            return "moderate confidence"
        elif confidence >= 35:
            return "low confidence"
        else:
            return "very low confidence"
    
    def _build_key_factors(
        self,
        trend: str,
        confidence: float,
        expected_return: float,
        volatility: str,
        risk_level: str
    ) -> list:
        """Build bullet-point key factors."""
        return [
            f"**Trend**: {trend.capitalize()} with {confidence:.0f}% confidence",
            f"**Expected Return**: {expected_return:+.2f}%",
            f"**Volatility**: {volatility}",
            f"**Risk Level**: {risk_level}"
        ]
    
    def _generate_investor_insights(
        self,
        investor_type: str,
        sentiment: str,
        conviction: str,
        risk_level: str,
        expected_return: float,
        volatility_level: str,
        time_horizon: str
    ) -> list:
        """Generate investor-specific, actionable insights."""
        insights = []
        
        # Conviction-based
        if conviction == "High":
            insights.append("✅ High-confidence signal—strong alignment across models")
        elif conviction == "Low":
            insights.append("❓ Low-confidence signal—mixed market indicators")
        
        # Return potential
        if expected_return > 5:
            insights.append("📈 Strong upside potential identified")
        elif expected_return < -3:
            insights.append("📉 Significant downside risk—consider defensive positioning")
        elif abs(expected_return) < 1:
            insights.append("➡️ Limited price movement expected")
        
        # Volatility
        if volatility_level in ["Very High", "High"]:
            insights.append(f"⚡ {volatility_level} volatility—active management recommended")
        
        # Investor-type risk mismatch
        if investor_type == "Conservative" and risk_level in ["HIGH", "VERY HIGH"]:
            insights.append("🛡️ Risk exceeds conservative profile—consider alternatives")
        elif investor_type == "Aggressive" and sentiment == "Bullish" and conviction == "High":
            insights.append("🚀 Strong bullish setup—suitable for concentrated positions")
        
        # Time horizon
        if time_horizon == "short_term" and volatility_level in ["High", "Very High"]:
            insights.append("⏰ High volatility + short horizon = trading opportunities")
        
        return insights if insights else ["📊 Monitor market conditions regularly"]
    
    def _generate_action_guidance(
        self,
        sentiment: str,
        conviction: str,
        risk_level: str,
        investor_type: str,
        time_horizon: str,
        volatility_level: str,
        expected_return: float
    ) -> str:
        """Generate investor-specific action guidance (NOT financial advice)."""
        
        # Base action
        if conviction == "High" and sentiment == "Bullish":
            action = "Consider initiating or scaling into long positions"
        elif conviction == "High" and sentiment == "Bearish":
            action = "Consider reducing exposure or hedging"
        elif conviction == "Medium":
            action = "Maintain current positions; monitor for clearer signals"
        else:
            action = "Avoid aggressive moves until sentiment clarity improves"
        
        # Risk adjustment
        risk_notes = []
        if volatility_level in ["Very High", "High"] and investor_type == "Conservative":
            risk_notes.append("wait for volatility to decrease")
        if risk_level == "VERY HIGH" and investor_type in ["Conservative", "Balanced"]:
            risk_notes.append("only if risk tolerance permits")
        
        risk_suffix = f" ({'; '.join(risk_notes)})" if risk_notes else ""
        
        return f"💡 {action}{risk_suffix}. ⚠️ This is NOT financial advice. Always consult a financial advisor."


def get_narrative_engine():
    """Get or create singleton instance."""
    global _narrative_engine
    if _narrative_engine is None:
        logger.info("Initializing Narrative Engine...")
        _narrative_engine = NarrativeEngine()
    return _narrative_engine
