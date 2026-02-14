import sys
import json
from datetime import datetime
import traceback

def predict_event_impact(stock: str, event_text: str):
    return predict_event(stock, event_text)

def predict_event(stock: str, event_text: str):
    try:
        stock = stock.strip().upper()
        event_text = event_text.strip()

        # ========================
        # SIMPLE VALIDATION (NO WORD LIMIT)
        # ========================
        if not stock:
            return error_response("Stock symbol is required", stock, event_text)

        if len(stock) > 10:
            return error_response("Stock symbol should be 10 characters or less", stock, event_text)

        if not event_text:
            return error_response("Event description is required", stock, event_text)

        # ========================
        # STOCK PROFILES
        # ========================
        stock_profiles = {
            "AAPL": {"volatility": 0.6, "sector": "tech"},
            "TSLA": {"volatility": 0.9, "sector": "auto"},
            "GOOGL": {"volatility": 0.7, "sector": "tech"},
            "AMZN": {"volatility": 0.8, "sector": "ecommerce"},
            "META": {"volatility": 0.85, "sector": "social"},
            "MSFT": {"volatility": 0.65, "sector": "tech"},
        }

        profile = stock_profiles.get(stock, {"volatility": 0.75, "sector": "general"})

        # ========================
        # SENTIMENT ANALYSIS
        # ========================
        pos, neg = simple_sentiment_analysis(event_text)
        text_lower = event_text.lower()

        if "ceo resignation" in text_lower:
            neg += 2

        if "record profit" in text_lower or "strong earnings" in text_lower:
            pos += 2

        # ========================
        # IMPACT LOGIC
        # ========================
        base_confidence = 0.6

        if pos > neg:
            sentiment = "Positive"
            impact = "Positive Impact"
            confidence = base_confidence + (pos * 0.06) * profile["volatility"]
        elif neg > pos:
            sentiment = "Negative"
            impact = "Negative Impact"
            confidence = base_confidence + (neg * 0.06) * profile["volatility"]
        else:
            sentiment = "Neutral"
            impact = "Neutral Impact"
            confidence = 0.5 * profile["volatility"]

        confidence = min(confidence, 0.95)

        # ========================
        # EXTRA INSIGHTS
        # ========================
        impact_strength = (
            "High" if confidence >= 0.8 else
            "Medium" if confidence >= 0.6 else
            "Low"
        )

        risk_level = (
            "High Risk" if sentiment == "Negative" and profile["volatility"] > 0.75 else
            "Moderate Risk" if sentiment == "Negative" else
            "Low Risk"
        )

        short_term = "Bullish" if sentiment == "Positive" else "Bearish" if sentiment == "Negative" else "Stable"
        long_term = "Growth" if sentiment == "Positive" else "Recovery Possible" if sentiment == "Negative" else "Neutral"

        explanation = generate_explanation(sentiment, event_text, profile["sector"])

        return {
            "ok": True,
            "stock": stock,
            "event": event_text,
            "sector": profile["sector"],
            "sentiment": sentiment,
            "impact": impact,
            "impact_strength": impact_strength,
            "confidence_percent": round(confidence * 100, 2),
            "risk_level": risk_level,
            "short_term_outlook": short_term,
            "long_term_outlook": long_term,
            "explanation": explanation,
            "timestamp": datetime.now().isoformat(),
            "model": "Rule-based Stock Event Impact Engine"
        }

    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }

# ========================
# HELPERS
# ========================

def error_response(message, stock, event_text):
    return {
        "ok": False,
        "error": message,
        "stock": stock,
        "event": event_text
    }

def simple_sentiment_analysis(event_text):
    positive_words = [
        "profit", "growth", "gain", "rise", "surge",
        "success", "bullish", "upgrade", "acquisition",
        "record", "strong", "innovation"
    ]

    negative_words = [
        "loss", "decline", "drop", "scandal",
        "resignation", "fraud", "lawsuit",
        "bankruptcy", "downgrade", "crisis",
        "investigation", "recall"
    ]

    text = event_text.lower()
    pos = sum(1 for w in positive_words if w in text)
    neg = sum(1 for w in negative_words if w in text)

    return pos, neg

def generate_explanation(sentiment, event, sector):
    if sentiment == "Negative":
        return f"The event '{event}' may cause uncertainty in the {sector} sector and increase volatility."
    elif sentiment == "Positive":
        return f"The event '{event}' suggests growth opportunities in the {sector} sector."
    else:
        return f"The event '{event}' is unlikely to significantly impact the {sector} sector."

# ========================
# CLI SUPPORT
# ========================
if __name__ == "__main__":
    try:
        stock = sys.argv[1]
        event = sys.argv[2]
        print(json.dumps(predict_event(stock, event), indent=2))
    except:
        print(json.dumps({"ok": False, "error": "Invalid arguments"}))
