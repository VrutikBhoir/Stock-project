from dotenv import load_dotenv
load_dotenv()
import os
import logging
import threading
from pathlib import Path
from dotenv import load_dotenv
# Load .env from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# Verify Alpha Vantage API key is loaded
if os.getenv("ALPHA_VANTAGE_KEY"):
    print("[OK] Alpha Vantage API key loaded successfully")
else:
    print(f"[WARN] Alpha Vantage API key not found in {env_path}")

from .services.ml.model_loader import load_all_models
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
import asyncio
import hashlib
import json
import logging
import math
import secrets
import time
import requests

from fastapi import FastAPI, HTTPException, Request, Depends, Query, Path as PathParam, WebSocket, WebSocketDisconnect, status
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
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def test():
    return {"status": "working"}

from fastapi import FastAPI

from .api.quotes import router as quotes_router

app = FastAPI()

app.include_router(quotes_router, prefix="/api/quotes")
from .db import supabase, test_connection
from .config import get_settings
from backend.app.utils import RateLimiter
from backend.app.utils import cache_manager
from backend.app.utils import get_yfinance_symbol
# Import routers (ONLY API layer, not ML)
print("[DEBUG-1] About to import app.api.risk")
from backend.app.api import risk
print("[DEBUG-2] Successfully imported app.api.risk")
from backend.app.api.hybrid import routes as hybrid_routes
print("[DEBUG-3] Successfully imported app.api.hybrid.routes")
try:
    from backend.app.api import narrative
except ImportError:
    narrative = None

try:
    from backend.app.api import portfolio
except ImportError:
    portfolio = None

try:
    from backend.app.api import market_reasoning
except ImportError:
    market_reasoning = None
print("[DEBUG-4] All optional imports completed")

# Import services
from .services.data_processor import DataProcessor
from backend.app.services.technical_indicators import TechnicalIndicators
from backend.app.services.model_trainer import ModelTrainer
from backend.app.services.advisor import Advisor

from backend.app.services.alpha_vintage import ALPHA_VANTAGE_KEY

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
SESSION_CACHE: Dict[str, Dict[str, Any]] = {}
SESSION_CACHE_TTL = 86400  # 24 hours
INTRADAY_CACHE: Dict[str, Dict[str, Any]] = {}
INTRADAY_OPEN_TTL = 20  # 20 seconds
INTRADAY_CLOSED_TTL = 1200  # 20 minutes
INTRADAY_RATE_LIMIT_BACKOFF = 300  # 5 minutes
INTRADAY_RATE_LIMIT_UNTIL: Dict[str, float] = {}
INTRADAY_MIN_CALL_INTERVAL = 30  # seconds
INTRADAY_LAST_CALL: Dict[str, float] = {}
SESSION_RATE_LIMIT_BACKOFF = 900  # 15 minutes
SESSION_RATE_LIMIT_UNTIL: Dict[str, float] = {}

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


async def _load_models_background():
    """Load ML models in background without blocking startup"""
    try:
        await asyncio.sleep(2)  # Slight delay to ensure server is responsive
        from backend.app.services.ml.hybrid.model_loader import load_models as load_hybrid_models
        await asyncio.to_thread(load_hybrid_models)
        logger.info("[OK] Hybrid forecasting models loaded in background")
    except Exception as exc:
        logger.warning("[WARN] Hybrid model background load failed: %s", exc)


