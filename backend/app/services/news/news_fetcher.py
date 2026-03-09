import requests
import os
from datetime import datetime, timedelta

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

def fetch_stock_news(symbol: str, days: int = 3):
    if not NEWS_API_KEY:
        return []

    from_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": symbol,
        "from": from_date,
        "sortBy": "relevancy",
        "language": "en",
        "pageSize": 10,
        "apiKey": NEWS_API_KEY,
    }

    try:
        res = requests.get(url, params=params, timeout=5)
        data = res.json()
        articles = data.get("articles", [])
        return [a["title"] for a in articles if a.get("title")]
    except Exception:
        return []
