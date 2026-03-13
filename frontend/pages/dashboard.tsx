
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import MovingStockCards from '../components/dashboard/MovingStockCards';
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
  
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [stockSignals, setStockSignals] = useState<Record<string, any>>({});
  const fetchDashboardMetrics = async () => {
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://stocklens-production-89a6.up.railway.app";

      const res = await fetch(`${API_BASE_URL}/api/dashboard-metrics`);
      const data = await res.json();
      
      setDashboardMetrics(data);
      const map: Record<string, any> = {};
      (data.per_stock || []).forEach((s: any) => {
        map[s.symbol] = s;
      });
      setStockSignals(map);
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    }
  };

  // STATE: User & Profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // STATE: Market Data from API
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch user profile
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.warn('Profile fetch error:', profileError.message);
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
        
        // Fetch market quotes
        const watchlist = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
        fetchQuotes(watchlist);
      }
    };
    initData();
    fetchDashboardMetrics();
    const interval = setInterval(fetchDashboardMetrics, 15000);
    return () => clearInterval(interval);
  }, [router]);

  // 2. Fetch Quotes & Market Data
  const fetchQuotes = async (symbols: string[]) => {
    try {
      if (symbols.length === 0) return;
      
      const query = symbols.join(',');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://stocklens-production-89a6.up.railway.app";
      const url = `${API_BASE_URL}/api/quotes?symbols=${query}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const marketArr = Object.values(data);
      setMarketData(marketArr);
    } catch (e) {
      console.error("Failed to fetch quotes:", e);
    }
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

  const displayName = profile?.display_name || 
                      profile?.username || 
                      user?.user_metadata?.name ||
                      user?.email?.split('@')[0] || 
                      "Analyst";

  return (
    <>
      <Head>
        <title>Trading Dashboard | Stock Market Platform</title>
      </Head>

      {/* STOCK MARKET THEMED BACKGROUND */}
      <div className="bg">
        <div className="market-grid" />
        <div className="tickers">
          {['AAPL ↑ $182.50', 'GOOGL ↓ $138.20', 'MSFT ↑ $415.30', 'TSLA ↑ $245.80', 'AMZN ↓ $178.90', 'NVDA ↑ $875.20'].map((ticker, i) => (
            <div 
              key={i} 
              className="ticker" 
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 2}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            >
              {ticker}
            </div>
          ))}
        </div>
        <div className="candlesticks">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="candlestick" 
              style={{
                left: `${(i * 8) + 5}%`,
                height: `${30 + Math.random() * 60}px`,
                animationDelay: `${i * 0.3}s`,
                background: Math.random() > 0.5 ? '#22c55e' : '#ef4444'
              }}
            />
          ))}
        </div>
        <svg className="chart-waves" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path className="wave wave1" d="M0,200 Q300,150 600,180 T1200,200" fill="none" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" />
          <path className="wave wave2" d="M0,220 Q300,270 600,240 T1200,220" fill="none" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="2" />
          <path className="wave wave3" d="M0,210 Q300,190 600,220 T1200,210" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
        </svg>
        <div className="symbols">
          {['$', '%', '↑', '↓', '€', '¥', '£', '₿'].map((symbol, i) => (
            <div key={i} className="symbol" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
              fontSize: `${20 + Math.random() * 30}px`,
              opacity: 0.1 + Math.random() * 0.2
            }}>
              {symbol}
            </div>
          ))}
        </div>
        <div className="orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>
        <div className="gradient-overlay" />
      </div>

      <div className="container">
        {/* HEADER */}
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">💼</div>
              <div>
                <h1 className="main-title">
                  Welcome, <span className="highlight">{displayName}</span>
                </h1>
                <p className="subtitle">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* DISCLAIMER */}
        <div className="disclaimer-banner">
          <div className="card-glow" />
          <span className="disclaimer-icon">ℹ️</span>
          <p className="disclaimer-text">
            This platform provides <strong>AI-based market predictions only</strong>. 
            No trading or financial execution is performed. For research and educational purposes.
          </p>
        </div>


{/* METRICS GRID */}
<div className="metrics-grid">
  <div className="metric-card">
    <div className="card-glow" />
    <div className="metric-header">
      <span className="metric-icon">⚠️</span>
      <span className="metric-label">Market Risk Index</span>
    </div>
    <h2 className="metric-value">{dashboardMetrics?.market_risk}</h2>
    <p className={`metric-desc ${dashboardMetrics?.market_risk === 'High' ? 'negative' : dashboardMetrics?.market_risk === 'Medium' ? 'neutral' : 'positive'}`}>
      Current market volatility level
    </p>
  </div>

  <div className="metric-card">
    <div className="card-glow" />
    <div className="metric-header">
      <span className="metric-icon">📊</span>
      <span className="metric-label">Signal Distribution</span>
    </div>
    <h2 className="metric-value">
  {dashboardMetrics
    ? dashboardMetrics.signals.bullish.length +
      dashboardMetrics.signals.bearish.length +
      dashboardMetrics.signals.neutral.length
    : "-"}
</h2>

<p className="metric-desc">
  🟢 <strong>Bullish:</strong>{" "}
  {dashboardMetrics?.signals.bullish.length
    ? dashboardMetrics.signals.bullish.join(", ")
    : "None"}
  <br />
  🔴 <strong>Bearish:</strong>{" "}
  {dashboardMetrics?.signals.bearish.length
    ? dashboardMetrics.signals.bearish.join(", ")
    : "None"}
  <br />
  ⚪ <strong>Neutral:</strong>{" "}
  {dashboardMetrics?.signals.neutral.length
    ? dashboardMetrics.signals.neutral.join(", ")
    : "None"}
</p>
  </div>

  <div className="metric-card">
    <div className="card-glow" />
    <div className="metric-header">
      <span className="metric-icon">⚡</span>
      <span className="metric-label">Event Impact Events</span>
    </div>
    <h2 className="metric-value">
  {dashboardMetrics?.event_impacts.length ?? 0}
</h2>
<p className="metric-desc">
  {dashboardMetrics?.event_impacts.map((e: any) => (
    <div key={e.symbol}>⚡ {e.symbol} – {e.impact}</div>
  ))}
</p>
    <p className="metric-desc">High-impact market events detected</p>
  </div>
          <div className="metric-card">
            <div className="card-glow" />
            <div className="metric-header">
              <span className="metric-icon">🎯</span>
              <span className="metric-label">Prediction Confidence</span>
            </div>
            <h2 className="metric-value">{dashboardMetrics?.confidence}%</h2>
            <p className="metric-desc positive">Average model confidence across predictions</p>
          </div>
        </div>

        {/* MOVING STOCK CARDS */}
        <section className="metric-card market-card">
          <div className="card-glow" />
          <div className="section-header">
            <h2 className="section-title">📈 Live Market Pulse</h2>
            <p className="section-desc">
              Real-time AI-driven stock movement and sentiment stream
            </p>
          </div>
          <MovingStockCards
  data={marketData}
  signals={stockSignals}
/>
        </section>
      </div>
      {/* STYLES */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* STOCK MARKET BACKGROUND */
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          background: linear-gradient(135deg, #020617 0%, #0a0f1e 50%, #020617 100%);
        }

        .market-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridScroll 20s linear infinite;
        }

        @keyframes gridScroll {
          from { background-position: 0 0; }
          to { background-position: 50px 50px; }
        }

        .tickers {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ticker {
          position: absolute;
          padding: 8px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 8px;
          color: #38bdf8;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          backdrop-filter: blur(10px);
          animation: tickerFloat 15s infinite ease-in-out;
          white-space: nowrap;
        }

        @keyframes tickerFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(100px, -100px) rotate(5deg);
            opacity: 0.7;
          }
        }

        .candlesticks {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 200px;
          opacity: 0.15;
        }

        .candlestick {
          position: absolute;
          bottom: 20px;
          width: 15px;
          border-radius: 3px;
          animation: candleGrow 2s ease-out infinite;
          box-shadow: 0 0 20px currentColor;
        }

        @keyframes candleGrow {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1.2); }
        }

        .chart-waves {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 400px;
          opacity: 0.3;
        }

        .wave {
          animation: waveMove 8s ease-in-out infinite;
        }

        .wave1 { animation-delay: 0s; }
        .wave2 { animation-delay: 1s; }
        .wave3 { animation-delay: 2s; }

        .symbols {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .symbol {
          position: absolute;
          color: #38bdf8;
          font-weight: 700;
          animation: symbolFloat 10s infinite ease-in-out;
        }

        @keyframes symbolFloat {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.3; }
          50% {
            transform: translateY(50vh) rotate(180deg);
            opacity: 0.3;
          }
          90% { opacity: 0.3; }
        }

        .orbs {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: orbFloat 15s infinite ease-in-out;
        }

        .orb1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.3), transparent);
          top: 10%;
          left: 10%;
        }

        .orb2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent);
          top: 40%;
          right: 10%;
          animation-delay: 3s;
        }

        .orb3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.2), transparent);
          bottom: 10%;
          left: 50%;
          animation-delay: 6s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -50px) scale(1.1); }
          66% { transform: translate(-50px, 50px) scale(0.9); }
        }

        .gradient-overlay {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          animation: pulseOverlay 8s ease-in-out infinite;
        }

        @keyframes pulseOverlay {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        /* CONTAINER */
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          color: #e5e7eb;
          padding-top: 110px;
        }

        /* HEADER */
        .header {
          margin-bottom: 40px;
          animation: slideDown 0.8s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-content {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 24px;
          padding: 30px 40px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: transform 0.3s ease;
        }

        .header-content:hover {
          transform: translateY(-5px);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logo-icon {
          font-size: 48px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .main-title {
          font-size: 36px;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 5px;
        }

        .highlight {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 15px;
        }

        /* DISCLAIMER */
        .disclaimer-banner {
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(37, 99, 235, 0.3);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          animation: fadeIn 1s ease 0.2s backwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .disclaimer-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .disclaimer-text {
          font-size: 13px;
          line-height: 1.6;
          color: #93c5fd;
        }

        .disclaimer-text strong {
          color: #60a5fa;
        }

        /* METRICS GRID */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
          animation: fadeIn 1s ease 0.4s backwards;
        }

        .metric-card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 20px;
          padding: 18px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-8px);
          box-shadow: 
            0 30px 80px rgba(56, 189, 248, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .card-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.1), transparent 70%);
          animation: cardGlowRotate 10s linear infinite;
          pointer-events: none;
        }

        @keyframes cardGlowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .metric-icon {
          font-size: 22px;
        }

        .metric-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }

        .metric-desc {
          font-size: 12px;
          position: relative;
          z-index: 1;
        }

        .metric-desc.positive { color: #22c55e; }
        .metric-desc.negative { color: #ef4444; }
        .metric-desc.neutral { color: #94a3b8; }

        /* CARDS */
        .card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 24px;
          padding: 40px;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
          animation: cardAppear 0.6s ease 0.6s backwards;
        }

        .market-card {
          padding: 18px;
          min-height: 420px;
          border-radius: 20px;
        }

        @keyframes cardAppear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .card:hover {
          transform: translateY(-8px);
          box-shadow: 
            0 30px 80px rgba(56, 189, 248, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .section-header {
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 8px;
        }

        .section-desc {
          font-size: 13px;
          color: #94a3b8;
        }

        /* TABLE */
        .table-wrapper {
          overflow-x: auto;
          position: relative;
          z-index: 1;
        }

        .market-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .market-table thead tr {
          background: rgba(2, 6, 23, 0.6);
        }

        .market-table th {
          padding: 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(56, 189, 248, 0.2);
        }

        .table-row {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
        }

        .table-row:hover {
          background: rgba(56, 189, 248, 0.05);
          transform: scale(1.01);
        }

        .market-table td {
          padding: 18px 16px;
          color: #e2e8f0;
        }

        .symbol-cell {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: #38bdf8;
          font-size: 15px;
        }

        .price-cell {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .change-cell.positive { color: #22c55e; font-weight: 600; }
        .change-cell.negative { color: #ef4444; font-weight: 600; }

        .percent-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          display: inline-block;
        }

        .percent-badge.positive {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .percent-badge.negative {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .volume-cell {
          color: #94a3b8;
          font-size: 14px;
        }

        .analyze-button {
          padding: 8px 20px;
          background: transparent;
          border: 2px solid rgba(56, 189, 248, 0.4);
          border-radius: 10px;
          color: #38bdf8;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .analyze-button:hover {
          background: #38bdf8;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(56, 189, 248, 0.4);
        }

        .loading-cell {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 16px;
          border: 4px solid rgba(56, 189, 248, 0.2);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .container {
            padding: 20px 16px 60px;
            padding-top: 90px;
          }

          .main-title {
            font-size: 24px;
          }

          .header-content {
            padding: 24px;
          }

          .card {
            padding: 24px;
          }

          .market-card {
            padding: 18px;
            min-height: 360px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            overflow-x: scroll;
          }

          .market-table {
            min-width: 800px;
          }

          .tickers {
            display: none;
          }
        }
      `}</style>
    </>
  );
}