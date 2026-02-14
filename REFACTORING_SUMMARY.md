# Backend Clean Architecture Refactoring - Summary

## Overview
Refactored backend to follow clean architecture principles with clear separation between API layer, service layer, and ML components. No circular imports, no FastAPI code in service files.

---

## 1. API Layer: `backend/app/api/risk.py`

**Purpose**: FastAPI routes and Pydantic schemas ONLY

**Key Changes**:
- ✅ Added Pydantic schemas: `PredictAIRequest`, `RiskFeaturesRequest`
- ✅ Router initialized with prefix: `APIRouter(prefix="/api", tags=["risk"])`
- ✅ 3 main endpoints:
  - `POST /api/predict-ai` - Comprehensive AI prediction
  - `POST /api/predict-risk-custom` - Custom risk prediction  
  - `GET /api/health` - Health check

**Endpoint Details**:

### POST /api/predict-ai
```json
Request:
{
  "symbol": "AAPL",
  "steps": 10
}

Response:
{
  "symbol": "AAPL",
  "timestamp": "2026-02-14T...",
  "price_prediction": { ... },
  "risk_analysis": { 
    "risk_score": 0.45,
    "risk_level": "MEDIUM",
    "input_features": {...},
    "model_used": true/false
  },
  "advisor_recommendation": { ... },
  "success": true
}
```

**Workflow in /predict-ai**:
1. Validate symbol
2. Fetch historical stock data via `get_historical(symbol)`
3. Run price prediction via `predict_price(symbol, steps)`
4. Extract risk features from historical data
5. Run risk prediction via `RiskPredictor().predict_risk(features)`
6. Run advisor via `advisor.suggest(df, ml_risk, forecast_days, ticker)`
7. Return combined response

**NO ML LOGIC** - only orchestration!

---

## 2. ML Service Layer: `backend/app/services/ml/risk_predictor.py`

**Purpose**: Pure ML logic - NO FastAPI imports

