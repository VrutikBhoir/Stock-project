# Narrative API - End-to-End Flow

## 📡 Complete Request/Response Flow

### Step 1: User Submits Form (Frontend)

```typescript
// narrative.tsx - User clicks "Generate AI Narrative"
Input: {
  selectedStock: "MSFT",
  investorType: "Balanced",
  timeHorizon: "medium_term",
  investmentGoal: "Growth"
}
```

### Step 2: Convert Format (Frontend → API)

```typescript
// lib/api.ts - generateNarrative()
horizonMap: {
  "short_term": "Short-term",
  "medium_term": "Medium-term",  // ← Selected
  "long_term": "Long-term"
}

Transformed Request: {
  symbol: "MSFT",
  investor_profile: {
    type: "Balanced",              // ← From investorType
    time_horizon: "Medium-term",   // ← From horizonMap[timeHorizon]
    primary_goal: "Growth"         // ← From investmentGoal
  }
}
```

### Step 3: Send to Backend

```
POST http://localhost:8001/api/narrative/generate
Content-Type: application/json

{
  "symbol": "MSFT",
  "investor_profile": {
    "type": "Balanced",
    "time_horizon": "Medium-term",
    "primary_goal": "Growth"
  }
}
```

### Step 4: Backend Processing

```
app/services/ml/narrative_engine.py:

1. Fetch Market Data (yfinance)
   - Current price: $420.50
   - 1-month change: +3.5% (Uptrend)
   - Confidence: 68%

2. Fetch News Sentiment (mock)
   - Sentiment: Negative
   - Strength: 55%

3. Fetch Risk Data (yfinance)
   - Annual volatility: 4.5% (High)
   - Risk Level: High

4. Aggregate Signals
   - Trend signal: +1.0 (uptrend)
   - News signal: -1.0 (negative)
   - Risk signal: -0.3 (high risk)
   - Volatility signal: -0.2 (high volatility)
   - Composite: +0.35 (mildly bullish)
   - Confidence: 65.5%

5. Reason with Investor Profile
   - Market Bias: "Bullish" (composite > 0.3)
   - Signal Strength: "Moderate" (medium confidence)
   - For Balanced investor: neutral language

6. Generate Narrative
   - Headline: "Moderate Bullish Outlook with High Risk"
   - Text: 5-7 sentences personalized for Balanced investor
```

### Step 5: Backend Response

```json
{
  "symbol": "MSFT",
  "market_state": {
    "trend": "Uptrend",
    "confidence": 65,
    "risk_level": "High",
    "volatility": "High",
    "news_sentiment": "Negative"
  },
  "signals": {
    "market_bias": "Bullish",
    "signal_strength": "Moderate"
  },
  "narrative": {
    "headline": "Moderate Bullish Outlook with High Risk",
    "text": "MSFT is currently in an uptrend with 65% confidence. Market shows mixed signals - bullish technicals but negative sentiment. High volatility requires careful position sizing. For Balanced investors, consider the risk/reward. Moderate signals warrant cautious positioning.",
    "investor_type": "Balanced"
  }
}
```

### Step 6: Transform for Frontend Display

```typescript
// lib/api.ts - Response transformation

determineConviction("Moderate") → "Medium"
getRecommendation("Bullish", "Balanced") → "BUY"
inferInsights(data) → [
  "📊 Moderate signals - balanced outlook",
  "⚡ High volatility (High) - position sizing important",
  "🛡️ High risk indicated - consider your risk tolerance",
  "📰 Negative news sentiment detected"
]

Final Frontend Response: {
  symbol: "MSFT",
  timestamp: "2026-02-15T...",
  narrative: {
    sentiment: "Bullish",
    conviction: "Medium",
    confidence: 65,
    signal_strength: "Moderate",
    sections: {
      market_summary: "Bullish market outlook. Trend: Uptrend. Risk: High.",
      why_this_outlook: "Analysis shows moderate bullish signals with 65% confidence...",
      key_factors: [
        "Trend: Uptrend",
        "Confidence: 65%",
        "Risk Level: High",
        "Volatility: High",
        "News Sentiment: Negative"
      ],
      disclaimer: "⚠️ AI-generated analysis only. NOT financial advice."
    }
  },
  investor_context: {
    investor_type: "Balanced",
    recommendation: "BUY",
    action_guidance: "MSFT is currently in an uptrend with 65% confidence...",
    insights: [
      "📊 Moderate signals - balanced outlook",
      "⚡ High volatility (High) - position sizing important",
      "🛡️ High risk indicated - consider your risk tolerance",
      "📰 Negative news sentiment detected"
    ]
  },
  explainability: {
    model_info: "AI Market Narrative Engine",
    how_to_use: {
      title: "How to Interpret This AI Narrative",
      steps: [
        "Review the market bias (Bullish/Neutral/Bearish)",
        "Check signal strength and confidence",
        "Read narrative for your investor type",
        "Consider key factors and risk level",
        "Use with other research"
      ],
      important_notes: [
        "Based on technical indicators and market data",
        "Past performance ≠ future results",
        "Always do your own due diligence",
        "NOT financial advice"
      ]
    }
  }
}
```

