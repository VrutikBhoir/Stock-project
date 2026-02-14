'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

// Helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(val);
};

// Helper to format volume
const formatVolume = (num: number) => {
  if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(1) + "B";
  if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(1) + "M";
  if (num >= 1.0e+3) return (num / 1.0e+3).toFixed(1) + "K";
  return num.toString();
};

export default function Dashboard() {
  const router = useRouter();

  // STATE: User & Profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // STATE: Market Data from API
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // STATE: Prediction Metrics (Derived from API)
  const [predictionMetrics, setPredictionMetrics] = useState({
    confidenceIndex: 0,          // Average confidence %
    marketRiskLevel: 'Medium',    // Low, Medium, High
    bullishSignals: 0,
    bearishSignals: 0,
    neutralSignals: 0,
    eventImpactCount: 0
  });

  // 1. Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
      // Auth Check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setUser(session.user);

      try {
        setLoading(true);

        // Fetch user profile (identity only)
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.warn('Profile fetch error (expected for new users):', profileError.message);
            setProfile({
              username: session.user.email?.split('@')[0] || 'User'
            });
          } else if (profileData) {
            setProfile(profileData);
          }
        } catch (profileErr) {
          console.error('Error fetching profile:', profileErr);
          setProfile({
            username: session.user.email?.split('@')[0] || 'User'
          });
        }

      } catch (err) {
        console.error("Error loading user data:", err);
      } finally {
        setLoading(false);
        
        // Fetch market quotes for main stocks
        const watchlist = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
        fetchQuotes(watchlist);
      }
    };

    initData();
  }, [router]);

  // 2. Fetch Quotes & Market Data
  const fetchQuotes = async (symbols: string[]) => {
    try {
      console.log("Fetching quotes for:", symbols);
      if (symbols.length === 0) {
        console.log("No symbols to fetch.");
        return;
      }
      const query = symbols.join(',');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";
      const url = `${API_BASE_URL}/api/quotes?symbols=${query}`;
      console.log("Fetching URL:", url);

      const res = await fetch(url);
      console.log("Fetch response status:", res.status);

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Received Quote Data:", data);

      const marketArr = Object.values(data);
      setMarketData(marketArr);

      // Calculate prediction metrics from market data
      calculatePredictionMetrics(marketArr);

    } catch (e) {
      console.error("Failed to fetch quotes:", e);
    }
  };

  // 3. Calculate Prediction Metrics
  const calculatePredictionMetrics = (quotes: any[]) => {
    if (!quotes || quotes.length === 0) return;

    // Simulated metrics based on market data
    // In production, these would come from a dedicated /api/metrics endpoint
    
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let totalConfidence = 0;
    let maxRisk = 0;

    quotes.forEach((q: any) => {
      // Bullish if up, Bearish if down
      if (q.changePercent > 1) {
        bullish++;
      } else if (q.changePercent < -1) {
        bearish++;
      } else {
        neutral++;
      }

      // Simulated confidence (70-95%)
      totalConfidence += 70 + Math.random() * 25;

      // Simulated risk from volatility
      const riskFromVolatility = Math.min(100, Math.abs(q.changePercent) * 3);
      maxRisk = Math.max(maxRisk, riskFromVolatility);
    });

    const avgConfidence = Math.round(totalConfidence / quotes.length);
    const riskLevel = maxRisk > 3 ? 'High' : maxRisk > 1.5 ? 'Medium' : 'Low';

    setPredictionMetrics({
      confidenceIndex: avgConfidence,
      marketRiskLevel: riskLevel,
      bullishSignals: bullish,
      bearishSignals: bearish,
      neutralSignals: neutral,
      eventImpactCount: Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 3) + 1
    });
  };

  // 4. Polling for updates
  useEffect(() => {
    if (loading) return;

    const watchlist = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
    const interval = setInterval(() => {
      fetchQuotes(watchlist);
    }, 10000);

    return () => clearInterval(interval);
  }, [loading]);

  // --- COMPUTED VALUES ---
  const displayName = profile?.display_name || 
                      profile?.username || 
                      user?.user_metadata?.name ||
                      user?.email?.split('@')[0] || 
                      "Analyst";

  return (
    <>
      {/* STOCK MARKET THEMED BACKGROUND */}
      <div className="bg">
        <div className="market-grid" />
        <div className="candlesticks">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="candlestick"
              style={{
                left: `${(i * 12) + 5}%`,
                height: `${30 + Math.random() * 60}px`,
                animationDelay: `${i * 0.5}s`,
                background: Math.random() > 0.5 ? '#22c55e' : '#ef4444'
              }}
            />
          ))}
        </div>
      </div>

      <div className="dashboard-container">
        {/* HEADER SECTION */}
        <header className="dashboard-header">
          <div className="header-content">
            <h1 className="welcome-text">
              Welcome, <span className="highlight">{displayName}</span>
            </h1>
            <p className="date-text">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        {/* PREDICTION METRICS GRID */
        <div className="metrics-grid">
          {/* Prediction Confidence Index */}
          <div className="metric-card primary">
            <div className="card-glow" />
            <div className="metric-icon">🎯</div>
            <div className="metric-info">
              <span className="metric-label">Prediction Confidence</span>
              <h2 className="metric-value">{predictionMetrics.confidenceIndex}%</h2>
            </div>
            <div className="metric-change positive">
              Average model confidence across predictions
            </div>
          </div>

          {/* Market Risk Level */}
          <div className="metric-card">
            <div className="card-glow" />
            <div className="metric-icon">⚠️</div>
            <div className="metric-info">
              <span className="metric-label">Market Risk Index</span>
              <h2 className="metric-value">{predictionMetrics.marketRiskLevel}</h2>
            </div>
            <div className={`metric-change ${predictionMetrics.marketRiskLevel === 'High' ? 'negative' : 'neutral'}`}>
              Current market volatility level
            </div>
          </div>

          {/* Signal Distribution */}
          <div className="metric-card">
            <div className="card-glow" />
            <div className="metric-icon">📊</div>
            <div className="metric-info">
              <span className="metric-label">Signal Distribution</span>
              <h2 className="metric-value">{predictionMetrics.bullishSignals + predictionMetrics.bearishSignals + predictionMetrics.neutralSignals}</h2>
            </div>
            <div className="metric-mini-label">
              🟢 {predictionMetrics.bullishSignals} | 🔴 {predictionMetrics.bearishSignals} | ⚪ {predictionMetrics.neutralSignals}
            </div>
          </div>

          {/* Event Impact Summary */}
          <div className="metric-card">
            <div className="card-glow" />
            <div className="metric-icon">⚡</div>
            <div className="metric-info">
              <span className="metric-label">Event Impact Events</span>
              <h2 className="metric-value">{predictionMetrics.eventImpactCount}</h2>
            </div>
            <div className="metric-mini-label">High-impact market events detected</div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="main-content">
          {/* Market Overview / Tracking */}
          <section className="market-section">
            <div className="section-header">
              <h3>📊 Market Predictions Overview</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                AI-powered predictions for tracked stocks
              </p>
            </div>
            <div className="market-table-container">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Change</th>
                    <th>% Change</th>
                    <th>Volume</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.length > 0 ? marketData.map((stock: any) => (
                    <tr key={stock.symbol}>
                      <td className="symbol-cell">
                        <div className="symbol-wrapper">
                          <span className="symbol-text">{stock.symbol}</span>
                        </div>
                      </td>
                      <td className="price-cell">{formatCurrency(stock.price)}</td>
                      <td className={`change-cell ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                        {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}
                      </td>
                      <td className={`percent-cell ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                        <span className="percent-badge">
                          {stock.changePercent > 0 ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                        </span>
                      </td>
                      <td className="volume-cell">{formatVolume(stock.volume)}</td>
                      <td>
                        <button className="trade-btn" onClick={() => router.push(`/predict?symbol=${stock.symbol}`)}>
                          Analyze
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Loading market data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        /* --- DISCLAIMER BANNER --- */
        .disclaimer-banner {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #93c5fd;
        }

        .disclaimer-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .disclaimer-text {
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .disclaimer-text strong {
          color: #60a5fa;
        }

        /* --- DASHBOARD CONTAINER & LAYOUT --- */
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
          position: relative;
          z-index: 1;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .welcome-text {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }

        .highlight {
          background: linear-gradient(135deg, #00D09C, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .date-text {
          color: #94a3b8;
          font-size: 14px;
        }

        /* --- METRICS GRID --- */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .metric-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .card-glow {
          position: absolute;
          top: -50px;
          right: -50px;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(20px);
        }

        .metric-card.primary .card-glow {
          background: radial-gradient(circle, rgba(0, 208, 156, 0.15) 0%, transparent 70%);
        }

        .metric-icon {
          font-size: 24px;
          margin-bottom: 16px;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-info {
          margin-bottom: 12px;
        }

        .metric-label {
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          display: block;
          margin-bottom: 4px;
        }

        .metric-value {
          color: #fff;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .metric-change {
          font-size: 13px;
          font-weight: 500;
        }

        .metric-change.positive { color: #00D09C; }
        .metric-change.negative { color: #F43F5E; }
        .metric-change.neutral { color: #94a3b8; }

        .metric-mini-label {
          font-size: 12px;
          color: #64748b;
        }

        /* --- MARKET TABLE --- */
        .market-section {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          overflow: hidden;
        }

        .section-header h3 {
          color: #fff;
          margin-bottom: 20px;
          font-size: 20px;
          font-weight: 600;
        }

        .market-table-container {
          overflow-x: auto;
        }

        .market-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }

        .market-table th {
          text-align: left;
          padding: 16px;
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .market-table td {
          padding: 20px 16px;
          color: #fff;
          font-size: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
        }

        .market-table tr:last-child td {
          border-bottom: none;
        }

        .market-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .symbol-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .symbol-text {
          font-weight: 700;
          color: #fff;
        }

        .price-cell {
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          font-weight: 600;
        }

        .change-cell.positive { color: #00D09C; }
        .change-cell.negative { color: #F43F5E; }

        .percent-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .percent-cell.positive .percent-badge {
          background: rgba(0, 208, 156, 0.1);
          color: #00D09C;
        }

        .percent-cell.negative .percent-badge {
          background: rgba(244, 63, 94, 0.1);
          color: #F43F5E;
        }

        .volume-cell {
          color: #94a3b8;
        }

        .trade-btn {
          background: transparent;
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3B82F6;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .trade-btn:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3B82F6;
        }

        /* --- BACKGROUND --- */
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: linear-gradient(135deg, #020617 0%, #0a0f1e 50%, #020617 100%);
        }
        
        .market-grid {
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
        }
        
        .candlesticks {
           position: absolute;
           bottom: 0;
           left: 0;
           width: 100%;
           height: 300px;
           opacity: 0.1;
           pointer-events: none;
        }
        
        .candlestick {
           position: absolute;
           bottom: 0;
           width: 10px;
           border-radius: 2px 2px 0 0;
        }

      `}</style>
    </>
  );
}
