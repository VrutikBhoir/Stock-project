from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ⚠️ PREDICTION-ONLY MODE: Real trading disabled
# This platform is for AI prediction analysis and learning only.
# NO real trades, NO cash deductions, NO portfolio mutations.

class TradeRequest(BaseModel):
    user_id: str = Field(..., description="Supabase User ID")
    symbol: str = Field(..., min_length=1, description="Stock Ticker Symbol")
    quantity: int = Field(..., gt=0, description="Quantity to trade")

@router.post("/buy")
def buy_stock(req: TradeRequest):
    """
    Buy a stock - DISABLED IN PREDICTION-ONLY MODE
    This endpoint is intentionally disabled.
    Use the /predict API to run prediction analysis instead.
    """
    raise HTTPException(
        status_code=403,
        detail={
            "error": "Real trading is disabled",
            "message": "This is a PREDICTION-ONLY platform for AI analysis and learning. No real money or trades.",
            "advice": "Use the prediction engine to analyze stocks instead. Navigate to /predict"
        }
    )

@router.post("/sell")
def sell_stock(req: TradeRequest):
    """
    Sell a stock - DISABLED IN PREDICTION-ONLY MODE
    This endpoint is intentionally disabled.
    Use the /predict API to run prediction analysis instead.
    """
    raise HTTPException(
        status_code=403,
        detail={
            "error": "Real trading is disabled",
            "message": "This is a PREDICTION-ONLY platform for AI analysis and learning. No real money or trades.",
            "advice": "Use the prediction engine to analyze stocks instead. Navigate to /predict"
        }
    )
