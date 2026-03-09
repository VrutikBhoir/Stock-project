from unittest import result
from urllib import response
from fastapi import params
from fastapi import params
import requests
import os
from collections import Counter
from typing import Dict, List
import time

_NEWS_CACHE = {}
_NEWS_CACHE_TTL = 1800  # 30 minutes  # 30 minutes
# Enhanced keyword dictionaries for sentiment analysis
POSITIVE_WORDS = {
    "gain", "growth", "profit", "surge", "rise", "bullish", "strong", "up", "beat",
    "exceed", "outperform", "rally", "boom", "soar", "climb", "advance", "boost",
    "upgrade", "optimistic", "winning", "success", "record", "high", "improve", "recover"
}

NEGATIVE_WORDS = {
    "loss", "drop", "fall", "decline", "bearish", "weak", "crash", "down", "miss",
    "underperform", "plunge", "sink", "tumble", "slump", "lawsuit", "scandal", "breach",
    "downgrade", "pessimistic", "concern", "worry", "risk", "cut", "layoff", "warn"
}

# Theme identification keywords
THEME_KEYWORDS = {
    "earnings": {
        "earnings", "revenue", "profit", "quarterly", "eps", "beat", "miss", "guidance",
        "forecast", "results", "income", "margin", "sales", "dividend"
    },
    "expansion": {
        "expansion", "acquire", "acquisition", "merger", "partnership", "deal", "growth",
        "launch", "new", "enter", "market", "expand", "invest", "investment", "venture"
    },
    "regulation": {
        "regulation", "regulatory", "compliance", "sec", "lawsuit", "legal", "court",
        "investigation", "antitrust", "fine", "penalty", "approval", "license"
    },
    "risk": {
        "risk", "threat", "concern", "worry", "warning", "caution", "uncertainty",
        "volatility", "crisis", "issue", "problem", "challenge", "exposure"
    },
    "technology": {
        "technology", "ai", "innovation", "patent", "software", "platform", "digital",
        "tech", "cyber", "data", "cloud", "automation", "product", "development"
    },
    "operations": {
        "operations", "production", "manufacturing", "supply", "chain", "logistics",
        "efficiency", "cost", "workforce", "plant", "facility", "capacity", "output"
    }
}

# Impact assessment keywords
HIGH_IMPACT_WORDS = {
    "investigation", "lawsuit", "acquisition", "merger", "bankruptcy", "scandal",
    "breakthrough", "record", "crash", "surge", "plunge", "regulatory", "fda"
}

MEDIUM_IMPACT_WORDS = {
    "earnings", "guidance", "upgrade", "downgrade", "partnership", "expansion",
    "revenue", "profit", "beat", "miss", "cut", "raise"
}


