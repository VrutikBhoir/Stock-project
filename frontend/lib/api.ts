import axios from 'axios';
// ... existing imports

// ============================================================================
// API Base URL Configuration - SINGLE SOURCE OF TRUTH
// ============================================================================
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 
  "https://price-predictor-o66q.onrender.com";

// 1. ADD THIS: Define the response type for Finnhub so TypeScript is happy
type FinnhubQuote = {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
};

// ... existing code ...

// 2. REPLACE THE EXISTING getLivePrice FUNCTION WITH THIS:
export async function getLivePrice(ticker: string) {
  // Option A: Direct Frontend Call (Real Data)
  // WARNING: In a production app, you should not expose API keys in the frontend.
  // For a portfolio project or local dashboard, this is acceptable.
  const API_KEY = '4PV82V2URSCMN9OM'; // <--- PASTE YOUR KEY HERE
  
  try {
    // We use standard axios here, not the 'api' instance, to avoid localhost base URL
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${API_KEY}`;
    const { data } = await axios.get<FinnhubQuote>(url);

    // Finnhub returns '0' if the ticker is invalid
    if (data.c === 0 && data.h === 0) {
        throw new Error('Invalid Ticker');
    }

    return {
      ticker: ticker.toUpperCase(),
      price: data.c, // 'c' is the current price property in Finnhub
      timestamp: new Date().toISOString(),
      changePercent: data.dp, // Bonus: You now have percentage change
    };
  } catch (error) {
    console.error("Error fetching live price:", error);
    
    // Fallback: If the API fails, return a safe object or re-throw
    return {
      ticker: ticker,
      price: 0,
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch live price'
    };
  }
}

// Use Next.js API proxy to avoid CORS issues
export const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // increase timeout to 120s to accommodate data fetch and training
  withCredentials: false,
});

export type Ohlcv = {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
};

export async function fetchData(ticker: string, start: string, end: string) {
  try {
    console.log('🔍 DEBUG: fetchData called with:', { ticker, start_date: start, end_date: end });
    console.log('🔍 DEBUG: API base URL:', api.defaults.baseURL);
    
    // Validate inputs before making the request
    if (!ticker || !ticker.trim()) {
      throw new Error('Ticker symbol is required');
    }
    
    if (!start || !end) {
      throw new Error('Start date and end date are required');
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    
    const payload = { ticker, start_date: start, end_date: end };
    console.log('📤 DEBUG: Sending payload to /fetch-data:', payload);
    console.log('📤 DEBUG: Full request URL:', `${api.defaults.baseURL}/fetch-data`);
    
    const { data } = await api.post('/fetch-data', payload);
    console.log('✅ DEBUG: fetchData response received:', data);
    
    // Check if the response contains an error
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data as { data: Ohlcv[] };
  } catch (error: any) {
    console.error('❌ DEBUG: fetchData error:', error);
    
    // Handle different types of errors
    if (error.response) {
      console.error('❌ DEBUG: Response status:', error.response.status);
      console.error('❌ DEBUG: Response data:', error.response.data);
      console.error('❌ DEBUG: Response headers:', error.response.headers);
      console.error('❌ DEBUG: Request URL:', error.config?.url);
      console.error('❌ DEBUG: Request method:', error.config?.method);
      console.error('❌ DEBUG: Request payload:', error.config?.data);
      
      if (error.response.status === 422) {
        // Validation error - try to extract specific error message
        const errorData = error.response.data;
        if (errorData.detail) {
          // FastAPI validation errors
          if (Array.isArray(errorData.detail)) {
            const validationErrors = errorData.detail.map((err: any) => 
              `${err.loc.join('.')}: ${err.msg}`
            ).join(', ');
            throw new Error(`Validation error: ${validationErrors}`);
          } else {
            throw new Error(`Validation error: ${errorData.detail}`);
          }
        } else if (errorData.error) {
          throw new Error(errorData.error);
        } else {
          throw new Error('Invalid request data (422 error)');
        }
      } else if (error.response.status === 400) {
        throw new Error(error.response.data.error || 'Bad request');
      } else if (error.response.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
    }
    
    // Re-throw the error with a user-friendly message
    throw error;
  }
}
export async function fetchAI(symbol: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/predict-ai`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    }
  );

  if (!res.ok) {
    throw new Error("AI prediction failed");
  }

  return res.json();
}

