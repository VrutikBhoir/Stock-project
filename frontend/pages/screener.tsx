import { useState } from 'react';
import Head from 'next/head';
import { screenTickers, ScreenerFilters } from '../lib/api';

export default function ScreenerPage() {
  const [tickers, setTickers] = useState('AAPL, MSFT, TSLA, NVDA, AMZN');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ ticker: string; match?: boolean; metrics?: any; error?: string }>>([]);
  const [filters, setFilters] = useState<ScreenerFilters>({ lookback_days: 60 });

  const run = async () => {
    try {
      setLoading(true);
      const list = (tickers || '').split(',').map(t => t.trim()).filter(Boolean);
      const res = await screenTickers(list, filters);
      setResults(res.results || []);
    } catch (error) {
      console.error('Screener error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate match score (0-100)
  const getScore = (metrics: any) => {
    if (!metrics) return 0;
    let score = 50;
    
    if (metrics.rsi < 30) score += 20; // Oversold
    else if (metrics.rsi > 70) score -= 20; // Overbought
    
    if (metrics.macd_cross_bullish) score += 20;
    if (metrics.macd_cross_bearish) score -= 20;
    
    if (metrics.price_change_pct > 5) score += 10;
    else if (metrics.price_change_pct < -5) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  // Get signal label based on score
  const getSignal = (score: number) => {
    if (score >= 80) return { label: '🟢 Strong Buy', color: '#22c55e' };
    if (score >= 60) return { label: '🟡 Buy', color: '#eab308' };
    if (score >= 40) return { label: '⚪ Neutral', color: '#94a3b8' };
    if (score >= 20) return { label: '🟠 Risky', color: '#f97316' };
    return { label: '🔴 Avoid', color: '#ef4444' };
  };

  // Get RSI color
  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return '#22c55e';
    if (rsi > 70) return '#ef4444';
    return '#94a3b8';
  };

  // Get price change color
  const getPriceChangeColor = (change: number) => {
    if (change > 0) return '#22c55e';
    if (change < 0) return '#ef4444';
    return '#94a3b8';
  };

  return (
    <>
      <Head><title>Stock Screener | Stock Price Predictor</title></Head>

      {/* STOCK MARKET THEMED BACKGROUND */}
      <div className="bg">
        {/* Market Grid */}
        <div className="market-grid" />
        
        {/* Floating Stock Tickers */}
        <div className="tickers">
          {['AAPL ↑ $182.50', 'GOOGL ↓ $138.20', 'MSFT ↑ $415.30', 'TSLA ↑ $245.80', 'AMZN ↓ $178.90', 'NVDA ↑ $875.20', 'META ↑ $512.30', 'NFLX ↓ $425.60'].map((ticker, i) => (
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

        {/* Candlestick Charts */}
        <div className="candlesticks">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="candlestick" 
              style={{
                left: `${(i * 6.5) + 2}%`,
                height: `${30 + Math.random() * 70}px`,
                animationDelay: `${i * 0.2}s`,
                background: Math.random() > 0.5 ? '#22c55e' : '#ef4444'
              }}
            />
          ))}
        </div>

        {/* Line Chart Waves */}
        <svg className="chart-waves" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path 
            className="wave wave1" 
            d="M0,200 Q300,150 600,180 T1200,200" 
            fill="none" 
            stroke="rgba(34, 197, 94, 0.3)" 
            strokeWidth="2"
          />
          <path 
            className="wave wave2" 
            d="M0,220 Q300,270 600,240 T1200,220" 
            fill="none" 
            stroke="rgba(239, 68, 68, 0.3)" 
            strokeWidth="2"
          />
          <path 
            className="wave wave3" 
            d="M0,210 Q300,190 600,220 T1200,210" 
            fill="none" 
            stroke="rgba(56, 189, 248, 0.3)" 
            strokeWidth="2"
          />
        </svg>

        {/* Dollar Signs & Symbols */}
        <div className="symbols">
          {['$', '%', '↑', '↓', '€', '¥', '£', '₿', '📈', '📉'].map((symbol, i) => (
            <div 
              key={i} 
              className="symbol" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 12}s`,
                fontSize: `${20 + Math.random() * 30}px`,
                opacity: 0.1 + Math.random() * 0.2
              }}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Glowing Orbs */}
        <div className="orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Gradient Overlay */}
        <div className="gradient-overlay" />
      </div>

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">🧮</div>
              <div>
                <h1 className="main-title">Stock Screener</h1>
                <p className="subtitle">Filter stocks by technical indicators and metrics</p>
              </div>
            </div>
            <div className="stats-mini">
              <div className="stat-item">
                <span className="stat-value">Live</span>
                <span className="stat-label">Analysis</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Multi</span>
                <span className="stat-label">Filters</span>
              </div>
            </div>
          </div>
        </header>

        {/* Configuration Card */}
        <section className="card config-card">
          <div className="card-glow" />
          <h2 className="section-title">⚙️ Configuration</h2>
          
          {/* Tickers Input */}
          <div className="input-group">
            <label>Stock Tickers (comma-separated)</label>
            <input 
              type="text"
              value={tickers} 
              onChange={(e) => setTickers(e.target.value)}
              placeholder="AAPL, MSFT, TSLA, NVDA, AMZN"
            />
          </div>

          {/* Filters Grid */}
          <div className="filters-grid">
            <div className="filter-item">
              <label>RSI Below</label>
              <input 
                type="number" 
                placeholder="e.g., 30"
                onChange={(e) => setFilters(f => ({ ...f, rsi_below: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>

            <div className="filter-item">
              <label>Price Change % {'>'}</label>
              <input 
                type="number" 
                placeholder="e.g., 5"
                onChange={(e) => setFilters(f => ({ ...f, price_change_pct_gt: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>

            <div className="filter-item">
              <label>Price Change % {'<'}</label>
              <input 
                type="number" 
                placeholder="e.g., -5"
                onChange={(e) => setFilters(f => ({ ...f, price_change_pct_lt: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>

            <div className="filter-item">
              <label>Lookback Days</label>
              <input 
                type="number" 
                defaultValue={60}
                onChange={(e) => setFilters(f => ({ ...f, lookback_days: Number(e.target.value) || 60 }))}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                onChange={(e) => setFilters(f => ({ ...f, macd_cross_bullish: e.target.checked }))}
              />
              <span className="checkbox-text">📈 MACD Bullish Cross</span>
            </label>

            <label className="checkbox-label">
              <input 
                type="checkbox" 
                onChange={(e) => setFilters(f => ({ ...f, macd_cross_bearish: e.target.checked }))}
              />
              <span className="checkbox-text">📉 MACD Bearish Cross</span>
            </label>
          </div>

          {/* Run Button */}
          <button 
            onClick={run} 
            disabled={loading}
            className="run-button"
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Running Analysis...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Run Screener
              </>
            )}
          </button>
        </section>

        {/* Results Card */}
        <section className="card results-card">
          <div className="card-glow" />
          <div className="results-header">
            <h2 className="section-title">📊 Screening Results</h2>
            {results.length > 0 && (
              <span className="results-count">{results.length} stocks analyzed</span>
            )}
          </div>

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              <h3>Analyzing Stocks...</h3>
              <p>Running technical analysis on selected tickers</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>RSI</th>
                    <th>Δ%</th>
                    <th>Bull</th>
                    <th>Bear</th>
                    <th>Score</th>
                    <th>Signal</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const score = getScore(r.metrics);
                    const signal = getSignal(score);
                    
                    return (
                      <tr key={i} className="table-row">
                        <td className="ticker-cell">{r.ticker}</td>
                        <td className="price-cell">
                          {r.metrics?.price != null ? `$${Number(r.metrics.price).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ color: r.metrics?.rsi != null ? getRSIColor(r.metrics.rsi) : '#64748b', fontWeight: r.metrics?.rsi != null && (r.metrics.rsi < 30 || r.metrics.rsi > 70) ? 700 : 400 }}>
                          {r.metrics?.rsi != null ? Number(r.metrics.rsi).toFixed(1) : '—'}
                        </td>
                        <td style={{ color: r.metrics?.price_change_pct != null ? getPriceChangeColor(r.metrics.price_change_pct) : '#64748b', fontWeight: 600 }}>
                          {r.metrics?.price_change_pct != null ? `${Number(r.metrics.price_change_pct).toFixed(1)}%` : '—'}
                        </td>
                        <td className="center-cell">
                          {r.metrics?.macd_cross_bullish === true ? '✅' : (r.metrics?.macd_cross_bullish === false ? '❌' : '—')}
                        </td>
                        <td className="center-cell">
                          {r.metrics?.macd_cross_bearish === true ? '✅' : (r.metrics?.macd_cross_bearish === false ? '❌' : '—')}
                        </td>
                        <td>
                          <div className="score-cell">
                            <div className="score-bar-bg">
                              <div 
                                className="score-bar-fill"
                                style={{ 
                                  width: `${score}%`,
                                  background: score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
                                }}
                              />
                            </div>
                            <span className="score-text">{score}</span>
                          </div>
                        </td>
                        <td style={{ color: signal.color, fontWeight: 700 }}>
                          {signal.label}
                        </td>
                        <td className="center-cell">
                          {r.match === true ? '✅' : (r.match === false ? '❌' : (r.error ? `⚠️` : '—'))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Results Yet</h3>
              <p>Configure your filters above and run the screener to analyze stocks</p>
            </div>
          )}
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 30px;
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
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 5px;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 16px;
        }

        .stats-mini {
          display: flex;
          gap: 30px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #38bdf8;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* CARDS */
        .card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 32px;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
          animation: cardAppear 0.6s ease backwards;
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

        .config-card {
          animation-delay: 0.1s;
        }

        .results-card {
          animation-delay: 0.2s;
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

        .card:hover {
          transform: translateY(-8px);
          box-shadow: 
            0 30px 80px rgba(56, 189, 248, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 28px;
          color: #f1f5f9;
          position: relative;
          z-index: 1;
        }

        /* INPUTS */
        .input-group {
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .input-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        input[type="text"],
        input[type="number"] {
          width: 100%;
          padding: 16px 20px;
          background: rgba(2, 6, 23, 0.9);
          border: 2px solid #334155;
          border-radius: 14px;
          color: #fff;
          font-size: 15px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        input:focus {
          outline: none;
          border-color: #38bdf8;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15), 0 0 40px rgba(56, 189, 248, 0.2);
          transform: translateY(-2px);
          background: rgba(2, 6, 23, 1);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .filter-item label {
          display: block;
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .checkbox-label:hover {
          transform: translateX(5px);
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #38bdf8;
        }

        .checkbox-text {
          color: #cbd5e1;
          font-size: 15px;
          user-select: none;
        }

        /* BUTTON */
        .run-button {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: none;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 10px 30px rgba(37, 99, 235, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .run-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .run-button:hover::before {
          left: 100%;
        }

        .run-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(37, 99, 235, 0.5);
        }

        .run-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-icon {
          font-size: 20px;
        }

        .btn-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* RESULTS */
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .results-count {
          padding: 8px 16px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 20px;
          color: #38bdf8;
          font-size: 14px;
          font-weight: 600;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          position: relative;
          z-index: 1;
        }

        .loading-spinner {
          width: 80px;
          height: 80px;
          margin: 0 auto 30px;
          border: 6px solid rgba(56, 189, 248, 0.2);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-state h3 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #f1f5f9;
        }

        .loading-state p {
          color: #94a3b8;
        }

        .table-wrapper {
          overflow-x: auto;
          position: relative;
          z-index: 1;
        }

        .results-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .results-table thead tr {
          background: rgba(2, 6, 23, 0.6);
        }

        .results-table th {
          padding: 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(56, 189, 248, 0.2);
          position: sticky;
          top: 0;
          background: rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(10px);
        }

        .results-table tbody tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
        }

        .results-table tbody tr:hover {
          background: rgba(56, 189, 248, 0.05);
          transform: scale(1.01);
        }

        .results-table td {
          padding: 16px;
          color: #e2e8f0;
        }

        .ticker-cell {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: #38bdf8;
          font-size: 15px;
        }

        .price-cell {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .center-cell {
          text-align: center;
        }

        .score-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .score-bar-bg {
          width: 80px;
          height: 8px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px currentColor;
        }

        .score-text {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          position: relative;
          z-index: 1;
        }

        .empty-icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .empty-state h3 {
          font-size: 24px;
          margin-bottom: 12px;
          color: #f1f5f9;
        }

        .empty-state p {
          color: #94a3b8;
          font-size: 16px;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .container {
            padding: 20px 16px 60px;
          }

          .main-title {
            font-size: 28px;
          }

          .header-content {
            padding: 24px;
          }

          .stats-mini {
            display: none;
          }

          .card {
            padding: 24px;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            overflow-x: scroll;
          }

          .results-table {
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
