from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.services.ml.narrative_engine import build_market_narrative

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Narrative"])


# =============================================================================
# INPUT MODELS (Exact contract)
# =============================================================================

class InvestorProfile(BaseModel):
    """Investor profile for narrative generation."""
    type: str = Field(..., description="Conservative | Balanced | Aggressive")
    time_horizon: str = Field(..., description="Short-term | Medium-term | Long-term")
    primary_goal: str = Field(..., description="Growth | Income | Capital Preservation | Speculative")


class NarrativeRequest(BaseModel):
    """Request for market narrative generation."""
    symbol: str = Field(..., description="Stock ticker symbol")
    investor_profile: InvestorProfile = Field(..., description="Investor profile")


# =============================================================================
# OUTPUT MODELS (Exact contract)
# =============================================================================

class MarketState(BaseModel):
    """Current market state."""
    trend: str  # Uptrend | Downtrend | Sideways
    confidence: int  # 0-100
    risk_level: str  # Low | Medium | High
    volatility: str  # Low | Moderate | High | Very High
    news_sentiment: str  # Positive | Neutral | Negative


class Signals(BaseModel):
    """Market signals analysis."""
    market_bias: str  # Bullish | Neutral | Bearish
    signal_strength: str  # Weak | Moderate | Strong


class NarrativeContent(BaseModel):
    """Narrative text content."""
    headline: str
    text: str
    investor_type: str


class NarrativeResponse(BaseModel):
    """Complete narrative response."""
    symbol: str
    market_state: MarketState
    signals: Signals
    narrative: NarrativeContent


# =============================================================================
# API ENDPOINT
# =============================================================================

@router.post("/generate", response_model=NarrativeResponse)
def generate_narrative(request: NarrativeRequest) -> NarrativeResponse:
    """
    Generate AI market narrative.
    
    Architecture:
    1. Fetch market data (prices, trends)
    2. Fetch news sentiment
    3. Aggregate signals
    4. Reason with investor profile
    5. Generate narrative text
    
    Input: Symbol + investor profile
    Output: Complete narrative with market state, signals, and text
    """
    
    symbol = request.symbol.strip().upper()
    investor_profile = request.investor_profile.dict()
    
    # =========================================================================
    # INPUT VALIDATION (HTTP layer only)
    # =========================================================================
    
    # Validate symbol
    if not symbol or len(symbol) < 1 or len(symbol) > 20:
        raise HTTPException(
            status_code=400,
            detail="Symbol must be 1-20 characters"
        )
    
    if not all(c.isalnum() or c in ".-" for c in symbol):
        raise HTTPException(
            status_code=400,
            detail="Symbol contains invalid characters. Use letters, numbers, dots, or hyphens."
        )
    
    # Validate investor profile
    valid_types = ["Conservative", "Balanced", "Aggressive"]
    if investor_profile.get("type") not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Investor type must be one of: {', '.join(valid_types)}"
        )
    
    valid_horizons = ["Short-term", "Medium-term", "Long-term"]
    if investor_profile.get("time_horizon") not in valid_horizons:
        raise HTTPException(
            status_code=400,
            detail=f"Time horizon must be one of: {', '.join(valid_horizons)}"
        )
    
    valid_goals = ["Growth", "Income", "Capital Preservation", "Speculative"]
    if investor_profile.get("primary_goal") not in valid_goals:
        raise HTTPException(
            status_code=400,
            detail=f"Primary goal must be one of: {', '.join(valid_goals)}"
        )
    
    # =========================================================================
    # CALL ENGINE (HTTP layer delegates to engine)
    # =========================================================================
    
    try:
        logger.info(f"📊 Narrative request: {symbol} | {investor_profile['type']}")
        
        # Call narrative engine (does ALL the logic)
        result = build_market_narrative(symbol, investor_profile)
        
        logger.info(f"✅ Narrative generated: {symbol}")
        
        return NarrativeResponse(**result)
    
    except ValueError as e:
        logger.error(f"❌ Data error for {symbol}: {str(e)[:200]}")
        raise HTTPException(
            status_code=400,
            detail=str(e)[:150]
        )
    
    except Exception as e:
        logger.error(f"❌ Narrative generation failed: {str(e)[:200]}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate narrative. Please try again."
        )