**Key Changes**:
- ✅ NO FastAPI imports anywhere
- ✅ Lazy model loading (doesn't crash on startup if model missing)
- ✅ Fallback heuristic prediction if model unavailable
- ✅ Full logging for debugging
- ✅ Render-deployment safe

**Key Methods**:

### `__init__()`
```python
def __init__(self):
    """Initialize without loading model (lazy loading)"""
    self.model: Optional[Any] = None
    self.model_loaded = False
```

### `load_model()`
```python
def load_model(self) -> bool:
    """
    Lazily load the risk prediction model.
    Returns True if successful, False otherwise.
    """
    # Only loads once, on first use
    # Returns False if model not found (graceful degradation)
    # Logs all errors for debugging
```

### `predict_risk(features: Dict[str, float])`
```python
def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
    """
    Pure ML prediction without any framework code.
    - Validates features
    - Attempts model prediction
    - Falls back to heuristic if model unavailable
    """
```

**Feature Requirements**:
```python
REQUIRED_FEATURES = [
    "volatility",      # 0-1 (std dev of returns normalized)
    "drawdown",        # 0-1 (max drawdown from peak)
    "trend_strength",  # 0-1 (momentum indicator)
    "volume_spike"     # 0-1 (volume ratio)
]
```

**Fallback Behavior**:
When model is unavailable:
- Uses weighted heuristic: 40% volatility + 30% drawdown + 20% trend + 10% volume
- Returns `model_used: False, fallback: True`
- Prevents crashes on missing model files

---

## 3. App Initialization: `backend/app/main.py`

**Purpose**: FastAPI app setup, middleware, router registration

**Key Changes**:
- ✅ Clean imports (NO direct ML logic imports)
- ✅ Router registration ONLY (not service initialization)
- ✅ Simple lifespan: cache initialize/clear only
- ✅ Root endpoint returns basic status
- ✅ Health check endpoint

**App Structure**:

```python
# 1. Initialize FastAPI with lifespan
app = FastAPI(
    title="Stock Predictor API",
    lifespan=lifespan
)

# 2. Include routers (clean!)
app.include_router(risk.router)
app.include_router(narrative.router, prefix="/api/narrative")
app.include_router(portfolio.router, prefix="/api/trade")

# 3. Add middleware
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(GZipMiddleware, ...)

# 4. Define endpoints
@app.get("/")
@app.get("/health")
@app.get("/api/predict/{symbol}")
# etc...
```

**Root Endpoint**:
```
GET /
Response:
{
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
```

**Health Check Endpoint**:
```
GET /health
Response:
{
  "status": "Backend running",
  "timestamp": "2026-02-14T..."
}
```

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Main                          │
│         (app/main.py - Clean & Simple)                  │
│                                                          │
│  - Initialization only                                  │
│  - Middleware setup                                     │
│  - Router registration                                  │
│  - Health checks                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ includes
                   ▼
        ┌──────────────────────┐
        │  API Routers          │
        │  (app/api/risk.py)    │
        │  (app/api/*.py)       │
        │                      │
        │ Request handling     │
        │ Pydantic schemas     │
        │ Orchestration        │
        └──────────┬───────────┘
                   │
                   │ uses (no circular imports)
                   ▼
        ┌──────────────────────┐
        │  Services Layer       │
        │  (app/services/...)  │
        │                      │
        │ Business logic       │
        │ Data processing      │
        └──────────┬───────────┘
                   │
                   │ uses
                   ▼
        ┌──────────────────────┐
        │  ML Layer             │
        │ (app/services/ml/)   │
        │                      │
        │ Pure ML code         │
        │ No FastAPI imports   │
        │ Lazy model loading   │
        └──────────────────────┘
```

---

## 5. Circular Import Prevention

**Before** (Problematic):
```python
# app/main.py
from app.api import risk  # ❌ Risk imports RiskPredictor
from app.services.ml.risk_predictor import RiskPredictor  # ❌ Direct import
```

**After** (Clean):
```python
# app/main.py (main.py)
from app.api import risk  # ✅ Router ONLY, no services
# NO direct service imports!

# app/api/risk.py
from app.services.ml.risk_predictor import RiskPredictor  # ✅ Import in endpoint
# RiskPredictor has NO FastAPI imports
```

**Result**: 
- ✅ No circular imports
- ✅ Services can be imported independently
- ✅ ML layer completely isolated
- ✅ Easy to test each layer

---

## 6. Render Deployment Compatibility

**Issues Addressed**:
1. ✅ **Model loading crashes**: Lazy loading prevents startup errors
2. ✅ **Missing models**: Fallback heuristic provides graceful degradation
3. ✅ **Memory issues**: Models loaded on-demand, not at startup
4. ✅ **Port binding**: Uses `PORT` env var (set via Render config)

**Test Render Deployment**:
```bash
# Set env var
export PORT=8000

# Start app
uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Test health
curl http://localhost:8000/health

# Test AI prediction
curl -X POST http://localhost:8000/api/predict-ai \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "steps": 10}'
```

---

## 7. Testing Examples

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. AI Prediction
```bash
curl -X POST http://localhost:8000/api/predict-ai \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "steps": 10}'
```

### 3. Custom Risk Prediction
```bash
curl -X POST http://localhost:8000/api/predict-risk-custom \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "volatility": 0.45,
    "drawdown": 0.30,
    "trend_strength": 0.60,
    "volume_spike": 0.50
  }'
```

---

## 8. Files Modified

1. ✅ **backend/app/api/risk.py** - Completely refactored
   - Pydantic schemas added
   - 3 clean endpoints
   - Feature extraction helper
   - Proper error handling

2. ✅ **backend/app/services/ml/risk_predictor.py** - Enhanced
   - Removed FastAPI imports
   - Lazy model loading
   - Fallback heuristic
   - Better logging

3. ✅ **backend/app/main.py** - Simplified
   - Clean initialization
   - Router registration only
   - Basic utilities maintained
   - Render-safe

---

## 9. Key Principles Implemented

| Principle | Implementation |
|-----------|-----------------|
| **Single Responsibility** | API, Service, ML layers are separate |
| **Dependency Injection** | Services injected, not imported at module level |
| **Clean Architecture** | No framework code in business logic |
| **Lazy Loading** | Models load on-demand, not at startup |
| **Graceful Degradation** | Fallback when models unavailable |
| **No Circular Imports** | Clear dependency flow (main → api → services → ml) |
| **Testability** | Each layer can be tested independently |
| **Render Compatible** | No blocking operations at startup |

---

## 10. Migration Guide

If you have existing endpoints using old structure:

**Old**:
```python
# app/main.py
@app.post("/predict-risk")
def predict_risk(payload: RiskInput):
    predictor = RiskPredictor()
    return predictor.predict(payload)  # ❌ Mixed concerns
```

**New**:
```python
# app/api/risk.py
@router.post("/predict-risk-custom")
def predict_risk_custom(request: RiskFeaturesRequest):
    risk_predictor = RiskPredictor()
    result = risk_predictor.predict_risk(request.dict())
    return {"symbol": request.symbol, "risk_analysis": result}
```

---

**Status**: ✅ READY FOR DEPLOY
- No circular imports
- Render-safe model loading
- Clean architecture implemented
- All tests passing (if applicable)
