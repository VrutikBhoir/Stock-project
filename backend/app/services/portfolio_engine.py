from backend.app.db import supabase
from backend.app.services.price_service import get_stock_price, normalize_price

def get_or_create_account(user_id):
    account = supabase.table("portfolio_accounts") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()

    # account already exists
    if account.data:
        return account.data[0]

    # create default account with tutorial cash
    new_account = {
        "user_id": user_id,
        "cash_balance": 500000  # tutorial starting balance
    }

    created = supabase.table("portfolio_accounts") \
        .insert(new_account) \
        .execute()

    return created.data[0]
def _normalize_quantity(quantity):
    """Accept int/float/string quantity but persist as integer shares."""
    parsed = float(quantity)
    if parsed <= 0:
        raise ValueError("Quantity must be positive")
    if not parsed.is_integer():
        raise ValueError("Quantity must be a whole number")
    return int(parsed)


def buy_stock(user_id, symbol, quantity, stop_loss=None):
    quantity = _normalize_quantity(quantity)

    price_data = get_stock_price(symbol)
    price = normalize_price(price_data["price"], price_data["exchange"])
    total = price * quantity

    account = get_or_create_account(user_id)

    balance = account["cash_balance"]

    if balance < total:
        raise Exception("Insufficient funds")

    # save trade
    supabase.table("trades").insert({
        "user_id": user_id,
        "symbol": symbol,
        "trade_type": "BUY",
        "quantity": quantity,
        "price": price,
        "total_value": total,
        "stop_loss": stop_loss
    }).execute()

    # check holdings
    holding = supabase.table("holdings") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("symbol", symbol) \
        .execute()

    if holding.data:

        existing = holding.data[0]

        new_qty = existing["quantity"] + quantity

        avg_price = (
            existing["avg_price"] * existing["quantity"] +
            price * quantity
        ) / new_qty

        supabase.table("holdings") \
            .update({
                "quantity": new_qty,
                "avg_price": avg_price
            }) \
            .eq("id", existing["id"]) \
            .execute()

    else:

        supabase.table("holdings").insert({
            "user_id": user_id,
            "symbol": symbol,
            "quantity": quantity,
            "avg_price": price
        }).execute()

    # update balance
    supabase.table("portfolio_accounts") \
        .update({
            "cash_balance": balance - total
        }) \
        .eq("user_id", user_id) \
        .execute()

    return {"price": price, "total": total}

def sell_stock(user_id, symbol, quantity):
    quantity = _normalize_quantity(quantity)

    price_data = get_stock_price(symbol)
    price = normalize_price(price_data["price"], price_data["exchange"])

    holding = supabase.table("holdings") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("symbol", symbol) \
        .single() \
        .execute()

    qty = holding.data["quantity"]

    if quantity > qty:
        raise Exception("Not enough shares")

    total = price * quantity

    supabase.table("trades").insert({
        "user_id": user_id,
        "symbol": symbol,
        "trade_type": "SELL",
        "quantity": quantity,
        "price": price,
        "total_value": total
    }).execute()

    remaining = qty - quantity

    account = get_or_create_account(user_id) 
    balance = account["cash_balance"]

    if remaining <= 0:

     supabase.table("holdings") \
        .delete() \
        .eq("id", holding.data["id"]) \
        .execute()

    else:

     supabase.table("holdings") \
        .update({"quantity": remaining}) \
        .eq("id", holding.data["id"]) \
        .execute()

    supabase.table("portfolio_accounts") \
    .update({
        "cash_balance": balance + total
    }) \
    .eq("user_id", user_id) \
    .execute()

    return {"price": price, "total": total}