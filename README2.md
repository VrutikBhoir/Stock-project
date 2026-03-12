# Detailed Documentation (Consolidated)

This file consolidates all previously separate markdown documentation into a single reference. It contains detailed guides, reports, and technical notes.

## Debugging the "Request failed with status code 422" Error

### What is a 422 Error?

A 422 Unprocessable Entity error occurs when the server understands the request but cannot process it due to validation errors. In this project, it typically means the data sent to the API does not match the expected schema.

### Common Causes

1. Invalid date format
- Expected: YYYY-MM-DD (e.g., 2024-01-01)
- Problem: Dates in wrong format or invalid dates
- Solution: Ensure dates are in ISO format

2. Empty or missing fields
- Required fields: ticker, start_date, end_date
- Problem: Missing or empty values
- Solution: Validate all required fields are present

3. Invalid ticker symbol
- Problem: Empty ticker or invalid stock symbol
- Solution: Ensure ticker is not empty and is valid

4. Data type mismatch
- Problem: Sending wrong data types
- Solution: Ensure all fields are strings

### Debugging Steps

Step 1: Check backend server
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Step 2: Test API health
```bash
curl http://localhost:8000/health
```
Expected: {"status": "ok"}

Step 3: Use the debug tools

Option A: Python test script
```bash
python test_api_debug.py
```

Option B: Browser test
Open test_api_browser.html in your browser

Step 4: Check console logs
Look for request payloads, response status codes, and error messages in the browser dev tools.

### Fixes Applied

Backend improvements:
- Better validation in /fetch-data endpoint
- Detailed error messages for debugging
- Input sanitization for ticker and dates
- Graceful error handling for yfinance failures

Frontend improvements:
- Client-side validation before API calls
- Better error handling for 422 responses
- Detailed logging for debugging
- User-friendly error messages

### Testing Checklist

- Backend server is running on port 8000
- Frontend can connect to backend
- Health endpoint returns 200
- Valid ticker symbol (e.g., AAPL, GOOGL)
- Valid date format (YYYY-MM-DD)
- Start date is before end date
- No empty fields

### Common Scenarios

Scenario 1: Empty ticker
```json
{
  "ticker": "",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```
Result: 422 error - "Ticker cannot be empty"

Scenario 2: Invalid date format
```json
{
  "ticker": "AAPL",
  "start_date": "01/01/2024",
  "end_date": "12/31/2024"
}
```
Result: 422 error - "Invalid date format. Expected YYYY-MM-DD"

Scenario 3: Missing fields
```json
{
  "ticker": "AAPL"
}
```
Result: 422 error - "Start date and end date are required"

### Quick Fix Commands

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

cd frontend
npm run dev

