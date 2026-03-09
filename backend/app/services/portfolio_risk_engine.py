from backend.app.db import supabase
from backend.app.services.price_service import get_stock_price, normalize_price
from typing import Callable, Optional


def calculate_portfolio_risk(user_id: str, price_fetcher: Optional[Callable] = None):
    """
    Calculate portfolio risk metrics.
    
    Args:
        user_id: User ID
        price_fetcher: Optional function to fetch prices (e.g., cached price fetcher).
                       If not provided, uses get_stock_price directly (slower).
    """

    holdings_res = supabase.table("holdings") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()

    holdings = holdings_res.data or []

    if not holdings:
        return {
    "risk_level": "LOW",
    "diversification_score": 0,
    "largest_position": "",
    "largest_position_percent": 0,
    "total_positions": 0
}

    total_value = 0
    position_values = {}

    for h in holdings:
        # Use provided price_fetcher (cached) or fall back to direct API call
        if price_fetcher:
            try:
                price = price_fetcher(h["symbol"])
            except Exception as e:
                print(f"Warning: Could not fetch cached price for {h['symbol']}: {e}")
                # Fall back to direct API call if caching fails
                try:
                    price_data = get_stock_price(h["symbol"])
                    price = normalize_price(price_data["price"], price_data["exchange"])
                except Exception as e2:
                    print(f"Error fetching price for {h['symbol']}: {e2}")
                    price = 0  # Default to 0 if all fails
        else:
            # Original behavior - direct API call
            price_data = get_stock_price(h["symbol"])
            price = normalize_price(price_data["price"], price_data["exchange"])
        
        value = price * h["quantity"]
        total_value += value
        position_values[h["symbol"]] = value

    # Avoid division by zero
    if total_value == 0:
        return {
    "risk_level": "LOW",
    "diversification_score": 0,
    "largest_position": "",
    "largest_position_percent": 0,
    "total_positions": 0
}

    # Calculate position percentages
    percentages = {}

    for symbol, value in position_values.items():
        percentages[symbol] = (value / total_value) * 100

    largest_symbol = max(percentages, key=lambda x: percentages[x])
    largest_percent = percentages[largest_symbol]

    # Diversification score
    diversification_score = 100 - largest_percent

    # Risk classification
    if largest_percent > 50:
        risk_level = "HIGH"
    elif largest_percent > 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "diversification_score": round(diversification_score, 2),
        "largest_position": largest_symbol,
        "largest_position_percent": round(largest_percent, 2),
        "total_positions": len(holdings)
    }