# ============================================================================
# LIFESPAN CONTEXT MANAGER
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown"""
    # Startup
    logger.info("Starting up Stock Predictor API")
    
    # Test Supabase connection
    logger.info("Testing Supabase connection...")
    if test_connection():
        logger.info("[OK] Supabase connection verified")
    else:
        logger.warning("[WARN] Supabase connection test failed - will retry on first request")
    
    cache_manager.initialize()
    logger.info("Cache manager initialized")
    threading.Thread(
    target=run_stop_loss_monitor,
    daemon=True
).start()
    # Defer model loading to first use (lazy load) for faster startup
    logger.info("App startup complete - ready for requests (models load on first use)")
    
    # Background task: load models asynchronously without blocking startup
    asyncio.create_task(_load_models_background())
    
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

print("[DEBUG-5] FastAPI app created successfully")

from backend.app.api.dashboard_metrics import router as dashboard_metrics_router
print("[DEBUG-6] Imported dashboard_metrics")
app.include_router(dashboard_metrics_router)
from backend.app.api.quotes import router as quotes_router
print("[DEBUG-7] Imported quotes")
app.include_router(quotes_router)
from backend.app.api.portfolio import router as portfolio_router
print("[DEBUG-8] Imported portfolio router")

app.include_router(
    portfolio_router,
    prefix="/api/trade",
    tags=["Portfolio"]
)
from backend.app.api import portfolio_ai
print("[DEBUG-9] Imported portfolio_ai")
from backend.app.services.stop_loss_monitor import run_stop_loss_monitor
print("[DEBUG-10] Imported run_stop_loss_monitor")
import threading
# ============================================================================
# ROUTER REGISTRATION (CLEAN ARCHITECTURE)
# ============================================================================
from backend.app.api import candles

app.include_router(
    candles.router,
    prefix="/api",
    tags=["Market Candles"]
)
# Risk API Router
app.include_router(
    risk.router,
    prefix="/api",
    tags=["Risk & Prediction"]
)

app.include_router(
    hybrid_routes.router,
    prefix="/api",
    tags=["Hybrid Forecast"]
)

# Narrative API Router
if narrative:
    app.include_router(
        narrative.router,
        prefix="/api/narrative",
        tags=["Narrative"]
    )



# Market Reasoning API Router
if market_reasoning:
    app.include_router(
        market_reasoning.router,
        prefix="/api",
        tags=["Market Reasoning"]
    )
app.include_router(
    portfolio_ai.router,
    prefix="/api",
    tags=["AI Portfolio"]
)
# ============================================================================
# MIDDLEWARE SETUP
# ============================================================================

# CORS origins (comma-separated via env: CORS_ORIGINS)
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
if _cors_origins_env.strip():
    cors_origins = [origin.strip() for origin in _cors_origins_env.split(",") if origin.strip()]
else:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
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
    database: str = "ok"
    api_key: str = "ok"


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
    """Health check endpoint with database connection status"""
    db_status = "ok"
    api_key_status = "ok"
    
    # Test Supabase connection
    if not test_connection():
        db_status = "error"
    
    # Check API key
    if not os.getenv("ALPHA_VANTAGE_KEY"):
        api_key_status = "missing"
    
    return {
        "status": "Backend running",
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "api_key": api_key_status
    }


def is_us_market_open(now_et: datetime | None = None):
    """
    Determine if US stock market is currently open.
    NYSE/NASDAQ hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    """
    from datetime import datetime
    import pytz
    
    # Get current time in US Eastern Time
    et_tz = pytz.timezone('US/Eastern')
    now_et = now_et or datetime.now(et_tz)
    
    # Check if it's a weekday (0 = Monday, 6 = Sunday)
    if now_et.weekday() >= 5:  # Saturday or Sunday
        return False
    
    # Check if within trading hours (9:30 AM - 4:00 PM ET)
    market_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    
    # Basic holiday check (extend this list as needed)
    # Format: (month, day)
    us_holidays_2026 = [
        (1, 1),   # New Year's Day
        (1, 19),  # MLK Day
        (2, 16),  # Presidents' Day
        (4, 3),   # Good Friday
        (5, 25),  # Memorial Day
        (7, 3),   # Independence Day (observed)
        (9, 7),   # Labor Day
        (11, 26), # Thanksgiving
        (12, 25), # Christmas
    ]
    
    if (now_et.month, now_et.day) in us_holidays_2026:
        return False
    
    return market_open <= now_et <= market_close


def is_indian_market_open(now_ist: datetime | None = None):
    """
    Determine if Indian stock market is currently open.
    NSE/BSE hours: 9:15 AM - 3:30 PM IST, Monday-Friday
    """
    from datetime import datetime
    import pytz
    
    # Get current time in Indian Standard Time
    ist_tz = pytz.timezone('Asia/Kolkata')
    now_ist = now_ist or datetime.now(ist_tz)
    
    # Check if it's a weekday (0 = Monday, 6 = Sunday)
    if now_ist.weekday() >= 5:  # Saturday or Sunday
        return False
    
    # Check if within trading hours (9:15 AM - 3:30 PM IST)
    market_open = now_ist.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
    
    # Basic holiday check for Indian market 2026
    # Format: (month, day)
    indian_holidays_2026 = [
        (1, 26),  # Republic Day
        (3, 14),  # Holi
        (3, 25),  # Holi (Second day)
        (4, 10),  # Mahavir Jayanti
        (4, 14),  # Dr. Ambedkar Jayanti
        (4, 18),  # Good Friday
        (5, 1),   # Maharashtra Day
        (8, 15),  # Independence Day
        (10, 2),  # Gandhi Jayanti
        (11, 1),  # Diwali (Lakshmi Puja)
        (11, 2),  # Diwali Balipratipada
        (11, 15), # Guru Nanak Jayanti
        (12, 25), # Christmas
    ]
    
    if (now_ist.month, now_ist.day) in indian_holidays_2026:
        return False
    
    return market_open <= now_ist <= market_close


# List of common Indian stock symbols (without .NS suffix)
INDIAN_STOCKS = {
    "TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "MPHASIS", "PERSISTENT",
    "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", 
    "BANKBARODA", "PNB", "CANBK", "IDFCFIRSTB", "FEDERALBNK", "YESBANK",
    "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP", "AUROPHARMA", 
    "BIOCON", "LUPIN", "HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "DMART",
    "TATACONSUM", "MARICO", "DABUR", "COLPAL", "RELIANCE", "ONGC", "BPCL", "IOC",
    "ADANIGREEN", "TATAPOWER", "NTPC", "POWERGRID", "BHARTIARTL", "IDEA", 
    "TATACOMM", "ROUTE", "ZEEL", "SUNTV", "NETWORK18", "PVRINOX", "TATAMOTORS",
    "MARUTI", "BAJAJ-AUTO", "EICHERMOT", "HEROMOTOCO", "M&M", "ASHOKLEY",
    "ADANIENT", "ADANIPORTS", "LT", "ULTRACEMCO", "GRASIM", "DLF",
    "BAJFINANCE", "BAJAJFINSV", "HDFCLIFE", "SBILIFE", "ICICIGI", "MUTHOOTFIN", "CHOLAFIN"
}


def is_indian_stock(symbol: str) -> bool:
    """Check if a symbol is an Indian stock or Indian index"""
    symbol_upper = symbol.upper()
    # Check for Indian indices
    if symbol_upper in ['^NSEI', '^BSESN']:
        return True
    return symbol_upper in INDIAN_STOCKS


def get_yfinance_symbol(symbol: str) -> str:
    """
    Convert symbol to yfinance format.
    Indian stocks need .NS suffix for NSE exchange.
    Indian indices (^NSEI, ^BSESN) don't need suffix.
    """
    # Indices already have ^ prefix, don't add .NS
    if symbol.startswith('^'):
        return symbol
    # Indian stocks need .NS suffix
    if is_indian_stock(symbol):
        return f"{symbol}.NS"
    return symbol


def _fetch_alpha_intraday_series(symbol: str, interval: str, outputsize: str) -> Dict[str, Any]:
    if not ALPHA_VANTAGE_KEY:
        raise HTTPException(status_code=500, detail="Alpha Vantage API key not configured")

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_INTRADAY",
        "symbol": symbol,
        "interval": interval,
        "outputsize": outputsize,
        "apikey": ALPHA_VANTAGE_KEY,
    }

    print(f"[DEBUG] [ALPHA] Fetching {symbol} with interval={interval}, outputsize={outputsize}")
    response = requests.get(url, params=params, timeout=20)
    data = response.json()
    
    print(f"[DEBUG] [ALPHA] Response keys: {list(data.keys())}")
    if len(str(data)) < 500:
        print(f"[DEBUG] [ALPHA] Full response: {data}")

    if "Error Message" in data:
        print(f"[ERROR] [ALPHA] Error: {data['Error Message']}")
        raise HTTPException(status_code=404, detail=data["Error Message"])
    if "Note" in data:
        print(f"[WARN] [ALPHA] Rate limit: {data['Note']}")
        raise HTTPException(status_code=429, detail=data["Note"])
    if "Information" in data:
        print(f"[WARN] [ALPHA] Info message: {data['Information']}")
        raise HTTPException(status_code=429, detail=data["Information"])

    series_key = next((k for k in data.keys() if k.startswith("Time Series")), None)
    if not series_key or series_key not in data:
        print(f"[ERROR] [ALPHA] No time series key found. Available keys: {list(data.keys())}")
        raise HTTPException(status_code=500, detail="Intraday time series not found")

    series = data[series_key]
    if not series:
        print(f"[ERROR] [ALPHA] Empty series for key: {series_key}")
        raise HTTPException(status_code=404, detail="No intraday data available")

    print(f"[OK] [ALPHA] Successfully fetched {len(series)} bars")
    return series


def _parse_alpha_timestamp(ts: str) -> datetime:
    import pytz

    et_tz = pytz.timezone("US/Eastern")
    parsed = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
    return et_tz.localize(parsed)


def _intraday_fallback_payload() -> Dict[str, Any]:
    return {
        "market_open": False,
        "price": None,
        "last_trade_time": None,
        "market_status": "temporarily_unavailable",
        "status": "temporarily_unavailable",
        "ohlc": {
            "time": None,
            "open": None,
            "high": None,
            "low": None,
            "close": None,
        },
        "candle": {
            "time": None,
            "open": None,
            "high": None,
            "low": None,
            "close": None,
        },
    }


@app.get("/api/intraday")
def get_intraday_price(symbol: str = Query(...)):
    """
    Get latest intraday stock price with market-aware status.
    Returns the most recent OHLC bar and market state from Alpha Vantage.
    Falls back to yfinance for Indian stocks or when Alpha Vantage fails.
    """
    try:
        symbol = symbol.upper().strip()
        cache_key = f"intraday:{symbol}"
        rate_limit_until = INTRADAY_RATE_LIMIT_UNTIL.get(cache_key, 0)
        if time.time() < rate_limit_until:
            cached = INTRADAY_CACHE.get(cache_key)
            if cached:
                cached_payload = dict(cached.get("data", {}))
                cached_payload["rate_limited"] = True
                cached_payload["cache_age_seconds"] = round(time.time() - cached.get("ts", 0), 1)
                return cached_payload

            return _intraday_fallback_payload()

        cached = INTRADAY_CACHE.get(cache_key)
        if cached and time.time() < cached.get("expires_at", 0):
            print(f"CACHE HIT: {symbol}")
            return cached.get("data")

        last_call = INTRADAY_LAST_CALL.get(cache_key, 0)
        if time.time() - last_call < INTRADAY_MIN_CALL_INTERVAL:
            if cached:
                print(f"CACHE HIT (min-interval): {symbol}")
                return cached.get("data")
            return _intraday_fallback_payload()

        print(f"CACHE MISS -> Attempting to fetch: {symbol}")
        INTRADAY_LAST_CALL[cache_key] = time.time()

        # Try Alpha Vantage first, fallback to yfinance
        try:
            series = _fetch_alpha_intraday_series(symbol, interval="1min", outputsize="compact")
            latest_ts = max(series.keys())
            
            last_trade_time_et = _parse_alpha_timestamp(latest_ts)
            last_trade_time_utc = last_trade_time_et.astimezone(timezone.utc)

            now_utc = datetime.now(tz=timezone.utc)
            now_et = now_utc.astimezone(last_trade_time_et.tzinfo)
            data_age_minutes = (now_utc - last_trade_time_utc).total_seconds() / 60
            data_age_hours = data_age_minutes / 60

            is_market_hours = is_us_market_open(now_et=now_et)
            is_data_fresh = data_age_minutes <= 15
            market_open = bool(is_market_hours and is_data_fresh)
            market_status = "open" if market_open else "closed"

            latest_bar = series[latest_ts]
            open_price = float(latest_bar.get("1. open", 0))
            high_price = float(latest_bar.get("2. high", 0))
            low_price = float(latest_bar.get("3. low", 0))
            close_price = float(latest_bar.get("4. close", 0))

            last_trade_time_str = last_trade_time_et.strftime("%Y-%m-%d %H:%M:%S")
            
        except HTTPException as alpha_error:
            print(f"[WARN] [INTRADAY] Alpha Vantage failed for {symbol}: {alpha_error.detail}")
            print("[INFO] [INTRADAY] Trying yfinance fallback...")
            
            # Fallback to yfinance
            import yfinance as yf
            yf_symbol = get_yfinance_symbol(symbol)
            print(f"[INFO] [INTRADAY] Using yfinance symbol: {yf_symbol}")
            
            ticker = yf.Ticker(yf_symbol)
            # Get latest data
            df = ticker.history(period="1d", interval="1m")
            if df.empty:
                print(f"[ERROR] [INTRADAY] yfinance also returned empty data for {yf_symbol}")
                return _intraday_fallback_payload()
            
            # Get the most recent bar
            latest_row = df.iloc[-1]
            latest_time = df.index[-1]
            
            open_price = float(latest_row['Open'])
            high_price = float(latest_row['High'])
            low_price = float(latest_row['Low'])
            close_price = float(latest_row['Close'])
            
            last_trade_time_utc = latest_time.tz_localize('UTC') if latest_time.tz is None else latest_time.tz_convert('UTC')
            last_trade_time_str = latest_time.strftime("%Y-%m-%d %H:%M:%S")
            
            now_utc = datetime.now(tz=timezone.utc)
            data_age_minutes = (now_utc - last_trade_time_utc).total_seconds() / 60
            data_age_hours = data_age_minutes / 60
            
            # For Indian stocks, check IST market hours
            import pytz
            ist_tz = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.now(ist_tz)
            is_market_hours = is_indian_market_open(now_ist=now_ist)
            # Indian stock data can have longer delays, use 30 min threshold
            is_data_fresh = data_age_minutes <= 30
            market_open = bool(is_market_hours and is_data_fresh)
            market_status = "open" if market_open else "closed"
            
            print(f"[OK] [INTRADAY] yfinance data retrieved for {yf_symbol}")
            print(f"[INFO] [IST TIME] Current IST: {now_ist.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"[INFO] [MARKET STATUS] is_market_hours={is_market_hours}, is_data_fresh={is_data_fresh} (age={data_age_minutes:.1f}m)")
            print(f"[INFO] [FINAL STATUS] market_open={market_open}, market_status={market_status}")


        payload = {
            "time": last_trade_time_utc.isoformat(),
            "price": round(close_price, 2),
            "ohlc": {
                "time": last_trade_time_utc.isoformat(),
                "open": round(open_price, 4),
                "high": round(high_price, 4),
                "low": round(low_price, 4),
                "close": round(close_price, 4),
            },
            "candle": {
                "time": last_trade_time_utc.isoformat(),
                "open": round(open_price, 4),
                "high": round(high_price, 4),
                "low": round(low_price, 4),
                "close": round(close_price, 4),
            },
            "market_open": market_open,
            "market_status": market_status,
            "data_age_hours": round(data_age_hours, 1),
            "data_age_minutes": round(data_age_minutes, 1),
            "last_trade_time": last_trade_time_str,
            "is_market_hours": is_market_hours,
            "is_data_fresh": is_data_fresh,
        }

        ttl = INTRADAY_OPEN_TTL if market_open else INTRADAY_CLOSED_TTL
        INTRADAY_CACHE[cache_key] = {
            "ts": time.time(),
            "expires_at": time.time() + ttl,
            "data": payload,
        }
        return payload

    except HTTPException as exc:
        if exc.status_code == 429:
            INTRADAY_RATE_LIMIT_UNTIL[cache_key] = time.time() + INTRADAY_RATE_LIMIT_BACKOFF
            cached = INTRADAY_CACHE.get(f"intraday:{symbol}")
            if cached:
                print(f"CACHE HIT (rate limited): {symbol}")
                cached_payload = dict(cached.get("data", {}))
                cached_payload["rate_limited"] = True
                cached_payload["cache_age_seconds"] = round(time.time() - cached.get("ts", 0), 1)
                return cached_payload

            return _intraday_fallback_payload()
        raise
    except Exception as e:
        logger.error(f"Intraday price error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching intraday price: {str(e)}"
        )


@app.get("/api/intraday/session")
def get_intraday_session(symbol: str = Query(...)):
    """
    Get full intraday curve for the most recent trading session.
    Uses Alpha Vantage TIME_SERIES_INTRADAY and returns ordered OHLC bars.
    """
    try:
        if not ALPHA_VANTAGE_KEY:
            return []

        symbol = symbol.upper().strip()
        cache_key = f"session:{symbol}"
        rate_limit_until = SESSION_RATE_LIMIT_UNTIL.get(cache_key, 0)
        if time.time() < rate_limit_until:
            cached = SESSION_CACHE.get(cache_key)
            if cached:
                return cached.get("data", [])
            return []

        cached = SESSION_CACHE.get(cache_key)
        if cached and time.time() < cached.get("expires_at", 0):
            print(f"[CACHE] [SESSION] Returning {len(cached.get('data', []))} cached candles for {symbol}")
            return cached.get("data", [])

        print(f"[DEBUG] [SESSION] Fetching fresh data from Alpha Vantage for {symbol}")
        try:
            series = _fetch_alpha_intraday_series(symbol, interval="5min", outputsize="full")
        except HTTPException as api_error:
            print(f"[WARN] [SESSION] Alpha Vantage failed for {symbol}: {api_error.detail}. Trying yfinance fallback...")
            # Fallback to yfinance
            import yfinance as yf
            
            # Convert symbol for yfinance (add .NS for Indian stocks)
            yf_symbol = get_yfinance_symbol(symbol)
            print(f"[INFO] [SESSION] Using yfinance symbol: {yf_symbol}")
            
            ticker = yf.Ticker(yf_symbol)
            # Get last 5 days of intraday data
            df = ticker.history(period="5d", interval="5m")
            if df.empty:
                print(f"[ERROR] [SESSION] yfinance also returned empty data for {yf_symbol}")
                return []
            
            print(f"[OK] [SESSION] yfinance returned {len(df)} bars for {yf_symbol}")
            session_points = []
            for idx, row in df.iterrows():
                session_points.append({
                    "time": int(idx.timestamp()),
                    "open": round(float(row['Open']), 4),
                    "high": round(float(row['High']), 4),
                    "low": round(float(row['Low']), 4),
                    "close": round(float(row['Close']), 4),
                })
            
            if session_points:
                SESSION_CACHE[cache_key] = {
                    "ts": time.time(),
                    "expires_at": time.time() + SESSION_CACHE_TTL,
                    "data": session_points,
                }
                print(f"[CACHE] [SESSION] Cached {len(session_points)} yfinance candles for {symbol}")
            return session_points

        timestamps = list(series.keys())
        print(f"[DEBUG] [SESSION] Received {len(timestamps)} timestamps")
        if timestamps:
            latest_date = max(ts.split(" ")[0] for ts in timestamps)
            print(f"[DEBUG] [SESSION] Latest trading date: {latest_date}")
        else:
            print("[ERROR] [SESSION] No timestamps found")
            return []
        
        session_points = []

        for ts in sorted(timestamps):
            if not ts.startswith(latest_date):
                continue

            bar = series.get(ts, {})
            if not bar:
                continue

            try:
                ts_et = _parse_alpha_timestamp(ts)
                ts_utc = ts_et.astimezone(timezone.utc)
            except Exception as e:
                print(f"[WARN] [SESSION] Failed to parse timestamp {ts}: {e}")
                continue

            session_points.append({
                "time": int(ts_utc.timestamp()),
                "open": round(float(bar.get("1. open", 0)), 4),
                "high": round(float(bar.get("2. high", 0)), 4),
                "low": round(float(bar.get("3. low", 0)), 4),
                "close": round(float(bar.get("4. close", 0)), 4),
            })

        print(f"[OK] [SESSION] Built {len(session_points)} candles for {symbol}")
        
        if not session_points:
            print(f"[ERROR] [SESSION] No candles generated for {symbol}")
            return []

        SESSION_CACHE[cache_key] = {
            "ts": time.time(),
            "expires_at": time.time() + SESSION_CACHE_TTL,
            "data": session_points,
        }
        print(f"[CACHE] [SESSION] Cached {len(session_points)} candles for {symbol}")
        return session_points

    except HTTPException as exc:
        if exc.status_code == 429:
            SESSION_RATE_LIMIT_UNTIL[cache_key] = time.time() + SESSION_RATE_LIMIT_BACKOFF
        cached = SESSION_CACHE.get(f"session:{symbol}")
        if cached:
            return cached.get("data", [])
        return []
    except Exception as e:
        logger.error(f"Intraday session error: {str(e)}")
        cached = SESSION_CACHE.get(f"session:{symbol}")
        if cached:
            return cached.get("data", [])
        return []


@app.get("/api/predict/{symbol}", dependencies=[Depends(rate_limiter_standard)])
async def predict_endpoint(
    symbol: str = PathParam(min_length=1),
    steps: int = Query(10, ge=1, le=90),
    investment_horizon: str = Query("medium_term", regex="^(short_term|medium_term|long_term)$"),
):
    """Prediction endpoint - routes to ARIMA/SARIMA (short/medium) or LSTM (long_term)."""
    try:
        symbol = symbol.upper().strip()
        from backend.app.services.ml.price_predictor import (
            predict_price_by_horizon,
            analyze_investment,
        )
        prediction = predict_price_by_horizon(
            symbol,
            steps=steps,
            investment_horizon=investment_horizon,
        )
        investment_analysis = analyze_investment(
            symbol,
            investment_horizon=investment_horizon,
            prediction_data=prediction,
        )

        return _clean_json({
            "prediction": prediction,
            "investment_analysis": investment_analysis,
        })
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-ai", dependencies=[Depends(rate_limiter_standard)])
async def predict_ai_endpoint(payload: dict = None):
    """
    AI Prediction endpoint for narrative and investment analysis
    Accepts optional investor parameters for personalized analysis
    """
    try:
        symbol = payload.get("symbol", "").upper().strip() if payload else ""
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")

        from backend.app.services.ml.price_predictor import (
            predict_price_by_horizon,
            analyze_investment,
        )
        
        # Get investment parameters
        investor_type = payload.get("investor_type", "Balanced") if payload else "Balanced"
        investment_horizon = payload.get("investment_horizon", "medium_term") if payload else "medium_term"
        investment_goal = payload.get("investment_goal") if payload else None
        
        # Get prediction via horizon-aware dispatcher
        prediction = predict_price_by_horizon(
            symbol,
            steps=10,
            investment_horizon=investment_horizon,
        )
        
        # Get investment analysis with specified horizon
        investment_analysis = analyze_investment(
            symbol,
            investment_horizon=investment_horizon,
            prediction_data=prediction,
        )
        
        # Create narrative structure from investment analysis
        sentiment = "Bullish" if investment_analysis.get("recommendation", {}).get("action", "HOLD").startswith("BUY") else \
                   "Bearish" if investment_analysis.get("recommendation", {}).get("action", "HOLD").startswith("SELL") else "Neutral"
        
        recommendation = investment_analysis.get("recommendation", {}).get("action", "HOLD")
        confidence = investment_analysis.get("overall_score", 50)
        
        # Generate action guidance based on investor type and recommendation
        action_guidance = ""
        if investor_type == "Conservative":
            action_guidance = f"For conservative investors, {recommendation} strategy with focus on capital preservation."
        elif investor_type == "Aggressive":
            action_guidance = f"For aggressive investors, consider {recommendation} for potential growth opportunities."
        else:
            action_guidance = f"For balanced investors, {recommendation} maintains portfolio equilibrium."
        
        # Generate insights
        insights = [
            f"Expected return: {investment_analysis.get('expected_performance', {}).get('short_term_return', 0):.1f}% short-term",
            f"Risk level: {investment_analysis.get('risk_assessment', {}).get('level', 'MEDIUM')}",
            f"Volatility: {investment_analysis.get('risk_assessment', {}).get('volatility', 0):.2f}",
        ]
        
        narrative_response = {
            "symbol": symbol,
            "prediction": prediction,
            "investment_analysis": investment_analysis,
            "narrative": {
                "sentiment": sentiment,
                "conviction": "High" if confidence > 75 else "Medium" if confidence > 50 else "Low",
                "confidence": confidence,
                "signal_strength": investment_analysis.get("recommendation", {}).get("confidence", "medium"),
                "sections": {
                    "market_summary": investment_analysis.get("reasoning", ["Market analysis in progress"])[0],
                    "why_this_outlook": investment_analysis.get("key_insights", ["Analysis based on available data"])[0],
                    "key_factors": investment_analysis.get("key_insights", [])[:3],
                    "disclaimer": "This analysis is for educational purposes only and not financial advice."
                }
            },
            "investor_context": {
                "investor_type": investor_type,
                "recommendation": recommendation,
                "action_guidance": action_guidance,
                "insights": insights
            },
            "explainability": {
                "how_to_use": {
                    "title": "How to Use This Analysis",
                    "steps": [
                        "Review the market sentiment and conviction level",
                        "Consider your investment horizon and goals",
                        "Check the recommended action and reasoning",
                        "Evaluate risk levels and potential returns"
                    ],
                    "important_notes": [
                        "Past performance doesn't guarantee future results",
                        "Always conduct your own due diligence",
                        "Consider consulting with a financial advisor"
                    ]
                }
            }
        }
        
        return _clean_json(narrative_response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-risk-custom", dependencies=[Depends(rate_limiter_standard)])
async def predict_risk_custom_endpoint(payload: dict = None):
    """
    Event impact analysis endpoint
    Analyzes the potential market impact of events on stock prices
    """
    try:
        if not payload:
            raise HTTPException(status_code=400, detail="Request body is required")
        
        symbol = payload.get("symbol", "").upper().strip()
        event_name = payload.get("event_name", "").strip()
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        if not event_name:
            raise HTTPException(status_code=400, detail="Event name is required")

        from backend.app.services.ml.event_impact_predict import predict_event
        result = predict_event(symbol, event_name)
        
        return _clean_json(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Event impact prediction error: {str(e)}")
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
        from backend.app.services.alpha_vintage import get_live_price
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