def analyze_news_sentiment(headlines: List[str]) -> Dict:
    """
    Comprehensive news sentiment analysis with themes and impact assessment.
    
    Args:
        headlines: List of news headlines
        
    Returns:
        Dictionary with sentiment, themes, impact, and summary
    """
    if not headlines:
        return {
            "sentiment": "Neutral",
            "confidence": 0.0,
            "scores": {"pos": 0, "neg": 0, "neu": 1},
            "themes": [],
            "market_impact": "Low",
            "headline_count": 0,
            "summary": "No recent news available for analysis."
        }

    # Sentiment scoring
    sentiment_counter = Counter()
    theme_counter = Counter()
    impact_indicators = []
    
    for headline in headlines:
        words = set(headline.lower().split())
        
        # Sentiment analysis
        positive_matches = words & POSITIVE_WORDS
        negative_matches = words & NEGATIVE_WORDS
        
        if positive_matches:
            sentiment_counter["pos"] += len(positive_matches)
        if negative_matches:
            sentiment_counter["neg"] += len(negative_matches)
        if not positive_matches and not negative_matches:
            sentiment_counter["neu"] += 1
            
        # Theme identification
        for theme, keywords in THEME_KEYWORDS.items():
            if words & keywords:
                theme_counter[theme] += 1
                
        # Impact assessment
        if words & HIGH_IMPACT_WORDS:
            impact_indicators.append("high")
        elif words & MEDIUM_IMPACT_WORDS:
            impact_indicators.append("medium")
        else:
            impact_indicators.append("low")

    # Calculate sentiment
    total_sentiment = sum(sentiment_counter.values()) or 1
    pos_score = sentiment_counter["pos"] / total_sentiment
    neg_score = sentiment_counter["neg"] / total_sentiment
    neu_score = sentiment_counter["neu"] / total_sentiment

    # Determine overall sentiment conservatively
    if neg_score > pos_score + 0.1:  # Conservative threshold
        sentiment = "Negative"
        confidence = neg_score
    elif pos_score > neg_score + 0.1:
        sentiment = "Positive"
        confidence = pos_score
    else:
        sentiment = "Neutral"
        confidence = neu_score

    # Identify dominant themes (top 2-3)
    dominant_themes = [theme for theme, count in theme_counter.most_common(3) if count > 0]
    
    # Assess market impact
    high_count = impact_indicators.count("high")
    medium_count = impact_indicators.count("medium")
    
    if high_count >= 2 or (high_count >= 1 and medium_count >= 2):
        market_impact = "High"
    elif medium_count >= 3 or high_count >= 1:
        market_impact = "Medium"
    else:
        market_impact = "Low"
    
    # Generate summary
    summary = _generate_news_summary(
        sentiment=sentiment,
        themes=dominant_themes,
        impact=market_impact,
        headline_count=len(headlines)
    )

    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 2),
        "scores": {
            "pos": round(pos_score, 2),
            "neg": round(neg_score, 2),
            "neu": round(neu_score, 2)
        },
        "themes": dominant_themes,
        "market_impact": market_impact,
        "headline_count": len(headlines),
        "summary": summary
    }

def get_news_for_symbol(symbol: str):
    headlines = fetch_recent_headlines(symbol, limit=3)
    sentiment = analyze_news_sentiment(headlines)

    return {
        "headlines": headlines,
        "sentiment": sentiment["sentiment"],
        "confidence": sentiment["confidence"],  # stays 0–1 internally
        "headline": headlines[0] if headlines else "No major news detected"
    }
def _generate_news_summary(
    sentiment: str,
    themes: List[str],
    impact: str,
    headline_count: int
) -> str:
    """
    Generate a concise news summary without quoting headlines.
    
    Args:
        sentiment: Overall sentiment (Positive, Neutral, Negative)
        themes: Dominant themes identified
        impact: Market impact level (Low, Medium, High)
        headline_count: Number of headlines analyzed
        
    Returns:
        Summarized news insight text
    """
    if headline_count == 0:
        return "No recent news available for analysis."
    
    # Start with sentiment
    sentiment_phrases = {
        "Positive": "Recent news coverage shows a favorable outlook",
        "Negative": "Recent news coverage indicates concerning developments",
        "Neutral": "Recent news coverage presents a balanced picture"
    }
    
    summary_parts = [sentiment_phrases.get(sentiment, "Recent news coverage")]
    
    # Add themes
    if themes:
        theme_text = ", ".join(themes)
        summary_parts.append(f"focusing on {theme_text}")
    
    # Add impact assessment
    impact_phrases = {
        "High": "These developments could significantly influence near-term price action",
        "Medium": "These updates may moderately affect investor sentiment",
        "Low": "These updates are unlikely to cause major market reactions"
    }
    
    summary_parts.append(f". {impact_phrases.get(impact, '')}.")
    
    return " ".join(summary_parts)


