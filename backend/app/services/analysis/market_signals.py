def aggregate_signals(
    trend: str,
    confidence: float,
    risk_level: str,
    volatility: str,
    news_sentiment: dict
):
    conflict = (
        trend == "Uptrend" and news_sentiment["sentiment"] == "Negative"
    ) or (
        trend == "Downtrend" and news_sentiment["sentiment"] == "Positive"
    )

    return {
        "trend": trend,
        "price_confidence": confidence,
        "risk_level": risk_level,
        "volatility": volatility,
        "news_sentiment": news_sentiment["sentiment"],
        "news_confidence": news_sentiment["confidence"],
        "signal_conflict": conflict
    }
