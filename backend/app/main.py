"""
Backend/app/main.py - Refactored for Clean Architecture
========================================================

Clean separation of concerns:
- FastAPI app initialization
- Router inclusion (NOT direct ML/service logic)
- Middleware setup
- Health checks

All ML and service logic is in backend/app/services/ml/ and backend/app/api/
"""

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
import asyncio
import hashlib
import json
import logging
import math
import secrets
import time

from fastapi import FastAPI, HTTPException, Request, Depends, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, root_validator, EmailStr
import pandas as pd

try:
    import numpy as np
    _NUMPY_TYPES = (np.floating, np.integer, np.bool_)
except Exception:
    np = None
    _NUMPY_TYPES = ()

# ============================================================================
# IMPORTS: Services (ML-free zone for main.py)
# ============================================================================

from app.db import supabase
from app.config import get_settings
from app.utils import RateLimiter, cache_manager

# Import routers (ONLY API layer, not ML)
from app.api import risk
try:
    from app.api import narrative
except ImportError:
    narrative = None

try:
    from app.api import portfolio
except ImportError:
    portfolio = None

# Import services
from app.services.data_processor import DataProcessor
from app.services.technical_indicators import TechnicalIndicators
from app.services.model_trainer import ModelTrainer
from app.services.advisor import Advisor

# ⚠️ ONLY import for direct use, NOT at module level in functions
from app.services.ml.price_predictor import predict_price as ml_predict_price
from app.services.ml.event_impact_predict import predict_event

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(name)s"}'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

AUTH_FILE = Path(__file__).parent / "users.json"
AUTH_FILE.touch(exist_ok=True)

PREDICTION_CACHE = {}
CACHE_TTL = 300  # 5 minutes

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================


def _load_users() -> Dict[str, Any]:
    """Load users from file-based store"""
    try:
        content = AUTH_FILE.read_text().strip()
        if not content:
            return {"users": []}
        return json.loads(content)
    except Exception:
        return {"users": []}


def _save_users(data: Dict[str, Any]):
    """Save users to file-based store"""
    AUTH_FILE.write_text(json.dumps(data, indent=2))


def _clean_json(value: Any) -> Any:
    """Recursively convert NaN/Inf values to None and unwrap numpy scalars."""
    if isinstance(value, dict):
        return {k: _clean_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clean_json(v) for v in value]
    if np is not None and isinstance(value, _NUMPY_TYPES):
        value = value.item()
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def _hash_password(pw: str, salt: Optional[str] = None) -> Dict[str, str]:
    """Hash password with salt"""
    salt = salt or secrets.token_hex(8)
    h = hashlib.sha256((salt + pw).encode()).hexdigest()
    return {"salt": salt, "hash": h}


# ============================================================================
# LIFESPAN CONTEXT MANAGER
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown"""
    # Startup
    logger.info("Starting up Stock Predictor API")
    cache_manager.initialize()
    logger.info("Cache manager initialized")
    
    # ML Models are lazy-loaded (not preloaded at startup)
    # This prevents crashes if models are missing
    logger.info("App startup complete - ready for requests")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Stock Predictor API")
    cache_manager.clear()
    logger.info("Cleanup complete")


# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Stock Predictor API",
    description="Comprehensive stock analysis and prediction API with ML models",
    version="2.0.0",
    docs_url="/api/docs" if get_settings().environment != "production" else None,
    redoc_url="/api/redoc" if get_settings().environment != "production" else None,
    lifespan=lifespan
)

# ============================================================================
# ROUTER REGISTRATION (CLEAN ARCHITECTURE)
# ============================================================================

# Risk API Router
app.include_router(
    risk.router,
    tags=["Risk & Prediction"]
)

# Narrative API Router
if narrative:
    app.include_router(
        narrative.router,
        prefix="/api/narrative",
        tags=["Narrative"]
    )

# Portfolio API Router
if portfolio:
    app.include_router(
        portfolio.router,
        prefix="/api/trade",
        tags=["Trade"]
    )

# ============================================================================
# MIDDLEWARE SETUP
# ============================================================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset", "X-Process-Time"]
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"{request.method} {request.url.path} - {process_time:.3f}s")
    return response


# ============================================================================
# SERVICE INITIALIZATION (Lazy where possible)
# ============================================================================

data_processor = DataProcessor()
technicals = TechnicalIndicators()
trainer = ModelTrainer()
advisor = Advisor()

# Rate limiters
rate_limiter_standard = RateLimiter(requests_limit=30, time_window=60)
rate_limiter_ml = RateLimiter(requests_limit=10, time_window=60)
rate_limiter_batch = RateLimiter(requests_limit=5, time_window=60)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class HealthResponse(BaseModel):
    status: str
    timestamp: str


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class FetchDataRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol", min_length=1)
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format", min_length=1)
    end_date: str = Field(..., description="End date in YYYY-MM-DD format", min_length=1)
    
    @validator('ticker')
    def validate_ticker(cls, v):
        if not v or not v.strip():
            raise ValueError('Ticker cannot be empty')
        return v.strip().upper()


# ============================================================================
# CORE ENDPOINTS
# ============================================================================


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Stock Price Predictor",
        "status": "Backend running",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/health",
        "main_endpoints": {
            "ai_prediction": "POST /api/predict-ai",
            "risk_analysis": "POST /api/predict-risk-custom",
            "health_check": "GET /health"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "Backend running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/predict/{symbol}", dependencies=[Depends(rate_limiter_standard)])
async def predict_endpoint(symbol: str = Query(..., min_length=1)):
    """Quick prediction endpoint for a stock symbol"""
    try:
        symbol = symbol.upper().strip()
        result = ml_predict_price(symbol, steps=10)
        return _clean_json({
            "symbol": symbol,
            "prediction": result,
            "success": True
        })
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-db")
async def test_db():
    """Test database connection"""
    try:
        response = supabase.table("profiles").select("*").limit(1).execute()
        return {"database": "connected", "sample_query": response.data}
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/live-price/{ticker}", dependencies=[Depends(rate_limiter_standard)])
async def live_price(ticker: str):
    """Get live price for a ticker"""
    try:
        from app.services.alpha_vintage import get_live_price
        ticker = ticker.upper().strip()
        price, timestamp = get_live_price(ticker)
        return {
            "ticker": ticker,
            "price": price,
            "timestamp": timestamp.isoformat() if timestamp else None
        }
    except Exception as e:
        logger.error(f"Live price error for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fetch-data", dependencies=[Depends(rate_limiter_standard)])
async def fetch_data(request: FetchDataRequest):
    """Fetch historical stock data"""
    try:
        df = data_processor.fetch_stock_data(
            request.ticker,
            pd.to_datetime(request.start_date).date(),
            pd.to_datetime(request.end_date).date()
        )
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {request.ticker}")
        
        return {
            "ticker": request.ticker,
            "data": df.tail(10).to_dict(orient='records'),
            "row_count": len(df)
        }
    except Exception as e:
        logger.error(f"Fetch data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Exception Handlers
# ============================================================================


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


# Export app for deployment
__all__ = ["app"]
