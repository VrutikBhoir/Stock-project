import time
from backend.app.db import supabase
from backend.app.services.price_service import get_stock_price, normalize_price
from backend.app.services.portfolio_engine import sell_stock

# Cache for prices (30s TTL)
_PRICE_CACHE = {}
_CACHE_TTL = 30

def _get_cached_price(symbol: str) -> float:
    """Get stock price with caching"""
    now = time.time()
    if symbol in _PRICE_CACHE:
        price, timestamp = _PRICE_CACHE[symbol]
        if now - timestamp < _CACHE_TTL:
            return price
    
    price_data = get_stock_price(symbol)
    price = normalize_price(price_data["price"], price_data["exchange"])
    _PRICE_CACHE[symbol] = (price, now)
    return price


def check_stop_losses():
    """Check and execute stop loss orders - only for holdings with stop loss set"""
    try:
        # Fetch all holdings and filter in Python (simpler than complex DB query)
        holdings = supabase.table("holdings") \
            .select("*") \
            .limit(500) \
            .execute()

        for holding in holdings.data or []:
            stop_loss = holding.get("stop_loss")
            if not stop_loss:  # Skip if no stop loss set
                continue

            symbol = holding["symbol"]
            user_id = holding["user_id"]

            try:
                current_price = _get_cached_price(symbol)

                if current_price <= float(stop_loss):
                    quantity = holding["quantity"]
                    print(f"🛑 STOP LOSS TRIGGERED for {symbol} at {current_price}")
                    sell_stock(user_id, symbol, quantity)

            except Exception as e:
                print(f"Stop loss check error for {symbol}: {e}")
    except Exception as e:
        print(f"Stop loss monitor error: {e}")


def run_stop_loss_monitor():

    while True:

        check_stop_losses()

        time.sleep(120)  # check every 2 minutes (was 20s, too frequent)