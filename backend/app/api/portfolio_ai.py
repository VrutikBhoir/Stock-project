from fastapi import APIRouter
from backend.app.db import supabase
from backend.app.services.price_service import get_stock_price, normalize_price
from backend.app.services.ai_portfolio_advisor import generate_ai_advice

router = APIRouter()


@router.get("/portfolio/ai-advice/{user_id}")
def ai_advice(user_id: str):

    holdings = supabase.table("holdings") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()

    stocks = []

    for h in holdings.data or []:

        price_data = get_stock_price(h["symbol"])
        price = normalize_price(price_data["price"], price_data["exchange"])

        stocks.append({
            "symbol": h["symbol"],
            "quantity": h["quantity"],
            "avg_price": h["avg_price"],
            "current_price": price
        })

    return generate_ai_advice(stocks)