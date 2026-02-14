import { useState } from "react";
import { generateNarrative } from "../lib/api";
import Head from "next/head";

export default function NarrativePage() {
  const [selectedStock, setSelectedStock] = useState("");
  const [investorType, setInvestorType] = useState<
    "Conservative" | "Balanced" | "Aggressive"
  >("Balanced");
  const [timeHorizon, setTimeHorizon] = useState<
    "short_term" | "medium_term" | "long_term"
  >("medium_term");
  const [investmentGoal, setInvestmentGoal] = useState<
    "Growth" | "Income" | "Capital Protection" | "Trading" | ""
  >("");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const runNarrative = async () => {
    if (!selectedStock || selectedStock.trim() === "") {
      setError("Please enter a stock symbol (e.g., AAPL, MSFT, BRK.A)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await generateNarrative({
        symbol: selectedStock,
        investor_type: investorType,
        investment_horizon: timeHorizon,
        investment_goal: investmentGoal || undefined,
      });

      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = {
    Bullish: "#22c55e",
    Bearish: "#ef4444",
    Neutral: "#f59e0b",
  };

  const investorDescriptions = {
    Conservative:
      "Prioritize capital preservation with lower risk tolerance. Prefer stable, predictable returns.",
    Balanced:
      "Balanced approach seeking both growth and stability. Willing to accept moderate risk.",
    Aggressive:
      "Growth-focused with higher risk tolerance. Comfortable with significant price swings.",
  };

  const timeHorizonDescriptions = {
    short_term: "Days to months. Short-term price movement analysis.",
    medium_term: "Months to a few years. Typical mid-term investment analysis.",
    long_term: "Years to decades. Long-term wealth building analysis.",
  };

  const investmentGoalDescriptions = {
    Growth: "Capital appreciation analysis. Seeking highest growth potential.",
    Income: "Income analysis. Dividends and yield focused stocks.",
    "Capital Protection": "Risk-aware analysis. Minimizing volatility focus.",
    Trading: "Short-term tactical analysis. Quick momentum evaluation.",
  };

  return (
    <>
      <Head>
        <title>AI Market Narrative Generator | Stock Market Platform</title>
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
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">🎯</div>
              <div>
                <h1 className="main-title">AI Market Narrative Generator</h1>
                <p className="subtitle">Get personalized AI-powered market insights powered by machine learning</p>
              </div>
            </div>
          </div>
        </header>

        {/* Help Card */}
        <section className="card help-card" onClick={() => setShowHelp(!showHelp)}>
          <div className="card-glow" />
          <div className="help-header">
            <div className="help-title">
              <span className="help-icon">💡</span>
              <h3>What is this AI Narrative?</h3>
            </div>
            <span className="toggle-icon">{showHelp ? '▼' : '▶'}</span>
          </div>

          {showHelp && (
            <div className="help-content">
              <p>This AI system analyzes real market data (price trends, technical indicators, volatility) using machine learning models to:</p>
              <ul>
                <li>Determine market sentiment (Bullish/Neutral/Bearish)</li>
                <li>Calculate conviction strength (High/Medium/Low)</li>
                <li>Assess risk and expected returns</li>
                <li>Generate English explanations of what the data means</li>
                <li>Tailor insights to YOUR investor profile</li>
              </ul>
              <div className="disclaimer-box">
                <strong>⚠️ This is NOT financial advice.</strong> Always do your own research and consult with financial advisors.
              </div>
            </div>
          )}
        </section>

        {/* Input Form */}
        <section className="card input-card">
          <div className="card-glow" />
          <h2 className="section-title">📋 Tell Us About Your Investment Profile</h2>

          <div className="form-grid">
            {/* Stock Symbol */}
            <div className="form-group full-width">
              <label>Stock Symbol <span className="required">*</span></label>
              <input
                type="text"
                value={selectedStock}
                onChange={(e) => setSelectedStock(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, MSFT, BRK.A, NVDA"
                className="input-field stock-input"
              />
            </div>

            {/* Investor Type */}
            <div className="form-group">
              <label>Your Investor Type <span className="required">*</span></label>
              <select
                value={investorType}
                onChange={(e) => setInvestorType(e.target.value as any)}
                className="select-field"
              >
                <option value="Conservative">Conservative (Capital Preservation)</option>
                <option value="Balanced">Balanced (Growth + Stability)</option>
                <option value="Aggressive">Aggressive (Growth Focused)</option>
              </select>
              <p className="field-desc">{investorDescriptions[investorType]}</p>
            </div>

            {/* Time Horizon */}
            <div className="form-group">
              <label>Investment Time Horizon <span className="required">*</span></label>
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value as any)}
                className="select-field"
              >
                <option value="short_term">Short-term (Days to Months)</option>
                <option value="medium_term">Medium-term (Months to Years)</option>
                <option value="long_term">Long-term (Years to Decades)</option>
              </select>
              <p className="field-desc">{timeHorizonDescriptions[timeHorizon]}</p>
            </div>

            {/* Investment Goal */}
            <div className="form-group full-width">
              <label>Primary Investment Goal <span className="optional">(Optional)</span></label>
              <select
                value={investmentGoal}
                onChange={(e) => setInvestmentGoal(e.target.value as any)}
                className="select-field"
              >
                <option value="">Select a goal...</option>
                <option value="Growth">Growth (Capital Appreciation)</option>
                <option value="Income">Income (Dividends & Yield)</option>
                <option value="Capital Protection">Capital Protection (Risk Minimization)</option>
                <option value="Trading">Trading (Short-term Tactics)</option>
              </select>
              {investmentGoal && (
                <p className="field-desc">
                  {investmentGoalDescriptions[investmentGoal as keyof typeof investmentGoalDescriptions]}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={runNarrative}
            disabled={loading}
            className="generate-button"
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Generating Insight...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                Generate AI Narrative
              </>
            )}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && result.narrative && (
          <>
            {/* Result Header */}
            <section className="sentiment-header" style={{
              background: `linear-gradient(135deg, ${sentimentColor[result.narrative.sentiment]}, ${sentimentColor[result.narrative.sentiment]}dd)`
            }}>
              <div className="sentiment-content">
                <h2 className="sentiment-title">{result.narrative.sentiment} Market Outlook</h2>
                <div className="sentiment-meta">
                  <span>{result.symbol}</span>
                  <span>•</span>
                  <span>Conviction: <strong>{result.narrative.conviction}</strong></span>
                  <span>•</span>
                  <span>Confidence: <strong>{result.narrative.confidence?.toFixed(1) || "N/A"}%</strong></span>
                  <span>•</span>
                  <span>Signal Strength: <strong>{result.narrative.signal_strength}</strong></span>
                </div>
              </div>
            </section>

            {/* Narrative Sections */}
            {result.narrative.sections && (
              <>
                <section className="card narrative-card market-summary">
                  <div className="card-glow" />
                  <h3 className="narrative-title">
                    <span className="narrative-icon">📊</span>
                    Market Summary
                  </h3>
                  <p className="narrative-text">{result.narrative.sections.market_summary}</p>
                </section>

                <section className="card narrative-card why-outlook">
                  <div className="card-glow" />
                  <h3 className="narrative-title">
                    <span className="narrative-icon">🔍</span>
                    Why This Outlook
                  </h3>
                  <p className="narrative-text">{result.narrative.sections.why_this_outlook}</p>
                </section>

                <section className="card narrative-card for-you">
                  <div className="card-glow" />
                  <h3 className="narrative-title">
                    <span className="narrative-icon">👤</span>
                    For {result.investor_context.investor_type} Investors
                  </h3>
                  <div className="investor-recommendation">
                    <div className="recommendation-badge">{result.investor_context.recommendation}</div>
                    {result.investor_context.action_guidance && (
                      <p className="narrative-text">{result.investor_context.action_guidance}</p>
                    )}
                  </div>
                </section>

                <section className="card narrative-card key-factors">
                  <div className="card-glow" />
                  <h3 className="narrative-title">
                    <span className="narrative-icon">📈</span>
                    Key Factors at a Glance
                  </h3>
                  <ul className="factors-list">
                    {result.narrative.sections.key_factors?.map((factor: string, idx: number) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </section>

                <div className="disclaimer-card">
                  <strong>⚠️ Important Disclaimer:</strong> {result.narrative.sections.disclaimer}
                </div>
              </>
            )}

            {/* Actions & Insights */}
            <section className="card actions-card">
              <div className="card-glow" />
              <h3 className="section-title">💡 Recommended Actions & Insights</h3>

              {result.investor_context.action_guidance && (
                <div className="action-section">
                  <h4>Suggested Action:</h4>
                  <p>{result.investor_context.action_guidance}</p>
                </div>
              )}

              {result.investor_context.insights && result.investor_context.insights.length > 0 && (
                <div className="insights-section">
                  <h4>Key Insights:</h4>
                  <ul>
                    {result.investor_context.insights.map((insight: string, idx: number) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* How to Use */}
            {result.explainability?.how_to_use && (
              <section className="card usage-card">
                <div className="card-glow" />
                <h3 className="section-title">
                  📚 {result.explainability.how_to_use.title}
                </h3>

                <div className="usage-section">
                  <h4>How to Interpret This Narrative:</h4>
                  <ol>
                    {result.explainability.how_to_use.steps?.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="notes-section">
                  <h4>Important Notes:</h4>
                  <ul>
                    {result.explainability.how_to_use.important_notes?.map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Metadata */}
            <div className="metadata">
              Generated: {new Date(result.timestamp).toLocaleString()} | Model: {result.explainability?.model_info} | Data Freshness: Live market data
            </div>
          </>
        )}
      </div>

      {/* STYLES */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* BACKGROUND - Same as other pages */
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
          max-width: 1200px;
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

        /* CARDS */
        .card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 28px;
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

        .help-card { animation-delay: 0.1s; cursor: pointer; }
        .input-card { animation-delay: 0.2s; }

        .card:hover {
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

        /* HELP CARD */
        .help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .help-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .help-icon {
          font-size: 28px;
        }

        .help-title h3 {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .toggle-icon {
          font-size: 20px;
          color: #38bdf8;
        }

        .help-content {
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }

        .help-content p {
          color: #cbd5e1;
          line-height: 1.8;
          margin-bottom: 16px;
        }

        .help-content ul {
          color: #cbd5e1;
          line-height: 1.8;
          padding-left: 24px;
          margin-bottom: 16px;
        }

        .help-content li {
          margin-bottom: 8px;
        }

        .disclaimer-box {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.15);
          border-left: 4px solid #ef4444;
          border-radius: 8px;
          color: #fca5a5;
          font-size: 14px;
        }

        /* FORM */
        .section-title {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .required {
          color: #ef4444;
        }

        .optional {
          color: #64748b;
          text-transform: none;
        }

        .input-field,
        .select-field {
          padding: 14px 18px;
          background: rgba(2, 6, 23, 0.9);
          border: 2px solid #334155;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .input-field:focus,
        .select-field:focus {
          outline: none;
          border-color: #38bdf8;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
          transform: translateY(-2px);
        }

        .stock-input {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          font-size: 18px;
        }

        .field-desc {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }

        .generate-button {
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

        .generate-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .generate-button:hover::before {
          left: 100%;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(37, 99, 235, 0.5);
        }

        .generate-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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

        /* ERROR CARD */
        .error-card {
          padding: 16px 20px;
          background: rgba(127, 29, 29, 0.3);
          border: 1px solid #991b1b;
          border-radius: 14px;
          color: #fca5a5;
          font-weight: 600;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: shake 0.5s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .error-icon {
          font-size: 24px;
        }

        /* SENTIMENT HEADER */
        .sentiment-header {
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: cardAppear 0.6s ease;
        }

        .sentiment-content {
          color: white;
        }

        .sentiment-title {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .sentiment-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          font-size: 14px;
          opacity: 0.95;
        }

        /* NARRATIVE CARDS */
        .narrative-card {
          animation-delay: 0.3s;
        }

        .narrative-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .narrative-icon {
          font-size: 24px;
        }

        .narrative-text {
          color: #cbd5e1;
          line-height: 1.9;
          font-size: 15px;
          position: relative;
          z-index: 1;
        }

        .investor-recommendation {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .recommendation-badge {
          display: inline-block;
          padding: 10px 20px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
          color: white;
          text-align: center;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
          width: fit-content;
        }

        .factors-list {
          padding-left: 24px;
          position: relative;
          z-index: 1;
        }

        .factors-list li {
          color: #cbd5e1;
          line-height: 1.8;
          margin-bottom: 12px;
        }

        .disclaimer-card {
          padding: 16px 20px;
          background: rgba(245, 158, 11, 0.15);
          border-left: 4px solid #f59e0b;
          border-radius: 14px;
          color: #fcd34d;
          font-size: 14px;
          margin-bottom: 28px;
        }

        /* ACTIONS CARD */
        .actions-card {
          animation-delay: 0.4s;
        }

        .action-section,
        .insights-section {
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }

        .action-section h4,
        .insights-section h4 {
          font-size: 16px;
          color: #38bdf8;
          margin-bottom: 12px;
        }

        .action-section p {
          color: #cbd5e1;
          line-height: 1.8;
        }

        .insights-section ul {
          padding-left: 24px;
        }

        .insights-section li {
          color: #cbd5e1;
          line-height: 1.7;
          margin-bottom: 10px;
        }

        /* USAGE CARD */
        .usage-card {
          animation-delay: 0.5s;
        }

        .usage-section,
        .notes-section {
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }

        .usage-section h4,
        .notes-section h4 {
          font-size: 16px;
          color: #22c55e;
          margin-bottom: 12px;
        }

        .usage-section ol,
        .notes-section ul {
          padding-left: 24px;
        }

        .usage-section li,
        .notes-section li {
          color: #cbd5e1;
          line-height: 1.7;
          margin-bottom: 10px;
        }

        /* METADATA */
        .metadata {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          padding: 20px;
          border-top: 1px solid rgba(56, 189, 248, 0.1);
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .container {
            padding: 20px 16px 60px;
            padding-top: 90px;
          }

          .main-title {
            font-size: 28px;
          }

          .header-content {
            padding: 24px;
          }

          .card {
            padding: 24px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .sentiment-title {
            font-size: 28px;
          }

          .sentiment-meta {
            font-size: 12px;
          }

          .tickers {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