export async function fetchRiskVsPrediction() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  try {
    const res = await fetch(`${baseUrl}/api/risk-vs-prediction`);
    
    if (!res.ok) {
      console.warn(`Risk vs Prediction API returned ${res.status}`);
      return generateSampleRiskData();
    }
    
    const responseData = await res.json();
    const data = responseData.data || responseData;
    
    console.log("Risk vs Prediction API Response:", data);
    
    // Ensure data has required structure with real values
    const result = {
      risk_levels: data.risk_levels || [],
      actual_prices: data.actual_prices || [],
      predicted_prices: data.predicted_prices || [],
      statistics: data.statistics || {},
      dates: data.dates || [],
      prediction_suppressed: data.prediction_suppressed || [],
      suppression_message: data.suppression_message || "",
      risk_confidence: data.risk_confidence || generateRiskConfidence(data.risk_levels || [])
    };
    
    console.log("Final Risk Confidence:", result.risk_confidence);
    return result;
  } catch (err) {
    console.error("Error fetching risk vs prediction:", err);
    return generateSampleRiskData();
  }
}

function generateRiskConfidence(riskLevels: number[]) {
  if (!riskLevels || riskLevels.length === 0) {
    return { low: 33.3, medium: 33.3, high: 33.4 };
  }
  
  const low = riskLevels.filter(r => r < 0.33).length;
  const medium = riskLevels.filter(r => r >= 0.33 && r < 0.67).length;
  const high = riskLevels.filter(r => r >= 0.67).length;
  const total = riskLevels.length;
  
  return {
    low: parseFloat(((low / total) * 100).toFixed(1)),
    medium: parseFloat(((medium / total) * 100).toFixed(1)),
    high: parseFloat(((high / total) * 100).toFixed(1))
  };
}

function generateSampleRiskData() {
  // Generate sample data for demos/testing
  const n = 20;
  const risk_levels = Array.from({ length: n }, (_, i) => Math.random() * 1);
  const actual_prices = Array.from({ length: n }, (_, i) => 100 + Math.random() * 50 - Math.sin(i / 5) * 20);
  const predicted_prices = Array.from({ length: n }, (_, i) => 100 + Math.random() * 40 - Math.cos(i / 5) * 15);
  const dates = Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - i) * 86400000).toISOString().split('T')[0]);
  
  // Calculate real statistics
  const avg_actual = actual_prices.reduce((a, b) => a + b, 0) / n;
  const avg_predicted = predicted_prices.reduce((a, b) => a + b, 0) / n;
  const errors = actual_prices.map((p, i) => Math.abs(p - predicted_prices[i]));
  const mean_error = errors.reduce((a, b) => a + b, 0) / n;
  
  // Calculate risk confidence distribution
  const low_risk = risk_levels.filter(r => r < 0.33).length;
  const medium_risk = risk_levels.filter(r => r >= 0.33 && r < 0.67).length;
  const high_risk = risk_levels.filter(r => r >= 0.67).length;
  
  return {
    risk_levels,
    actual_prices,
    predicted_prices,
    statistics: {
      average_actual: avg_actual,
      average_predicted: avg_predicted,
      mean_absolute_error: mean_error,
      rmse: Math.sqrt(errors.reduce((a, b) => a + (b * b), 0) / n)
    },
    risk_confidence: {
      low: parseFloat(((low_risk / n) * 100).toFixed(1)),
      medium: parseFloat(((medium_risk / n) * 100).toFixed(1)),
      high: parseFloat(((high_risk / n) * 100).toFixed(1))
    },
    dates,
    prediction_suppressed: [],
    suppression_message: ""
  };
}

