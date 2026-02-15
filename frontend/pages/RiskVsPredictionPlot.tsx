import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { fetchRiskVsPrediction } from "../lib/api";
import RiskSummaryCards from "../components/dashboard/RiskSummaryCards";
import Head from "next/head";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false
});

export default function RiskVsPredictionPlot() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskVsPrediction().then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const {
    risk_levels = [],
    predicted_prices = [],
    actual_prices = [],
    statistics = {},
    prediction_suppressed = [],
    suppression_message = ""
  } = data || {};

  const colors = risk_levels.map((r: number) => {
    if (r < 0.3) return "green";
    if (r < 0.7) return "orange";
    return "red";
  });

  const upper = predicted_prices.map(
    (p: number) => p + (statistics.mean_absolute_error || 0)
  );
  const lower = predicted_prices.map(
    (p: number) => p - (statistics.mean_absolute_error || 0)
  );

  const sampledRisk = risk_levels;
  const sampledActual = actual_prices;
  const sampledPredicted = predicted_prices;
  const isSuppressed = prediction_suppressed.some((flag: boolean) => flag);

  return (
    <>
      <Head>
        <title>Risk vs Prediction Analysis | Stock Market Platform</title>
      </Head>

      {/* STOCK MARKET THEMED BACKGROUND */}
      <div className="bg">
        {/* Market Grid */}
        <div className="market-grid" />

        {/* Floating Stock Tickers */}
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

        {/* Candlestick Charts */}
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
          {['$', '%', '↑', '↓', '€', '¥', '£', '₿'].map((symbol, i) => (
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
              <div className="logo-icon">📊</div>
              <div>
                <h1 className="main-title">Risk vs Prediction Analysis</h1>
                <p className="subtitle">AI-powered risk assessment and price prediction analytics</p>
              </div>
            </div>
            <div className="stats-mini">
              <div className="stat-item">
                <span className="stat-value">Real-time</span>
                <span className="stat-label">Analytics</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">AI</span>
                <span className="stat-label">Powered</span>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-section">
            <div className="loading-card">
              <div className="loading-spinner" />
              <h3>Loading Analytics...</h3>
              <p>Fetching risk and prediction data</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {data && (
              <div className="summary-section">
                <RiskSummaryCards
                  stats={data.statistics}
                  riskConfidence={data.risk_confidence}
                />
              </div>
            )}

            {/* Charts Section */}
            {isSuppressed && (
              <section className="card info-card">
                <div className="card-glow" />
                <div className="info-content">
                  <div className="info-icon">⚠️</div>
                  <div className="info-text">
                    <h3>Prediction Suppressed</h3>
                    <p>{suppression_message || "Market too volatile for reliable prediction today."}</p>
                  </div>
                </div>
              </section>
            )}
            <section className="card chart-card">
              <div className="card-glow" />
              <div className="section-header">
                <h2 className="section-title">📉 Prediction Error Analysis</h2>
                <p className="section-desc">Absolute error distribution across risk levels</p>
              </div>
              <div className="chart-wrapper">
                <Plot
                  data={[
                    {
                      x: sampledRisk,
                      y: sampledActual.map((a: number, i: number) =>
                        sampledPredicted[i] == null ? null : Math.abs(a - sampledPredicted[i])
                      ),
                      type: "bar",
                      name: "Prediction Error",
                      marker: {
                        color: "#ef4444",
                        line: { color: "#dc2626", width: 1 }
                      }
                    }
                  ]}
                  layout={{
                    title: {
                      text: "Prediction Error vs Risk Level",
                      font: { size: 18, color: "#f1f5f9", weight: 700 }
                    },

                    xaxis: {
                      title: "Risk Level",
                      gridcolor: "#1e293b",
                      color: "#94a3b8"
                    },

                    yaxis: {
                      title: "Absolute Error (₹)",
                      gridcolor: "#1e293b",
                      color: "#94a3b8"
                    },

                    /* 👇 ADD THIS EXACTLY HERE */
                    shapes: [
                      {
                        type: "rect",
                        xref: "x",
                        yref: "paper",
                        x0: 0,
                        x1: 0.3,
                        y0: 0,
                        y1: 1,
                        fillcolor: "rgba(34,197,94,0.08)", // Low Risk
                        line: { width: 0 }
                      },
                      {
                        type: "rect",
                        x0: 0.3,
                        x1: 0.7,
                        y0: 0,
                        y1: 1,
                        fillcolor: "rgba(234,179,8,0.08)", // Medium Risk
                        line: { width: 0 }
                      },
                      {
                        type: "rect",
                        x0: 0.7,
                        x1: 1,
                        y0: 0,
                        y1: 1,
                        fillcolor: "rgba(239,68,68,0.08)", // High Risk
                        line: { width: 0 }
                      }
                    ],

                    height: 400,
                    plot_bgcolor: "rgba(2, 6, 23, 0.6)",
                    paper_bgcolor: "transparent",
                    font: { color: "#e5e7eb", family: "system-ui" },
                    margin: { t: 60, l: 60, r: 30, b: 60 },
                    hovermode: "closest"
                  }}


                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </section>

            <section className="card chart-card">
              <div className="card-glow" />
              <div className="section-header">
                <h2 className="section-title">📈 Price Comparison</h2>
                <p className="section-desc">Actual vs predicted stock prices across risk spectrum</p>
              </div>
              <div className="chart-wrapper">
                <Plot
                  data={[
                    {
                      x: sampledRisk,
                      y: sampledActual,
                      type: "scatter",
                      mode: "lines+markers",
                      name: "Actual Price",
                      line: { width: 3, color: "#22c55e" },
                      marker: { size: 6, color: "#22c55e" }
                    },
                    {
                      x: sampledRisk,
                      y: sampledPredicted,
                      type: "scatter",
                      mode: "lines+markers",
                      name: "Predicted Price",
                      line: { width: 3, dash: "dash", color: "#f97316" },
                      marker: { size: 6, color: "#f97316" }
                    }
                  ]}
                  layout={{
                    title: {
                      text: "Actual vs Predicted Price across Risk Levels",
                      font: { size: 18, color: "#f1f5f9", weight: 700 }
                    },
                    xaxis: {
                      title: "Risk Level",
                      gridcolor: "#1e293b",
                      color: "#94a3b8"
                    },
                    yaxis: {
                      title: "Stock Price (₹)",
                      gridcolor: "#1e293b",
                      color: "#94a3b8"
                    },
                    height: 450,
                    plot_bgcolor: "rgba(2, 6, 23, 0.6)",
                    paper_bgcolor: "transparent",
                    font: { color: "#e5e7eb", family: "system-ui" },
                    legend: {
                      orientation: "h",
                      y: -0.2,
                      x: 0.5,
                      xanchor: "center",
                      bgcolor: "rgba(15, 23, 42, 0.8)",
                      bordercolor: "#38bdf8",
                      borderwidth: 1
                    },
                    margin: { t: 60, l: 60, r: 30, b: 80 },
                    hovermode: "x unified"
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </section>

            <section className="card info-card">
              <div className="card-glow" />
              <div className="info-content">
                <div className="info-icon">🧠</div>
                <div className="info-text">
                  <h3>AI Insights</h3>
                  <ul style={{ lineHeight: "1.8", paddingLeft: "18px" }}>
                    <li>
                      ✅ Predictions are most reliable in <strong>Low Risk</strong> zones.
                    </li>
                    <li>
                      ⚠️ Error increases noticeably in <strong>Medium Risk</strong> conditions.
                    </li>
                    <li>
                      🔴 High Risk regions show unstable prediction behavior.
                    </li>
                    <li>
                      💡 Use AI predictions cautiously when risk level exceeds <strong>0.7</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Info Card */}
            <section className="card info-card">
              <div className="card-glow" />
              <div className="info-content">
                <div className="info-icon">💡</div>
                <div className="info-text">
                  <h3>Understanding the Charts</h3>
                  <p>
                    The <strong>Prediction Error</strong> chart shows how our AI model performs across different risk levels.
                    Lower bars indicate better prediction accuracy. The <strong>Price Comparison</strong> chart displays
                    the relationship between actual market prices (green) and AI predictions (orange) as risk levels change.
                  </p>
                </div>
              </div>
            </section>
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

        /* LOADING */
        .loading-section {
          margin-bottom: 40px;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loading-card {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 24px;
          padding: 60px 40px;
          text-align: center;
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-card h3 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #f1f5f9;
        }

        .loading-card p {
          color: #94a3b8;
        }

        /* SUMMARY SECTION */
        .summary-section {
          margin-bottom: 40px;
          animation: fadeIn 1s ease;
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

        .chart-card:nth-of-type(1) { animation-delay: 0.2s; }
        .chart-card:nth-of-type(2) { animation-delay: 0.3s; }
        .info-card { animation-delay: 0.4s; }

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
          font-size: 14px;
          color: #94a3b8;
        }

        .chart-wrapper {
          position: relative;
          z-index: 1;
          background: rgba(2, 6, 23, 0.4);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(56, 189, 248, 0.1);
        }

        /* INFO CARD */
        .info-content {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }

        .info-icon {
          font-size: 40px;
          flex-shrink: 0;
          animation: bounce 2s infinite;
        }

        .info-text h3 {
          font-size: 20px;
          color: #f1f5f9;
          margin-bottom: 12px;
        }

        .info-text p {
          color: #cbd5e1;
          line-height: 1.8;
          font-size: 15px;
        }

        .info-text strong {
          color: #38bdf8;
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

          .stats-mini {
            display: none;
          }

          .card {
            padding: 24px;
          }

          .chart-wrapper {
            padding: 12px;
          }

          .tickers {
            display: none;
          }

          .info-content {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