python test_api_debug.py
```

### Advanced Debugging

Enable verbose logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Test with curl:
```bash
curl -X POST "http://stocklens-production-89a6.up.railway.app//fetch-data" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","start_date":"2024-01-01","end_date":"2024-12-31"}'
```

## Frontend-Backend Integration Update

### Integration Complete

The frontend code has been updated to work with the AI Market Narrative Engine backend API.

### Changes Made

1. Frontend API function (frontend/lib/api.ts)

Updated generateNarrative() to:
- Call endpoint /api/narrative/generate (was /api/predict-ai)
- Transform payload fields to match backend API contract
  - investor_type -> type
  - investment_horizon -> time_horizon
  - investment_goal -> primary_goal
- Transform backend response back to frontend expectations
- Added helper functions: determineConviction(), getRecommendation(), inferInsights()

2. Frontend page (frontend/pages/narrative.tsx)

Updated runNarrative() to:
- Convert time horizon format for API compatibility
  - short_term -> Short-term
  - medium_term -> Medium-term
  - long_term -> Long-term

### Data Mapping

Request transformation:
```typescript
{
  symbol: "MSFT",
  investor_type: "Balanced",
  investment_horizon: "medium_term",
  investment_goal: "Growth"
}
```

Response transformation:
- market_bias -> narrative.sentiment
- signal_strength -> narrative.conviction
- market_state.confidence -> narrative.confidence
- market_state.trend -> narrative.sections.market_summary
- news_sentiment and risk_level -> narrative.sections.key_factors

### Features Implemented

Payload transformation:
- Converts frontend field names to backend API contract
- Handles optional fields (investment_goal defaults to "Growth")
- Converts time horizon format (medium_term -> Medium-term)

Response transformation:
- Maps market_bias to sentiment (Bullish/Neutral/Bearish)
- Converts signal_strength to conviction level (High/Medium/Low)
- Extracts market data into narrative sections
- Generates investor-specific recommendations (BUY/SELL/HOLD/REDUCE)
- Infers actionable insights from market data

Error handling:
- Validates response structure
- Provides fallback values for missing fields
- Displays user-friendly error messages

### Testing

Manual test:
1. Start backend: cd backend && uvicorn app.main:app --port 8001 --reload
2. Navigate to narrative page
3. Fill in Stock Symbol: MSFT, Investor Type: Balanced, Time Horizon: Medium-term, Primary Goal: Growth
4. Click "Generate AI Narrative"

Expected result:
- API calls /api/narrative/generate with correct payload
- Response transformed and displayed
- Sentiment, recommendations, insights shown

### API Compatibility

Aspect - Status
- Endpoint: OK (/api/narrative/generate)
- Method: OK (POST)
- Request format: OK
- Response format: OK (transformed)
- Field names: OK
- Error handling: OK
- Data validation: OK

### Files Updated

- frontend/lib/api.ts
- frontend/pages/narrative.tsx

### Summary

The frontend is compatible with the AI Market Narrative Engine backend. Requests and responses are transformed correctly and error handling is in place.

## Frontend-Backend Integration - Complete Summary

### Mission

Make the frontend compatible with the new AI Market Narrative Engine backend API.

### What Was Wrong

Issue - Frontend expected - Backend provides
- Endpoint: /api/predict-ai -> /api/narrative/generate
- Field names: investor_type -> type, investment_horizon -> time_horizon, investment_goal -> primary_goal
- Response format: sentiment/conviction/sections -> market_state/signals/narrative

### What Was Fixed

File: frontend/lib/api.ts
- Updated endpoint
- Transformed payload
- Transformed response
- Added helper functions

File: frontend/pages/narrative.tsx
- Added time horizon mapping
- Passes correct payload

### Integration Results

Request flow:
User input -> format conversion -> generateNarrative -> POST /api/narrative/generate -> backend

Response flow:
Backend response -> transform -> narrative.tsx -> display

### Testing Checklist

- Frontend compiles without errors
- Endpoint correct
- Request payload matches backend contract
- Response transformed properly
- Field names mapped
- Recommendations generated
- Insights extracted
- Error handling OK
- TypeScript types OK

### How to Test

1. Start backend: cd backend && uvicorn app.main:app --port 8001 --reload
2. Start frontend: cd frontend && npm run dev
3. Navigate to http://localhost:3000/narrative
4. Fill in form and generate narrative

### Key Improvements

- Correct endpoint
- Proper payload format
- Response transformation
- Recommendations and insights
- Error handling
- Type safety

## Intraday Chart - Implementation Guide

### Overview

The app includes a near-real-time intraday price graph that updates every 15 seconds and responds to stock selection changes.

### Backend (FastAPI)

- Endpoint: GET /api/intraday?symbol=XYZ
- Location: backend/app/main.py (lines 321-381)
- Features:
  - Uses Alpha Vantage API key from environment
  - Calls TIME_SERIES_INTRADAY with interval=1min
  - Returns {"time": "YYYY-MM-DD HH:MM:SS", "price": 123.45}
  - Error handling for rate limits, invalid symbols, missing API key
  - Proper logging and HTTP status codes

### Frontend (React + TypeScript)

- Component: IntradayChart
- Location: frontend/components/dashboard/IntradayChart.tsx
- Integrated in: frontend/pages/predict.tsx
- Features:
  - Reads selected stock from StockContext
  - Polls /api/intraday every 15 seconds
  - Resets chart when stock changes
  - Maintains sliding window of last 100 points
  - Renders Plotly line chart
  - Cleans up intervals on unmount
  - Error handling and loading states

### Recent Improvements

- Migrated from ApexCharts to Plotly for consistency

### File Structure

backend/app/main.py
  - /api/intraday endpoint (lines 321-381)

frontend/
  - components/dashboard/IntradayChart.tsx
  - pages/StockContext.tsx
  - pages/predict.tsx

### How It Works

1. User selects a stock
2. Component resets and starts polling
3. Backend fetches latest price from Alpha Vantage
4. Chart updates with new data points

### Integration Instructions

Already integrated in predict page. Optional use in other pages:
```tsx
import IntradayChart from '../components/dashboard/IntradayChart';

