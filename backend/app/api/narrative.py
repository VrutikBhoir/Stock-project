from fastapi import APIRouter, HTTPException
from app.services.ml.narrative_engine import get_narrative_engine
from app.services.ml.price_predictor import get_prediction_with_analysis
from pydantic import BaseModel
import logging
import datetime

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Narrative"])


class NarrativeRequest(BaseModel):
    """Request for ML-driven market narrative."""
    symbol: str
    investor_type: str = "Balanced"  # Conservative, Balanced, Aggressive
    investment_horizon: str = "medium_term"  # short_term, medium_term, long_term
    investment_goal: str = None  # Growth, Income, Capital Protection, Trading


@router.post("/generate")
def generate_narrative(request: NarrativeRequest):
    """
    Generate ML-driven market narrative.
    
    Uses trained models: narrative_engine_final.pkl
    
    Features used (all numerical, symbol-agnostic):
    - confidence_score: Model confidence in prediction (0-100)
    - trend_direction: Market momentum (-1 to +1)
    - overall_score: Investment analysis score (0-100)
    - technical_score: Technical indicator strength (0-100)
    - momentum_score: Price momentum (0-100)
    - expected_return: Expected return percentage (-50 to +50)
    - volatility: Annualized volatility (0-1.0)
    
    Output: ML-predicted sentiment (Bullish/Neutral/Bearish) 
            + conviction level (High/Medium/Low)
            + investor-personalized narrative
    """
    
    symbol = request.symbol.strip().upper()
    investor_type = request.investor_type or "Balanced"
    investment_horizon = request.investment_horizon or "medium_term"
    investment_goal = request.investment_goal
    
    # Input validation - SYMBOL-AGNOSTIC (works with any valid ticker)
    if not symbol or len(symbol) < 1 or len(symbol) > 20:
        raise HTTPException(status_code=400, detail="Symbol must be 1-20 characters")
    
    # Sanitize symbol (allow letters, numbers, dots, hyphens)
    if not all(c.isalnum() or c in ".-" for c in symbol):
        raise HTTPException(status_code=400, detail="Symbol contains invalid characters. Use letters, numbers, dots, or hyphens.")
    
    if investor_type not in ["Conservative", "Balanced", "Aggressive"]:
        investor_type = "Balanced"
    
    if investment_horizon not in ["short_term", "medium_term", "long_term"]:
        investment_horizon = "medium_term"
    
    if investment_goal and investment_goal not in ["Growth", "Income", "Capital Protection", "Trading"]:
        investment_goal = None
    
    try:
        logger.info(f"📊 Narrative request: {symbol} | {investor_type} | {investment_horizon}")
        
        # Step 1: Fetch REAL market data from prediction system
        # This will fail for invalid/unavailable symbols - intentionally no fallback
        try:
            analysis_result = get_prediction_with_analysis(
                symbol=symbol,
                investment_horizon=investment_horizon
            )
        except ValueError as ve:
            # Data fetch failed - symbol doesn't exist or data unavailable
            logger.warning(f"⚠️ Market data unavailable for {symbol}: {str(ve)}")
            raise HTTPException(
                status_code=404, 
                detail=f"Cannot fetch market data for '{symbol}'. Symbol may be invalid or data source unavailable."
            )
        except Exception as data_err:
            logger.error(f"❌ Data fetch error for {symbol}: {str(data_err)[:200]}")
            # Only retry for temporary errors, not for invalid symbols
            if "Connection" in str(data_err) or "timeout" in str(data_err).lower():
                raise HTTPException(
                    status_code=503,
                    detail="Market data service temporarily unavailable. Please try again."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to analyze '{symbol}': {str(data_err)[:100]}"
                )
        
        prediction_data = analysis_result.get("prediction", {})
        analysis_data = analysis_result.get("investment_analysis", {})
        
        if not prediction_data or not analysis_data:
            logger.error(f"❌ Incomplete data for {symbol}")
            raise HTTPException(
                status_code=400,
                detail=f"Incomplete market data received for '{symbol}'. Please try again."
            )
        
        # Step 2: Generate ML-driven narrative (no fallback to rules/mock values)
        engine = get_narrative_engine()
        narrative_result = engine.generate_from_prediction(
            symbol=symbol,
            prediction_data=prediction_data,
            analysis_data=analysis_data,
            investor_type=investor_type,
            time_horizon=investment_horizon,
            investment_goal=investment_goal
        )
        
        # Log success with ML predictions
        sentiment = narrative_result.get("narrative", {}).get("sentiment", "Unknown")
        confidence = narrative_result.get("narrative", {}).get("confidence", 0)
        conviction = narrative_result.get("narrative", {}).get("conviction", "Unknown")
        logger.info(f"✅ Narrative (ML): {sentiment} (conf: {confidence}%, conviction: {conviction}) | {symbol}")
        
        # Return with timestamp
        return {
            "status": "success",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            **narrative_result
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (already formatted)
        raise
    
    except ValueError as e:
        logger.error(f"❌ Validation error for {symbol}: {str(e)[:200]}")
        raise HTTPException(status_code=400, detail=str(e)[:150])
    
    except Exception as e:
        logger.error(f"❌ Narrative generation failed for {symbol}: {str(e)[:200]}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Failed to generate narrative. Model may not be loaded. Run: python train_narrative_model.py"
        )
