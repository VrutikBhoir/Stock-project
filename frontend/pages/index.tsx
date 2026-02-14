import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

export default function HomePage() {
  // 🔁 Redirect logged-in users to Predict page
  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        window.location.href = "/predict";
      }
    } catch {}
  }, []);

  return (
    <div className="container">
      <Head>
        <title>AI Stock Price Predictor | Smart Market Forecasting</title>
        <meta
          name="description"
          content="Predict stock prices using AI-powered ARIMA & SARIMAX models with technical indicators and risk analysis"
        />
      </Head>

      {/* HERO */}
      <section className="hero">
        <span className="badge">🚀 AI-Powered Market Intelligence</span>

        <h1>
          Predict Stock Prices <br />
          <span>With AI Precision</span>
        </h1>

        <p>
          Advanced stock forecasting using ARIMA, SARIMAX, technical indicators,
          AI risk scoring, and prediction analysis — all in one dashboard.
        </p>

        <div className="cta">
          <Link href="/predict">
            <button className="primary">🚀 Start Predicting</button>
          </Link>
          <Link href="/login">
            <button className="secondary">🔐 Login</button>
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <Stat value="94%+" label="Model Accuracy" />
        <Stat value="50+" label="Supported Stocks" />
        <Stat value="AI" label="Risk & Advisor Engine" />
        <Stat value="<1s" label="Prediction Speed" />
      </section>

      {/* FEATURES */}
      <section className="features">
        <h2>Why Use Our Platform?</h2>

        <div className="grid">
          <Feature
            icon="📈"
            title="Price Forecasting"
            desc="Short-term and long-term predictions with confidence bands"
          />
          <Feature
            icon="🧠"
            title="AI Predictions"
            desc="Price predictions with confidence scores & signals"
          />
          <Feature
            icon="⚠️"
            title="Risk Analysis"
            desc="Volatility-aware ML risk classification"
          />
          <Feature
            icon="📊"
            title="Technical Indicators"
            desc="RSI, MACD, SMA, EMA, Bollinger Bands"
          />
          <Feature
            icon="⚡"
            title="Live Market Data"
            desc="Near real-time price tracking & updates"
          />
          <Feature
            icon="🔒"
            title="Secure & Private"
            desc="No third-party tracking, no data selling"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps">
        <h2>How It Works</h2>

        <div className="step-grid">
          <Step num="1" title="Enter Stock" desc="Search any stock ticker" />
          <Step num="2" title="Run AI Model" desc="ML model analyzes patterns" />
          <Step num="3" title="View Forecast" desc="See future price & risk" />
          <Step num="4" title="Learn & Analyze" desc="Use AI insights for research & learning" />
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <p>© {new Date().getFullYear()} AI Stock Predictor</p>
        <p>Built with ❤️ using Machine Learning & Finance</p>
      </footer>

      {/* STYLES */}
      <style jsx>{`
        .container {
          min-height: 100vh;
          background: radial-gradient(circle at top, #020617, #000);
          color: #e5e7eb;
          font-family: Inter, sans-serif;
          padding: 2rem;
        }

        .hero {
          text-align: center;
          max-width: 900px;
          margin: 4rem auto 5rem;
        }

        .badge {
          display: inline-block;
          background: rgba(34, 211, 238, 0.15);
          border: 1px solid rgba(34, 211, 238, 0.4);
          padding: 0.4rem 1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #22d3ee;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: clamp(2.8rem, 6vw, 4.5rem);
          font-weight: 900;
          margin-bottom: 1.5rem;
        }

        h1 span {
          background: linear-gradient(to right, #22d3ee, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero p {
          max-width: 700px;
          margin: 0 auto 2.5rem;
          color: #94a3b8;
          font-size: 1.1rem;
          line-height: 1.7;
        }

        .cta {
          display: flex;
          justify-content: center;
          gap: 1.2rem;
          flex-wrap: wrap;
        }

        button {
          padding: 0.9rem 2.2rem;
          border-radius: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
        }

        .primary {
          background: linear-gradient(135deg, #22d3ee, #2563eb);
          color: #020617;
        }

        .secondary {
          background: transparent;
          border: 1px solid #334155;
          color: #e5e7eb;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 2rem;
          max-width: 900px;
          margin: 0 auto 5rem;
          text-align: center;
        }

        .features {
          max-width: 1100px;
          margin: 0 auto 5rem;
        }

        .features h2,
        .steps h2 {
          text-align: center;
          font-size: 2.2rem;
          margin-bottom: 3rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 2rem;
        }

        .steps {
          max-width: 900px;
          margin: 0 auto 5rem;
        }

        .step-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          text-align: center;
        }

        footer {
          border-top: 1px solid #1e293b;
          padding-top: 2rem;
          text-align: center;
          color: #64748b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

/* 🔹 Small Components */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#22d3ee" }}>
        {value}
      </div>
      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc }: any) {
  return (
    <div style={{
      background: "#020617",
      border: "1px solid #1e293b",
      borderRadius: "1rem",
      padding: "1.8rem"
    }}>
      <div style={{ fontSize: "2rem" }}>{icon}</div>
      <h3>{title}</h3>
      <p style={{ color: "#94a3b8" }}>{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "linear-gradient(135deg,#22d3ee,#2563eb)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 1rem",
        fontWeight: 900,
        color: "#020617"
      }}>
        {num}
      </div>
      <h4>{title}</h4>
      <p style={{ color: "#94a3b8" }}>{desc}</p>
    </div>
  );
}