export default function Dashboard() {
  return (
    <div>
      <IntradayChart />
    </div>
  );
}
```

### Configuration

Adjust polling interval:
```typescript
pollInterval.current = setInterval(fetchIntraday, 15000);
```

Adjust data window size:
```typescript
if (updated.length > 100) {
  return updated.slice(updated.length - 100);
}
```

Set API base URL:
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend.com
```

### Troubleshooting

- Missing API key: set ALPHA_VANTAGE_KEY in backend environment
- Rate limit 429: reduce polling frequency
- No intraday data: market closed or invalid symbol
- CORS errors: allow frontend URL in backend CORS config

### API Response Format

Success:
```json
{
  "time": "2026-02-22 15:30:00",
  "price": 175.42
}
```

Errors:
- 429: Alpha Vantage rate limit reached
- 404: Invalid symbol or data not found
- 500: API key missing
- 503: Service unavailable

### Performance Tips

- Use polling interval >= 12 seconds (Alpha Vantage free tier limits)
- Keep sliding window small to avoid memory growth

### Security Notes

- Keep ALPHA_VANTAGE_KEY server-side only
- Validate input on backend
- Add auth for production

### Testing

Manual test:
1. Start backend: cd backend && uvicorn app.main:app --reload --port 8001
2. Start frontend: cd frontend && npm run dev
3. Navigate to Predict page
4. Select a stock and wait for updates

### Dependencies

Backend: requests, fastapi, python-dotenv
Frontend: react-plotly.js, axios, next

## Narrative API - End-to-End Flow

### Complete Request/Response Flow

Step 1: User submits form (frontend)
Input: selectedStock, investorType, timeHorizon, investmentGoal

Step 2: Convert format (frontend to API)
- short_term -> Short-term
- medium_term -> Medium-term
- long_term -> Long-term

Step 3: Send to backend
POST http://stocklens-production-89a6.up.railway.app//api/narrative/generate

Step 4: Backend processing
- Fetch market data (yfinance)
- Fetch news sentiment (mock or real)
- Fetch risk data (yfinance)
- Aggregate signals and confidence
- Reason with investor profile
- Generate narrative

Step 5: Backend response
Returns symbol, market_state, signals, narrative

Step 6: Transform for frontend display
- determineConviction(signal_strength) -> High/Medium/Low
- getRecommendation(market_bias, investor_type) -> BUY/SELL/HOLD/REDUCE
- inferInsights(data) -> list of insights

Step 7: Display in frontend
Narrative page renders sentiment header, sections, and recommendations

### Key Transformations

Field name mapping:
- investorType -> type
- investment_horizon -> time_horizon
- investment_goal -> primary_goal

Signal to sentiment mapping:
- market_bias -> narrative.sentiment
- signal_strength -> narrative.conviction

Recommendation logic:
- Bullish + Conservative -> HOLD
- Bullish + Balanced -> BUY
- Bullish + Aggressive -> BUY
- Bearish + Conservative -> REDUCE
- Bearish + Balanced -> SELL
- Bearish + Aggressive -> SELL
- Neutral + Any -> HOLD

Insight generation uses signal_strength, volatility, risk_level, news_sentiment

## Narrative Engine - Issue and Fix Report

Date: February 17, 2026
Issue: BRK.A failing with "No data found"
Status: Fixed

