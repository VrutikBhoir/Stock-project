from collections import Counter

POSITIVE_WORDS = {"gain", "growth", "profit", "surge", "rise", "bullish", "strong"}
NEGATIVE_WORDS = {"loss", "drop", "fall", "decline", "bearish", "weak", "crash"}

def analyze_news_sentiment(headlines: list[str]):
    if not headlines:
        return {
            "sentiment": "Neutral",
            "confidence": 0.0,
            "scores": {"pos": 0, "neg": 0, "neu": 1}
        }

    counter = Counter()

    for title in headlines:
        words = set(title.lower().split())
        if words & POSITIVE_WORDS:
            counter["pos"] += 1
        elif words & NEGATIVE_WORDS:
            counter["neg"] += 1
        else:
            counter["neu"] += 1

    total = sum(counter.values()) or 1

    pos = counter["pos"] / total
    neg = counter["neg"] / total
    neu = counter["neu"] / total

    if neg > pos:
        sentiment = "Negative"
        confidence = neg
    elif pos > neg:
        sentiment = "Positive"
        confidence = pos
    else:
        sentiment = "Neutral"
        confidence = neu

    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 2),
        "scores": {"pos": pos, "neg": neg, "neu": neu}
    }