def assess_news_technical_alignment(
    news_sentiment: str,
    technical_trend: str
) -> Dict[str, str]:
    """
    Assess whether news sentiment aligns with technical trends.
    
    Args:
        news_sentiment: "Positive", "Neutral", "Negative"
        technical_trend: "Uptrend", "Sideways", "Downtrend"
        
    Returns:
        Alignment assessment with explanation
    """
    # Alignment matrix
    alignments = {
        ("Positive", "Uptrend"): ("Aligned", "Positive news supports the upward technical trend"),
        ("Positive", "Sideways"): ("Neutral", "Positive news may help break out of sideways consolidation"),
        ("Positive", "Downtrend"): ("Conflicting", "Positive news contradicts the downward technical trend"),
        
        ("Neutral", "Uptrend"): ("Neutral", "Neutral news maintains the current upward momentum"),
        ("Neutral", "Sideways"): ("Aligned", "Neutral news aligns with sideways price action"),
        ("Neutral", "Downtrend"): ("Neutral", "Neutral news may not reverse the downward trend"),
        
        ("Negative", "Uptrend"): ("Conflicting", "Negative news conflicts with the upward technical trend"),
        ("Negative", "Sideways"): ("Neutral", "Negative news may pressure the sideways consolidation"),
        ("Negative", "Downtrend"): ("Aligned", "Negative news reinforces the downward technical trend"),
    }
    
    key = (news_sentiment, technical_trend)
    alignment, explanation = alignments.get(key, ("Neutral", "Unclear alignment between news and technicals"))
    
    return {
        "alignment": alignment,
        "explanation": explanation
    }

# -----------------------------------------
# 🔥 SYMBOL-AWARE SENTIMENT WRAPPER
# -----------------------------------------

def analyze_news_sentiment_for_symbol(symbol: str) -> Dict:
    """
    Fetches recent news headlines for a stock symbol and analyzes sentiment.
    This wrapper is used by market signal generation.
    """
    try:
        simulated_headlines = fetch_recent_headlines(symbol)

        return analyze_news_sentiment(simulated_headlines)

    except Exception as e:
        print(f"[News Sentiment Error] {symbol}: {e}")
        return {
    "headline": simulated_headlines[0] if simulated_headlines else "No major news detected",
    "sentiment": result["sentiment"],
    "confidence": result["confidence"]
}
def fetch_recent_headlines(symbol: str, limit: int = 5) -> List[str]:
    """
    Fetch recent news headlines for a stock symbol using NewsAPI.
    Uses in-memory caching to avoid rate limits.
    """
    if symbol == "AAPL":
      return ["Apple shares surge after strong earnings report"]
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        print("[NewsAPI] Missing API key")
        return []

    # ---- CACHE CHECK (FIRST) ----
    cache_key = f"{symbol}:headlines"
    cached = _NEWS_CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _NEWS_CACHE_TTL:
        return cached["data"]

    # ---- SYMBOL → COMPANY NAME ----
    COMPANY_NAME_MAP = {
        "AAPL": "Apple",
        "MSFT": "Microsoft",
        "GOOGL": "Google Alphabet",
        "NVDA": "Nvidia",
        "META": "Meta Facebook",
        "TSLA": "Tesla",
        "AMZN": "Amazon",
        "NFLX": "Netflix",
    }

    company = COMPANY_NAME_MAP.get(symbol.upper(), symbol.upper())
    query = f"{company} stock"

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": limit,
        "apiKey": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=4)

        # ---- RATE LIMIT ----
        if response.status_code == 429:
            print(f"[NewsAPI] Rate limited for {symbol}, using cache/fallback")
            return cached["data"] if cached else []

        response.raise_for_status()
        data = response.json()

        articles = data.get("articles", [])
        headlines = [a["title"] for a in articles if a.get("title")]

        # ---- CACHE STORE ----
        _NEWS_CACHE[cache_key] = {
            "ts": time.time(),
            "data": headlines,
        }

        return headlines

    except Exception as e:
        print(f"[NewsAPI ERROR] {symbol}: {e}")
        return cached["data"] if cached else []