### Problems Identified

1. Symbol normalization issue
- yfinance requires dots to hyphens (BRK.A -> BRK-A)
- Failed in _fetch_market_data() and _fetch_risk_data()

2. Trained model not being used
- narrative_engine_final.pkl existed but was not loaded

### Solutions Applied

Fix 1: Symbol normalization helper
```python
def normalize_symbol_for_yfinance(symbol: str) -> str:
    symbol = symbol.upper()
    symbol = symbol.replace(".", "-")
    return symbol
```

Fix 2: Model loading and awareness
- Load model in NarrativeEngine.__init__()
- Fallback to algorithmic generation on failure
- Log mode used

Fix 3: Improved logging
- Log whether trained model or algorithmic mode is active

### Testing the Fix

- POST /api/narrative/generate with symbol BRK.A should succeed
- Check logs for model loaded message

### Impact Summary

Before: BRK.A, BRK.B, BF.A failed
After: Works with normalized symbols

## AI Market Narrative Engine - Implementation Complete

### Implementation Summary

Files created or modified:
- backend/app/api/narrative.py (HTTP layer)
- backend/app/services/ml/narrative_engine.py (intelligence layer)
- backend/NARRATIVE_ENGINE_IMPLEMENTATION.md (implementation guide)
- NARRATIVE_ENGINE_QUICK_REFERENCE.md (quick reference)

Verification:
- Exactly 2 narrative logic files
- No forbidden files
- Four architecture layers implemented
- API contract matches spec
- Input validation for investor profile
- Output format matches spec
- Data sources: yfinance + mock sentiment
- LLM-ready: isolated text generation function
- Production-ready: error handling, logging, type hints

### Architecture (Verified)

Layer 1: Data fetching
- _fetch_market_data()
- _fetch_news_sentiment()
- _fetch_risk_data()

Layer 2: Signal aggregation
- _aggregate_signals()

Layer 3: Investor reasoning
- _reason_with_investor_profile()

Layer 4: Narrative generation (LLM-ready)
- _generate_narrative_text()

### API Contract

Input:
```json
{
  "symbol": "MSFT",
  "investor_profile": {
    "type": "Conservative | Balanced | Aggressive",
    "time_horizon": "Short-term | Medium-term | Long-term",
    "primary_goal": "Growth | Income | Capital Preservation | Speculative"
  }
}
```

Output:
```json
{
  "symbol": "MSFT",
  "market_state": {
    "trend": "Uptrend | Downtrend | Sideways",
    "confidence": 68,
    "risk_level": "Low | Medium | High",
    "volatility": "Low | Moderate | High | Very High",
    "news_sentiment": "Positive | Neutral | Negative"
  },
  "signals": {
    "market_bias": "Bullish | Neutral | Bearish",
    "signal_strength": "Weak | Moderate | Strong"
  },
  "narrative": {
    "headline": "Clear Bullish Outlook with High Risk",
    "text": "MSFT is currently in a uptrend with 68% confidence...",
    "investor_type": "Balanced"
  }
}
```

### End-to-End Flow

Frontend request -> POST /api/narrative/generate -> narrative.py (validation) -> build_market_narrative() -> narrative_engine.py -> return NarrativeResponse -> frontend display

### Testing

- python backend/verify_narrative_contracts.py
- python backend/test_narrative_gen.py
- curl POST http://stocklens-production-89a6.up.railway.app//api/narrative/generate

### Success Criteria

All constraints and requirements met. Engine is LLM-ready and production-ready.

## AI Market Narrative Engine - Quick Reference

### Quick Start

1. Start backend:
```bash
cd backend
uvicorn app.main:app --port 8001 --reload
```

2. Make a request:
```bash
curl -X POST http://stocklens-production-89a6.up.railway.app//api/narrative/generate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "investor_profile": {
      "type": "Conservative",
      "time_horizon": "Long-term",
      "primary_goal": "Capital Preservation"
    }
  }'
```

### Valid Input Values

Investor type:
- Conservative
- Balanced
- Aggressive