export async function indicators(payload: {
  data: Ohlcv[];
  include_sma: boolean;
  include_ema: boolean;
  include_rsi: boolean;
  include_macd: boolean;
  include_bollinger: boolean;
}) {
  try {
    console.log('📤 Calling /indicators endpoint');
    const { data } = await api.post('/indicators', payload);
    console.log('✅ Indicators response received:', data);
    return data as { 
      indicators: Record<string, (number | null)[]>;
      error?: string;
    };
  } catch (error: any) {
    console.error('❌ Indicators error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      const errorMsg = error.response.data?.error || `Server error: ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
}

export async function trainModel(payload: {
  dates: string[];
  close: number[];
  model_type: 'ARIMA' | 'SARIMA';
  forecast_days: number;
}) {
  try {
    console.log('📤 Calling /train endpoint with:', { model: payload.model_type, forecast_days: payload.forecast_days });
    const { data } = await api.post('/train', payload);
    console.log('✅ Train response received:', data);
    return data as {
      predictions?: {
        forecast: { date: string; value: number }[];
        lower_ci: { date: string; value: number }[];
        upper_ci: { date: string; value: number }[];
      };
      metrics?: Record<string, number | null>;
      error?: string;
    };
  } catch (error: any) {
    console.error('❌ Train error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      const errorMsg = error.response.data?.error || `Server error: ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
}



export type AdviceResponse = {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasons: string[];
  current_price: number | null;
  indicators: Record<string, number | null>;
  forecast: {
    forecast: { date: string; value: number }[];
    lower_ci: { date: string; value: number }[];
    upper_ci: { date: string; value: number }[];
    metrics: Record<string, number | null>;
  };
  expected_return_pct?: number | null;
  risk_level?: 'low' | 'medium' | 'high' | null;
  time_horizon_days?: number;
  targets?: { entry: number | null; stop_loss: number | null; target1: number | null; target2: number | null };
  decision_summary?: string | null;
  performance?: { return_7d: number | null; return_30d: number | null };
  trend_label?: 'up' | 'down' | 'flat' | null;
  alternatives?: { ticker: string; score: number; reasons: string[]; expected_return_pct?: number; return_band?: 'low'|'medium'|'high'; one_liner?: string }[];
  error?: string;
};

export async function getAdvice(payload: {
  data: Ohlcv[];
  model_type: 'ARIMA' | 'SARIMA';
  forecast_days: number;
  ticker?: string;
}) {
  try {
    console.log('📤 Calling /advice endpoint');
    const { data } = await api.post('/advice', payload);
    console.log('✅ Advice response received:', data);
    return data as AdviceResponse;
  } catch (error: any) {
    console.error('❌ Advice error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      const errorMsg = error.response.data?.error || `Server error: ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
}

// --- Auth ---

export async function getFullPrediction(features: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict/full`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });

  return await res.json();
}
export async function fetchPredictionVsReality() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  const res = await fetch(`${baseUrl}/prediction-vs-reality`);
  return res.json();
}

export async function generateNarrative(payload: any) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  
  // Transform frontend payload to match backend API contract
  const backendPayload = {
    symbol: payload.symbol,
    investor_profile: {
      type: payload.investor_type,
      time_horizon: payload.investment_horizon,
      primary_goal: payload.investment_goal || "Growth"
    }
  };
  
  const res = await fetch(
    `${baseUrl}/api/narrative/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    }
  );

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || `API Error (${res.status}): ${res.statusText}`);
    } catch (e: any) {
      if (e.message && e.message.includes("API Error")) {
        throw e;
      }
      throw new Error(`Narrative API failed (${res.status}): ${res.statusText}`);
    }
  }

  const data = await res.json();
  
  // Transform backend response to match frontend expectations
  return {
    symbol: data.symbol,
    timestamp: new Date().toISOString(),
    // Map new response structure to old frontend expectations
    narrative: {
      sentiment: data.signals.market_bias,  // "Bullish", "Bearish", "Neutral"
      conviction: determineConviction(data.signals.signal_strength),  // "High", "Medium", "Low"
      confidence: data.market_state.confidence,  // 0-100
      signal_strength: data.signals.signal_strength,  // "Strong", "Moderate", "Weak"
      sections: {
        market_summary: `${data.signals.market_bias} market outlook. Trend: ${data.market_state.trend}. Risk: ${data.market_state.risk_level}.`,
        why_this_outlook: `The analysis shows a ${data.signals.market_bias.toLowerCase()} bias with ${data.signals.signal_strength.toLowerCase()} signal strength. Market confidence: ${data.market_state.confidence}%. News sentiment: ${data.market_state.news_sentiment}.`,
        key_factors: [
          `Trend: ${data.market_state.trend}`,
          `Confidence: ${data.market_state.confidence}%`,
          `Risk Level: ${data.market_state.risk_level}`,
          `Volatility: ${data.market_state.volatility}`,
          `News Sentiment: ${data.market_state.news_sentiment}`
        ],
        disclaimer: "⚠️ This is AI-generated analysis only. NOT financial advice. Always consult a financial advisor before investing."
      }
    },
    investor_context: {
      investor_type: payload.investor_type,
      recommendation: getRecommendation(data.signals.market_bias, payload.investor_type),
      action_guidance: data.narrative.text,
      insights: inferInsights(data)
    },
    explainability: {
      model_info: "AI Market Narrative Engine",
      how_to_use: {
        title: "How to Interpret This AI Narrative",
        steps: [
          "Review the market bias (Bullish/Neutral/Bearish) at the top",
          "Check the signal strength and confidence level",
          "Read the personalized narrative for your investor type",
          "Consider the key factors and risk level",
          "Use this analysis along with other research"
        ],
        important_notes: [
          "This analysis is based on technical indicators and market data",
          "Past performance does not guarantee future results",
          "Always do your own due diligence",
          "This is NOT financial advice"
        ]
      }
    }
  };
}

// Helper function to determine conviction level from signal strength
function determineConviction(signalStrength: string): string {
  switch (signalStrength) {
    case "Strong":
      return "High";
    case "Moderate":
      return "Medium";
    case "Weak":
      return "Low";
    default:
      return "Medium";
  }
}

// Helper function to get recommendation based on market bias and investor type
function getRecommendation(marketBias: string, investorType: string): string {
  if (investorType === "Conservative") {
    if (marketBias === "Bullish") return "HOLD";
    if (marketBias === "Bearish") return "REDUCE";
    return "HOLD";
  }
  
  if (investorType === "Aggressive") {
    if (marketBias === "Bullish") return "BUY";
    if (marketBias === "Bearish") return "SELL";
    return "HOLD";
  }
  
  // Balanced
  if (marketBias === "Bullish") return "BUY";
  if (marketBias === "Bearish") return "SELL";
  return "HOLD";
}

// Helper function to infer insights from market data
function inferInsights(data: any): string[] {
  const insights: string[] = [];
  
  if (data.signals.signal_strength === "Strong") {
    insights.push("✅ Strong signals indicating clear market direction");
  } else if (data.signals.signal_strength === "Weak") {
    insights.push("⚠️ Weak signals - mixed market indicators");
  } else {
    insights.push("📊 Moderate signals - balanced outlook");
  }
  
  if (data.market_state.volatility === "High" || data.market_state.volatility === "Very High") {
    insights.push(`⚡ High volatility (${data.market_state.volatility}) - position sizing important`);
  }
  
  if (data.market_state.risk_level === "High") {
    insights.push("🛡️ High risk indicated - consider your risk tolerance");
  }
  
  if (data.market_state.news_sentiment === "Negative") {
    insights.push("📰 Negative news sentiment detected");
  } else if (data.market_state.news_sentiment === "Positive") {
    insights.push("📈 Positive news sentiment detected");
  }
  
  return insights.length > 0 ? insights : ["📊 Monitor market conditions regularly"];
}

export type ScreenerFilters = {
  rsi_below?: number;
  rsi_above?: number;
  price_change_pct_gt?: number;
  price_change_pct_lt?: number;
  lookback_days?: number;
  macd_cross_bullish?: boolean;
  macd_cross_bearish?: boolean;
};

export async function screenTickers(tickers: string[], filters: ScreenerFilters) {
  const res = await fetch("/api/screener", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickers, filters }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Screener API failed: ${errorText}`);
  }

  return res.json();
}
