"""
Market Reasoning API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict
import logging

from backend.app.services.ml.market_reasoning import explain_market_signals

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market-reasoning", tags=["market-reasoning"])


class MarketReasoningRequest(BaseModel):
    """Request model for market reasoning."""
    composite_score: float = Field(..., ge=0, le=100, description="Composite score (0-100)")
    technical_score: float = Field(..., description="Technical analysis score")
    trend_score: float = Field(..., description="Trend analysis score")
    risk_score: float = Field(..., description="Risk assessment score")
    momentum_score: float = Field(..., description="Momentum analysis score")
    rsi_value: float = Field(..., ge=0, le=100, description="RSI value (0-100)")
    macd_state: str = Field(..., description="MACD state: 'Above Signal' or 'Below Signal'")
    volatility_level: str = Field(..., description="Volatility level: 'Low', 'Medium', 'High'")
    support_level: float = Field(..., description="Support price level")
    resistance_level: float = Field(..., description="Resistance price level")
    entry_zone_low: float = Field(..., description="Entry zone lower bound")
    entry_zone_high: float = Field(..., description="Entry zone upper bound")
    exit_zone_low: float = Field(..., description="Exit zone lower bound")
    exit_zone_high: float = Field(..., description="Exit zone upper bound")
    model_confidence: float = Field(..., ge=0, le=100, description="Model confidence (0-100)")
    investor_type: str = Field(..., description="Investor type: 'Conservative', 'Balanced', 'Aggressive'")
    investment_horizon: str = Field(..., description="Investment horizon: 'Short-term', 'Medium-term', 'Long-term'")


class MarketReasoningResponse(BaseModel):
    """Response model for market reasoning."""
    success: bool
    ai_reasoning: str
    key_insights: str
    investor_interpretation: str
    risk_notice: str
    decision_signal: str
    error: str = None


@router.post("/explain", response_model=MarketReasoningResponse)
async def explain_market_reasoning(request: MarketReasoningRequest) -> MarketReasoningResponse:
    """
    Explain provided market signals with AI reasoning.
    
    Takes computed scores and signals as input and provides conservative,
    investor-specific explanations without calculating new indicators.
    
    Args:
        request: MarketReasoningRequest with all computed signals
        
    Returns:
        MarketReasoningResponse with structured reasoning
    """
    try:
        # Validate inputs
        if request.composite_score < 0 or request.composite_score > 100:
            raise ValueError("Composite score must be between 0 and 100")
        
        if request.rsi_value < 0 or request.rsi_value > 100:
            raise ValueError("RSI value must be between 0 and 100")
        
        if request.model_confidence < 0 or request.model_confidence > 100:
            raise ValueError("Model confidence must be between 0 and 100")
        
        if request.macd_state not in ["Above Signal", "Below Signal"]:
            raise ValueError("MACD state must be 'Above Signal' or 'Below Signal'")
        
        if request.volatility_level not in ["Low", "Medium", "High"]:
            raise ValueError("Volatility level must be 'Low', 'Medium', or 'High'")
        
        if request.investor_type not in ["Conservative", "Balanced", "Aggressive"]:
            raise ValueError("Investor type must be 'Conservative', 'Balanced', or 'Aggressive'")
        
        if request.investment_horizon not in ["Short-term", "Medium-term", "Long-term"]:
            raise ValueError("Investment horizon must be 'Short-term', 'Medium-term', or 'Long-term'")
        
        # Validate zone relationships
        if request.entry_zone_low >= request.entry_zone_high:
            raise ValueError("Entry zone low must be less than high")
        
        if request.exit_zone_low >= request.exit_zone_high:
            raise ValueError("Exit zone low must be less than high")
        
        if request.support_level >= request.resistance_level:
            raise ValueError("Support level must be less than resistance level")
        
        # Call the market reasoning assistant
        reasoning = explain_market_signals(
            composite_score=request.composite_score,
            technical_score=request.technical_score,
            trend_score=request.trend_score,
            risk_score=request.risk_score,
            momentum_score=request.momentum_score,
            rsi_value=request.rsi_value,
            macd_state=request.macd_state,
            volatility_level=request.volatility_level,
            support_level=request.support_level,
            resistance_level=request.resistance_level,
            entry_zone_low=request.entry_zone_low,
            entry_zone_high=request.entry_zone_high,
            exit_zone_low=request.exit_zone_low,
            exit_zone_high=request.exit_zone_high,
            model_confidence=request.model_confidence,
            investor_type=request.investor_type,
            investment_horizon=request.investment_horizon
        )
        
        return MarketReasoningResponse(
            success=True,
            ai_reasoning=reasoning["ai_reasoning"],
            key_insights=reasoning["key_insights"],
            investor_interpretation=reasoning["investor_interpretation"],
            risk_notice=reasoning["risk_notice"],
            decision_signal=reasoning["decision_signal"]
        )
        
    except ValueError as e:
        logger.error(f"Validation error in market reasoning: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in market reasoning: {str(e)}")
        return MarketReasoningResponse(
            success=False,
            ai_reasoning="",
            key_insights="",
            investor_interpretation="",
            risk_notice="",
            decision_signal="HOLD",
            error=f"Market reasoning failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for market reasoning service."""
    return {"status": "healthy", "service": "market-reasoning"}