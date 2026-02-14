# API Endpoints Documentation

## Base URL
```
http://localhost:8000
https://<your-app>.onrender.com (Production)
```

---

## Endpoints

### 1. Health Check
**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "Backend running",
  "timestamp": "2026-02-14T20:30:15.123456"
}
```

**Status**: ✅ 200 OK

---

### 2. Root / Info
**Endpoint**: `GET /`

**Response**:
```json
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

**Status**: ✅ 200 OK

---

### 3. Comprehensive AI Prediction
**Endpoint**: `POST /api/predict-ai`

**Request**:
```json
{
  "symbol": "AAPL",
  "steps": 10
}
```

**Response** (Success):
```json
{
  "symbol": "AAPL",
  "timestamp": "2026-02-14T20:30:15.123456",
  "price_prediction": {
    "forecast": [150.2, 150.5, 151.1, 150.8, 151.3, ...],
    "lower_ci": [149.5, 149.8, 150.2, ...],
    "upper_ci": [151.0, 151.2, 152.0, ...],
    "metrics": {
      "rmse": 1.23,
      "mae": 0.95,
      "mape": 0.0065,
      "model": "ARIMA",
      "accuracy": "87%"
    }
  },
  "risk_analysis": {
    "risk_score": 0.45,
    "risk_level": "MEDIUM",
    "input_features": {
      "volatility": 0.15,
      "drawdown": 0.08,
      "trend_strength": 0.62,
      "volume_spike": 0.50
    },
    "model_used": true
  },
  "advisor_recommendation": {
    "signal": "buy",
    "confidence": 0.78,
    "reasons": [
      "RSI below 30 (oversold)",
      "MACD positive crossover",
      "Price above 200-day MA"
    ],
    "current_price": 150.0,
    "forecast": [150.2, 150.5, ...],
    "targets": {
      "entry": 150.0,
      "stop_loss": 148.5,
      "target1": 152.0,
      "target2": 155.0
    },
    "decision_summary": "Buy signal - Strong momentum with oversold conditions"
  },
  "success": true
}
```

**Error Response** (Invalid Symbol):
```json
{
  "status": "404",
  "detail": "No historical data found for symbol XYZ"
}
```

**Status Codes**:
- ✅ 200 OK (Success)
- ⚠️ 400 Bad Request (Missing symbol)
- ⚠️ 404 Not Found (No data for symbol)
- ❌ 500 Internal Server Error (Server error)

---

### 4. Custom Risk Prediction
**Endpoint**: `POST /api/predict-risk-custom`

**Request**:
```json
{
  "symbol": "AAPL",
  "volatility": 0.45,
  "drawdown": 0.30,
  "trend_strength": 0.60,
  "volume_spike": 0.50
}
```

**Field Descriptions**:
| Field | Range | Meaning |
|-------|-------|---------|
| volatility | 0-1 | Standard deviation of returns (0=stable, 1=highly volatile) |
| drawdown | 0-1 | Maximum loss from peak (0=no loss, 1=100% drop) |
| trend_strength | 0-1 | Momentum/trend strength (0=no trend, 1=strong trend) |
| volume_spike | 0-1 | Volume increase ratio (0=normal, 1=huge spike) |

**Response**:
```json
{
  "symbol": "AAPL",
  "risk_analysis": {
    "risk_score": 0.45,
    "risk_level": "MEDIUM",
    "input_features": {
      "volatility": 0.45,
      "drawdown": 0.30,
      "trend_strength": 0.60,
      "volume_spike": 0.50
    },
    "model_used": true
  },
  "success": true
}
```

**Fallback Response** (Model not available):
```json
{
  "symbol": "AAPL",
  "risk_analysis": {
    "risk_score": 0.44,
    "risk_level": "MEDIUM",
    "input_features": {
      "volatility": 0.45,
      "drawdown": 0.30,
      "trend_strength": 0.60,
      "volume_spike": 0.50
    },
    "model_used": false,
    "fallback": true,
    "note": "Using heuristic fallback (model not available)"
  },
  "success": true
}
```

**Status Codes**:
- ✅ 200 OK (Success)
- ⚠️ 400 Bad Request (Invalid features)
- ❌ 500 Internal Server Error (Server error)

---

## Error Handling

### Common Errors

**400 Bad Request**:
```json
{
  "detail": "Symbol is required"
}
```

**404 Not Found**:
```json
{
  "detail": "No historical data found for symbol FAKE123"
}
```

**500 Internal Server Error**:
```json
{
  "detail": "Connection timeout to data service"
}
```

---

## Rate Limiting

Current limits (can be modified in `main.py`):
- Standard endpoints: 30 requests/minute
- ML endpoints: 10 requests/minute  
- Batch endpoints: 5 requests/minute

**Rate Limit Headers**:
```
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1234567890
X-Process-Time: 0.234
```

---

## Curl Examples

### Health Check
```bash
curl http://localhost:8000/health
```

### AI Prediction
```bash
curl -X POST http://localhost:8000/api/predict-ai \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "steps": 10}'
```

### Custom Risk
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

## Input Validation

### Symbol Validation
- Required: Yes
- Type: String
- Format: Stock ticker (e.g., AAPL, TSLA, MSFT)
- Max length: 10 characters
- Automatically converted to UPPERCASE

### Steps Validation
- Required: No (defaults to 10)
- Type: Integer
- Range: 1-365
- Meaning: Days to forecast

### Feature Validation (Risk Prediction)
- Required: Yes
- Type: Float (all features)
- Range: 0.0 to 1.0
- Validation: Checked before ML model

---

## Response Times

Typical response times:
- Health Check: <10ms
- AI Prediction (full): 2-5 seconds
- Risk Analysis: 1-2 seconds
- Advisor Recommendation: 1-3 seconds

**Timeout**: 60 seconds (automatic failure if exceeded)

---

## Authentication

Currently: NONE (public endpoints)

Future enhancement:
- API key authentication
- JWT tokens
- OAuth 2.0

---

## Conclusion

The refactored backend provides:
✅ Clean, separation of concerns
✅ No circular imports
✅ Render deployment ready
✅ Lazy model loading
✅ Graceful error handling
✅ Comprehensive logging
✅ Rate limiting
✅ Full feature predictions

**Status**: 🟢 PRODUCTION READY
