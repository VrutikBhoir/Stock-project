from fastapi import APIRouter, HTTPException
from backend.app.services.portfolio_engine import buy_stock, sell_stock
from backend.app.db import supabase
from backend.app.services.price_service import get_stock_price, normalize_price
from pydantic import BaseModel
from typing import Optional
import time
import functools
from backend.app.services.portfolio_engine import get_or_create_account
from backend.app.services.portfolio_risk_engine import calculate_portfolio_risk
# Simple in-memory price cache (30 second TTL)
_PRICE_CACHE = {}
_PRICE_CACHE_TTL = 30

# Retry configuration
_RETRY_MAX_ATTEMPTS = 3
_RETRY_INITIAL_DELAY = 0.5  # seconds
_RETRY_BACKOFF = 2.0  # exponential backoff multiplier

class BuyRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    stop_loss: Optional[float] = None


class SellRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int


def _retry_on_connection_error(func):
    """Decorator to retry database operations on connection errors"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        delay = _RETRY_INITIAL_DELAY
        last_error = None

        for attempt in range(_RETRY_MAX_ATTEMPTS):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_str = str(e).lower()

                if "forcibly closed" in error_str or "connection" in error_str or "timeout" in error_str:
                    last_error = e

                    if attempt < _RETRY_MAX_ATTEMPTS - 1:
                        print(f"[RETRY] Attempt {attempt+1}/{_RETRY_MAX_ATTEMPTS} failed: {e}")
                        time.sleep(delay)
                        delay *= _RETRY_BACKOFF
                    else:
                        print("[ERROR] All retry attempts failed")
                else:
                    raise

        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed after {_RETRY_MAX_ATTEMPTS} attempts: {str(last_error)}"
        )

    return wrapper

def _get_cached_price(symbol: str) -> float:
    """Get INR-normalized stock price with 30-second caching."""
    try:
        now = time.time()
        if symbol in _PRICE_CACHE:
            price, timestamp = _PRICE_CACHE[symbol]
            if now - timestamp < _PRICE_CACHE_TTL:
                return price  # Cache hit

        # Cache miss - fetch fresh price (with timeout)
        price_data = get_stock_price(symbol)

        # Portfolio metrics are tracked in INR; convert USD symbols before storing/returning.
        current_price = normalize_price(price_data["price"], price_data["exchange"])
        _PRICE_CACHE[symbol] = (current_price, now)
        return current_price
    except Exception as e:
        # If price fetch fails, return cached price if available, otherwise return 0
        if symbol in _PRICE_CACHE:
            cached_price, _ = _PRICE_CACHE[symbol]
            print(f"[WARN] Using stale cache for {symbol} due to: {e}")
            return cached_price
        print(f"[ERROR] Failed to fetch price for {symbol}: {e}")
        raise  # Re-raise to let caller handle


router = APIRouter()

@router.get("/portfolio/test")
def test_endpoint():
    return {"status": "portfolio router working", "message": "If you see this, routing is correct"}

@router.get("/portfolio/all/{user_id}")
def get_all_portfolio_data(user_id: str):
    """Optimized endpoint to fetch all portfolio data in a single call"""
    try:
        # Fetch all holdings first
        holdings_res = supabase.table("holdings") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        holdings_data = holdings_res.data or []
        
        # Build results
        holdings_list = []
        errors = []
        
        for stock in holdings_data:
            try:
                current_price = _get_cached_price(stock["symbol"])
                pnl = (current_price - stock["avg_price"]) * stock["quantity"]
                holdings_list.append({
                    "symbol": stock["symbol"],
                    "quantity": stock["quantity"],
                    "avg_price": stock["avg_price"],
                    "current_price": current_price,
                    "profit_loss": pnl
                })
            except Exception as e:
                errors.append(f"Error processing {stock['symbol']}: {str(e)}")
                print(f"[ERROR] {e}")
        
        if errors:
            print(f"[WARN] Some holdings had errors: {errors}")
        
        return {
            "holdings": holdings_list,
            "status": "partial_success" if errors else "success",
            "errors": errors
        }
    except Exception as e:
        print(f"Error in get_all_portfolio_data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio data: {str(e)}")

@router.post("/portfolio/buy")
def buy(data: BuyRequest):
    """Execute a buy order"""
    # Validate inputs
    if not data.user_id or not data.symbol:
        raise HTTPException(status_code=400, detail="Missing user_id or symbol")
    
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    if data.stop_loss is not None:
        if not isinstance(data.stop_loss, (int, float)) or data.stop_loss <= 0:
            raise HTTPException(status_code=400, detail="Invalid stop loss value")

    try:
        result = buy_stock(
            data.user_id,
            data.symbol,
            data.quantity,
            data.stop_loss
        )
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid value: {str(exc)}")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Buy failed: {str(exc)}")

@router.post("/portfolio/sell")
def sell(data: SellRequest):

    return sell_stock(
        data.user_id,
        data.symbol,
        data.quantity
    )

@router.get("/portfolio/holdings/{user_id}")
@_retry_on_connection_error
def get_holdings(user_id: str):
    try:
        print(f"[DEBUG] get_holdings called for user_id: {user_id}")
        holdings = supabase.table("holdings")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        print(f"[DEBUG] Holdings query result: {holdings.data}")

        result = []
        holdings_data = holdings.data or []

        for stock in holdings_data:
            print(f"[DEBUG] Processing holding: {stock}")
            current_price = _get_cached_price(stock["symbol"])  # Use cached price
            pnl = (current_price - stock["avg_price"]) * stock["quantity"]

            result.append({
                "symbol": stock["symbol"],
                "quantity": stock["quantity"],
                "avg_price": stock["avg_price"],
                "current_price": current_price,
                "profit_loss": pnl
            })

        print(f"[DEBUG] Returning {len(result)} holdings")
        return result
    except Exception as e:
        print(f"Error in get_holdings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch holdings: {str(e)}")

@router.get("/portfolio/summary/{user_id}")
@_retry_on_connection_error
def get_summary(user_id: str):
    try:
        account = get_or_create_account(user_id)

        # Fetch all holdings in one query
        holdings_res = supabase.table("holdings") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()

        holdings = holdings_res.data or []

        # Calculate portfolio metrics using cached prices
        portfolio_value = 0
        total_profit = 0
        total_loss = 0

        for stock in holdings:
            current_price = _get_cached_price(stock["symbol"])  # Use cached price
            value = stock["quantity"] * current_price
            portfolio_value += value

            pnl = (current_price - stock["avg_price"]) * stock["quantity"]
            if pnl > 0:
                total_profit += pnl
            elif pnl < 0:
                total_loss += abs(pnl)

        net_pnl = total_profit - total_loss

        return {
            "cash_balance": account["cash_balance"],
            "portfolio_value": portfolio_value,
            "total_profit": total_profit,
            "total_loss": total_loss,
            "net_pnl": net_pnl,
            "profit_loss": net_pnl,
            "total_assets": portfolio_value + account["cash_balance"]
        }
    except Exception as e:
        print(f"Error in get_summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")
@router.get("/portfolio/trades/{user_id}")
@_retry_on_connection_error
def get_trades(user_id: str):
    try:
        trades = supabase.table("trades") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(100) \
            .execute()

        return trades.data or []
    except Exception as e:
        print(f"Error in get_trades: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trades: {str(e)}")
from backend.app.services.portfolio_risk_engine import calculate_portfolio_risk

@router.get("/portfolio/risk/{user_id}")
@_retry_on_connection_error
def get_portfolio_risk(user_id: str):
    try:
        risk_data = calculate_portfolio_risk(user_id, price_fetcher=_get_cached_price)
        return risk_data
    except Exception as e:
        print(f"Error in get_portfolio_risk: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate risk: {str(e)}")
@router.post("/portfolio/reset/{user_id}")
def reset_portfolio(user_id: str):

    supabase.table("holdings").delete().eq("user_id", user_id).execute()

    supabase.table("trades").delete().eq("user_id", user_id).execute()

    supabase.table("portfolio_accounts").update({
        "cash_balance": 500000
    }).eq("user_id", user_id).execute()

    return {"status": "portfolio reset"}