Time horizon:
- Short-term
- Medium-term
- Long-term

Primary goal:
- Growth
- Income
- Capital Preservation
- Speculative

### Architecture Summary

Two files only:
- app/api/narrative.py (HTTP layer)
- app/services/ml/narrative_engine.py (intelligence)

### Signal Weighting

- Trend: 35%
- News: 25%
- Risk: 20%
- Volatility: 20%

### LLM Integration

Replace _generate_narrative_text() with an LLM call, keep input/output signature unchanged.

## Supabase Configuration for Prediction-Only Mode

This document describes Supabase RLS policies and database changes required for prediction-only mode. These changes must be applied manually in Supabase.

### Disable Trading: portfolios table

- Keep portfolios table for user reference
- Do not write to it in backend
- Policies: SELECT only, no INSERT/UPDATE/DELETE

### Disable Trading: positions table

- Read-only for users
- Policies: SELECT only, no INSERT/UPDATE/DELETE

### Keep: profiles table

Store minimal user profile fields only. Do not store cash_balance, portfolio_value, or trading history.

### Optional: prediction_history table

Read and append only. Policies: SELECT and INSERT for owning user.

### Frontend Impact

Frontend uses localStorage for simulated portfolio state. Portfolio calculations are derived, not stored.

## Stock Price Predictor - Testing Results

### Test Summary

Backend:
- Files present and dependencies importable
- Risk prediction logic tested
- Data processing with 40,000+ data points successful
- Narrative engine contracts validated
- Supabase client initialization successful
- API modules importable

Frontend:
- TypeScript compilation errors fixed
- Next.js build successful
- Pages and components compiled

Issues fixed during testing:
- Plot component prop compatibility
- Missing instrumentType in Stock interface
- StockContext import paths

Performance insights:
- Risk calculation processes 40,000+ data points
- Frontend builds with static optimization
- Supabase connectivity established

Test coverage summary:
- Backend structure: PASS
- Frontend structure: PASS
- ML services: PASS
- Database: PASS
- Build process: PASS
- API endpoints: PASS
- TypeScript: PASS

Test files created:
- comprehensive_test_suite.py
- integration_test_suite.py
- test_report.json

## IntradayChart Visibility Test Results

### Configuration Status

Backend:
- Endpoint: /api/intraday
- Status: configured

Frontend component:
- Location: frontend/components/dashboard/IntradayChart.tsx
- Imported in predict.tsx
- Rendered in predict.tsx

Context setup:
- StockProvider wraps app in _app.tsx
- Default stock: AAPL

### Visibility Check

Chart should be visible when a stock is selected. It returns null only if no stock is selected.

### Troubleshooting (If Not Visible)

- No stock selected: select a stock to show the chart
- Backend not running: start uvicorn
- API key missing: set ALPHA_VANTAGE_KEY
- Rate limit hit: wait and retry
- Market closed: try during market hours
- Browser cache issues: hard refresh

### Expected API Response

```json
{
  "time": "2026-02-22 15:30:00",
  "price": 175.42
}
```

## Investor-Specific Narrative Generation

### Overview

Narratives are personalized for Conservative, Balanced, and Aggressive investor types with unique strategies, tone, and recommendations.

### Key Features

- Distinct content per investor type
- Time horizon integration
- Goal-aligned advice

### Narrative Characteristics

Conservative investors:
- Focus on capital preservation and downside protection
- Cautious tone and defensive strategies

Balanced investors:
- Confirmation before action, gradual entry
- Measured, analytical tone

Aggressive investors:
- Opportunity capture and momentum
- Action-oriented tone

### Architecture

narrative_engine.py
- _generate_narrative_body() routes to
  - _generate_conservative_narrative()
  - _generate_balanced_narrative()
  - _generate_aggressive_narrative()

### Testing

```bash
cd backend
.\.venv\Scripts\python -m test_investor_narratives
```

## AI Market Reasoning Assistant

### Overview

Conservative signal interpretation system that explains provided market data without calculating new indicators.

### Key Features

- No price prediction
- Cautious language
- Investor-specific guidance
- Structured output sections

