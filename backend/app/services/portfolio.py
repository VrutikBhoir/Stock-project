from app.db import supabase
from app.services.data_processor import DataProcessor
import logging

logger = logging.getLogger(__name__)

class PortfolioService:
    def __init__(self):
        self.data_processor = DataProcessor()

    def get_portfolio(self, user_id: str):
        """Fetch portfolio cash balance for a user."""
        try:
            response = supabase.table("portfolios").select("*").eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching portfolio for {user_id}: {e}")
            return None

    def get_positions(self, user_id: str):
        """Fetch all positions for a user."""
        try:
            response = supabase.table("positions").select("*").eq("user_id", user_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching positions for {user_id}: {e}")
            return []

    def buy_stock(self, user_id: str, symbol: str, quantity: int):
        """Execute a buy order."""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        symbol = symbol.upper()
        
        # 1. Get live price
        price = self.data_processor.get_live_price(symbol)
        if price is None:
            raise ValueError(f"Could not fetch live price for {symbol}")
        
        total_cost = price * quantity

        # 2. Check balance
        portfolio = self.get_portfolio(user_id)
        if not portfolio:
             # Create portfolio if not exists (for new users) with 0 balance or handle elsewhere? 
             # Prompt implies "New users start with initial cash (trigger)". 
             # Assuming triggers handle creation or 0 balance.
             # Let's check if it exists, if not, maybe error or assume 0?
             # For robustness, if no portfolio, we can't buy.
             raise ValueError("User portfolio not found")

        current_cash = portfolio.get("cash_balance", 0.0)
        
        if current_cash < total_cost:
            raise ValueError(f"Insufficient funds. Required: ${total_cost:.2f}, Available: ${current_cash:.2f}")

        # 3. Execute Trade (Atomic-ish via Supabase)
        # We'll do it in steps since we don't have stored procs easily definable here without SQL access.
        # Ideally this should be a stored procedure or transaction.
        
        # Deduct cash
        new_balance = current_cash - total_cost
        supabase.table("portfolios").update({"cash_balance": new_balance}).eq("user_id", user_id).execute()

        # Update Position
        # Check if position exists
        pos_resp = supabase.table("positions").select("*").eq("user_id", user_id).eq("symbol", symbol).execute()
        positions = pos_resp.data
        
        if positions and len(positions) > 0:
            # Update existing
            current_pos = positions[0]
            old_qty = current_pos["quantity"]
            old_avg = current_pos["avg_buy_price"]
            
            new_qty = old_qty + quantity
            # New Avg = ((Old Qty * Old Avg) + (New Qty * New Price)) / Total Qty
            new_avg = ((old_qty * old_avg) + (quantity * price)) / new_qty
            
            supabase.table("positions").update({
                "quantity": new_qty,
                "avg_buy_price": new_avg
            }).eq("id", current_pos["id"]).execute()
        else:
            # Insert new
            supabase.table("positions").insert({
                "user_id": user_id,
                "symbol": symbol,
                "quantity": quantity,
                "avg_buy_price": price
            }).execute()

        return {
            "status": "success",
            "type": "buy",
            "symbol": symbol,
            "quantity": quantity,
            "price": price,
            "total_cost": total_cost,
            "new_balance": new_balance
        }

    def sell_stock(self, user_id: str, symbol: str, quantity: int):
        """Execute a sell order."""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        symbol = symbol.upper()

        # 1. Check Position
        pos_resp = supabase.table("positions").select("*").eq("user_id", user_id).eq("symbol", symbol).execute()
        positions = pos_resp.data
        
        if not positions or len(positions) == 0:
            raise ValueError(f"No position found for {symbol}")
        
        current_pos = positions[0]
        current_qty = current_pos["quantity"]
        
        if current_qty < quantity:
            raise ValueError(f"Insufficient quantity. Held: {current_qty}, Selling: {quantity}")

        # 2. Get live price
        price = self.data_processor.get_live_price(symbol)
        if price is None:
            raise ValueError(f"Could not fetch live price for {symbol}")

        total_credit = price * quantity

        # 3. Update Portfolio
        portfolio = self.get_portfolio(user_id)
        if not portfolio:
             raise ValueError("User portfolio not found")
             
        current_cash = portfolio.get("cash_balance", 0.0)
        new_balance = current_cash + total_credit
        
        supabase.table("portfolios").update({"cash_balance": new_balance}).eq("user_id", user_id).execute()

        # 4. Update Position
        new_qty = current_qty - quantity
        
        if new_qty == 0:
            # Delete position
            supabase.table("positions").delete().eq("id", current_pos["id"]).execute()
        else:
            # Update quantity (Avg buy price doesn't theoretically change on sell, 
            # though some accounting methods differ, standard FIFO/Weighted often keeps it same until depletion or new buy)
            supabase.table("positions").update({
                "quantity": new_qty
            }).eq("id", current_pos["id"]).execute()

        return {
            "status": "success",
            "type": "sell",
            "symbol": symbol,
            "quantity": quantity,
            "price": price,
            "total_credit": total_credit,
            "new_balance": new_balance
        }
