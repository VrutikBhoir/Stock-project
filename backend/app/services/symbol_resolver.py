import os
import requests

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")

def looks_like_ticker(text: str) -> bool:
    """
    A valid ticker:
    - NO spaces
    - uppercase letters, dots, and hyphens only
    - length between 2 and 10
    """
    # Remove dots and hyphens for validation
    clean_text = text.replace(".", "").replace("-", "")
    return (
        " " not in text
        and text.isupper()
        and clean_text.isalpha()
        and 2 <= len(text) <= 10
    )


def normalize_variants(text: str) -> list[str]:
    """
    Generate search-friendly variants
    """
    raw = text.upper().strip()
    variants = [raw]

    # remove spaces
    variants.append(raw.replace(" ", ""))

    # first word only (e.g. HDFC from HDFC BANK)
    if " " in raw:
        variants.append(raw.split(" ")[0])

    return list(dict.fromkeys(variants))  # remove duplicates

def yahoo_search_symbol(query: str) -> str | None:
    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {
        "q": query,
        "quotesCount": 1,
        "newsCount": 0
    }

    r = requests.get(url, params=params, timeout=10)

    # ✅ SAFETY CHECK
    if not r.text or r.status_code != 200:
        return None

    try:
        data = r.json()
    except Exception:
        return None

    quotes = data.get("quotes", [])
    if not quotes:
        return None

    symbol = quotes[0].get("symbol")
    return symbol.upper() if symbol else None


def resolve_symbol(user_input: str) -> str:
    if not user_input:
        raise ValueError("Empty symbol")

    raw = user_input.strip().upper()

    # 1️⃣ If already looks like ticker → trust it
    if looks_like_ticker(raw):
        return raw

    # 2️⃣ Alpha Vantage search (mostly US stocks)
    try:
        url = "https://www.alphavantage.co/query"
        params = {
            "function": "SYMBOL_SEARCH",
            "keywords": raw,
            "apikey": ALPHA_VANTAGE_KEY
        }
        r = requests.get(url, params=params, timeout=10)
        data = r.json()

        matches = data.get("bestMatches", [])
        if matches:
            return matches[0]["1. symbol"]
    except Exception:
        pass

    # 3️⃣ Yahoo Finance SEARCH with variants
    for variant in normalize_variants(raw):
     yahoo_symbol = yahoo_search_symbol(variant)
     if yahoo_symbol:
        # ✅ Prefer NSE symbols automatically
        if yahoo_symbol.endswith(".NS"):
            return yahoo_symbol.replace(".NS", "")
        return yahoo_symbol


    raise ValueError(f"No stock found for '{user_input}'")