### Step 7: Display in Frontend

```jsx
// narrative.tsx renders the response

<div className="sentiment-header" style={{background: "#22c55e"}}>
  <h2>Bullish Market Outlook</h2>
  <div>
    MSFT • Conviction: Medium • Confidence: 65% • Signal Strength: Moderate
  </div>
</div>

<div className="narrative-card market-summary">
  <h3>📊 Market Summary</h3>
  <p>Bullish market outlook. Trend: Uptrend. Risk: High.</p>
</div>

<div className="narrative-card why-outlook">
  <h3>🔍 Why This Outlook</h3>
  <p>Analysis shows moderate bullish signals with 65% confidence...</p>
</div>

<div className="narrative-card for-you">
  <h3>👤 For Balanced Investors</h3>
  <div className="recommendation-badge">BUY</div>
  <p>MSFT is currently in an uptrend with 65% confidence...</p>
</div>

<div className="narrative-card key-factors">
  <h3>📈 Key Factors at a Glance</h3>
  <ul>
    <li>Trend: Uptrend</li>
    <li>Confidence: 65%</li>
    <li>Risk Level: High</li>
    <li>Volatility: High</li>
    <li>News Sentiment: Negative</li>
  </ul>
</div>

<div className="actions-card">
  <h3>💡 Recommended Actions & Insights</h3>
  <h4>Suggested Action:</h4>
  <p>MSFT is currently in an uptrend with 65% confidence...</p>
  <h4>Key Insights:</h4>
  <ul>
    <li>📊 Moderate signals - balanced outlook</li>
    <li>⚡ High volatility (High) - position sizing important</li>
    <li>🛡️ High risk indicated - consider your risk tolerance</li>
    <li>📰 Negative news sentiment detected</li>
  </ul>
</div>
```

---

## 🔍 Key Transformations

### 1. Field Name Mapping

```
Frontend        Backend         Frontend Display
────────────────────────────────────────────
investorType    type            investor_context.investor_type
investment_     time_           (used internally)
horizon         horizon
investment_     primary_        (used internally)
goal            goal
```

### 2. Signal-to-Sentiment Mapping

```
Backend Signal          Frontend Display
────────────────────────────────────────
market_bias: Bullish    narrative.sentiment: Bullish
signal_strength:        conviction:
- Strong        →       - High
- Moderate      →       - Medium
- Weak          →       - Low
```

### 3. Recommendation Logic

```
Market Bias + Investor Type → Recommendation
─────────────────────────────────────────────
Bullish + Conservative → HOLD
Bullish + Balanced → BUY
Bullish + Aggressive → BUY

Bearish + Conservative → REDUCE
Bearish + Balanced → SELL
Bearish + Aggressive → SELL

Neutral + Any → HOLD
```

### 4. Insight Generation

```
Data Point                  → Insight
──────────────────────────────────────────────
signal_strength: Strong     → "✅ Strong signals..."
volatility: High/VeryHigh   → "⚡ High volatility..."
risk_level: High            → "🛡️ High risk..."
news_sentiment: Negative    → "📰 Negative sentiment..."
news_sentiment: Positive    → "📈 Positive sentiment..."
```

---

## ✅ Integration Checklist

- [x] Frontend calls correct endpoint (`/api/narrative/generate`)
- [x] Request payload matches backend API contract
- [x] Response is properly transformed for frontend
- [x] Field names are correctly mapped
- [x] Investor-specific recommendations generated
- [x] Insights extracted from market data
- [x] All error cases handled
- [x] TypeScript types correct
- [x] No breaking changes to frontend UI
- [x] Fallback values for edge cases

---

**Status: ✅ FULLY INTEGRATED AND TESTED**
