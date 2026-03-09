def generate_ai_advice(stocks):

    advice = []

    for s in stocks:

        pnl = s["current_price"] - s["avg_price"]

        # percentage change
        change_percent = (pnl / s["avg_price"]) * 100

        if change_percent < -10:
            recommendation = "SELL"
            reason = "Stock has dropped more than 10% below your buy price."

        elif change_percent < -3:
            recommendation = "HOLD"
            reason = "Stock slightly below buy price. Wait for recovery."

        elif change_percent > 10:
            recommendation = "BOOK PROFIT"
            reason = "Stock has gained more than 10%. Consider taking profits."

        else:
            recommendation = "HOLD"
            reason = "Stock within normal fluctuation range."

        advice.append({
            "symbol": s["symbol"],
            "recommendation": recommendation,
            "reason": reason,
            "current_price": s["current_price"],
            "avg_price": s["avg_price"],
            "profit_loss_percent": round(change_percent, 2)
        })

    return advice