### API Endpoints

- GET /api/market-reasoning/health
- POST /api/market-reasoning/explain

### Request Example

```json
{
  "composite_score": 75.5,
  "technical_score": 80.2,
  "trend_score": 72.8,
  "risk_score": 45.3,
  "momentum_score": 78.1,
  "rsi_value": 55.0,
  "macd_state": "Above Signal",
  "volatility_level": "Medium",
  "support_level": 148.50,
  "resistance_level": 158.00,
  "entry_zone_low": 150.25,
  "entry_zone_high": 152.75,
  "exit_zone_low": 156.00,
  "exit_zone_high": 159.50,
  "model_confidence": 82.0,
  "investor_type": "Balanced",
  "investment_horizon": "Medium-term"
}
```

### Response Example

```json
{
  "success": true,
  "ai_reasoning": "Composite score of 76/100 indicates strong signal strength...",
  "key_insights": "Strong signal composite (76/100) with moderate risk profile...",
  "investor_interpretation": "Balanced approach for medium-term investing...",
  "risk_notice": "RISKS: Entry and exit zones are indicative ranges...",
  "decision_signal": "BUY"
}
```

## ML-Driven AI Market Narrative Engine

### Overview

ML-driven narrative system using Random Forest classifiers for sentiment and conviction. It generates investor-aware narratives with explainability.

### Quick Start

1. Train the ML model:
```bash
cd backend
python train_narrative_model.py
```

2. Start backend:
```bash
cd backend
uvicorn app.main:app --reload --port 8001
```

3. Test API:
```bash
curl -X POST http://stocklens-production-89a6.up.railway.app//api/narrative/generate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "investor_type": "Balanced",
    "investment_horizon": "medium_term",
    "investment_goal": "Growth"
  }'
```

### Feature Engineering

Features:
- confidence
- trend_score
- overall_score
- technical_score
- momentum_score
- expected_return
- volatility

### Validation Checklist

- Model file exists and loads
- Narratives generated for 5+ test stocks
- Confidence values vary
- Sentiments and conviction levels vary
- Narrative sections populated

### Troubleshooting

- If model not found, run train_narrative_model.py
- If confidence always ~50%, model not loading

### Performance

- Inference: ~5-20ms
- Feature extraction: ~10ms
- Total: ~50-100ms per request

## Enhanced Financial News Analysis Engine

### Overview

News analysis provides sentiment, themes, and market impact assessment without quoting headlines.

### Features

- Sentiment analysis: Positive/Neutral/Negative with confidence
- Theme identification: earnings, expansion, regulation, risk, technology, operations
- Market impact assessment: Low/Medium/High
- Technical-news alignment: aligned/conflicting/neutral

### Service Interface

Function:
```python
analyze_news_sentiment(headlines: List[str]) -> Dict
```

Return values:
- sentiment, confidence, scores
- themes, market_impact, headline_count
- summary

### Configuration

Optional NewsAPI key:
```bash
NEWS_API_KEY=your_newsapi_key_here
```

### Testing

```bash
cd backend
python -m test_news_analysis
```

## AI Market Narrative Engine - Implementation Guide (Backend)

### Architecture Overview

Two files only:
- app/api/narrative.py (HTTP layer)
- app/services/ml/narrative_engine.py (intelligence layer)

### Data Flow (Multi-Layer Architecture)

API layer -> validate input -> build_market_narrative() -> engine layer -> data fetch -> signal aggregation -> investor reasoning -> narrative generation -> output contract

### Signal Weighting

- Trend: 35%
- News: 25%
- Risk: 20%
- Volatility: 20%

### Risk Thresholds

- High risk: volatility annual > 0.04
- Medium risk: volatility annual > 0.025

### Trend Detection

- Uptrend if trend_change_pct > 2
- Downtrend if trend_change_pct < -2

### Testing

- python backend/verify_narrative_contracts.py
- python backend/test_narrative_gen.py

### Summary

The narrative engine provides investor-aware narratives with real data sources and LLM-ready text generation, compliant with strict architectural constraints.
