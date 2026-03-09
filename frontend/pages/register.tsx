import { useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!email.trim()) throw new Error('Email is required');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email');
      if (!username.trim()) throw new Error('Username is required');
      if (!password) throw new Error('Password is required');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      if (password !== confirmPassword) throw new Error('Passwords do not match');

      // 1. Sign Up
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!data.user) throw new Error('Registration failed');

      // 2. Create Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username.trim(),
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        
        if (profileError.message?.includes('relation') || profileError.message?.includes('does not exist')) {
          throw new Error('Database not set up. Please run database_schema.sql in Supabase first.');
        }
        
        if (profileError.message?.includes('row-level security') || profileError.message?.includes('policy')) {
          throw new Error('Database permissions error. Please ensure RLS policies are set up correctly.');
        }
        
        if (profileError.message?.includes('duplicate') || profileError.message?.includes('unique')) {
          throw new Error('Username already taken. Please choose a different username.');
        }
        
        console.warn('⚠️ Profile creation failed, but auth succeeded. User can still login.');
      }

      console.log('✅ Signup successful');
      alert('✅ Account created! Please log in.');
      router.push('/login');
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | Stock Market Platform</title>
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
        {/* Register Card - Horizontal Layout */}
        <div className="register-card">
          <div className="card-glow" />

          {/* Left Side - Branding */}
          <div className="left-side">
            <div className="logo-icon">🚀</div>
            <h1 className="register-title">Join Us Today</h1>
            <p className="register-subtitle">Start your investment journey with AI power</p>

            {/* Features */}
            <div className="features">
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <span className="feature-text">Free Account</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📈</span>
                <span className="feature-text">Advanced Tools</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Secure Data</span>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="form-wrapper">
            {/* Email Input */}
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
            </div>

            {/* Username Input */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="input-field password-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔐</span>
                <input
                  id="confirmPassword"
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Register Button */}
            <button className="register-button" disabled={loading} onClick={handleRegister}>
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="btn-icon">✨</span>
                  Create Account
                </>
              )}
            </button>

            {/* Divider */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* Login Link */}
            <div className="signup-link">
              Already have an account?{' '}
              <a href="/login" className="link">Log in</a>
            </div>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* BACKGROUND */
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
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        /* REGISTER CARD - Horizontal Layout */
        .register-card {
          width: 100%;
          max-width: 1050px;
          height: 600px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 30px 80px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
          animation: cardAppear 0.8s ease;
          display: grid;
          grid-template-columns: 42% 58%;
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

        .card-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15), transparent 70%);
          animation: cardGlowRotate 10s linear infinite;
          pointer-events: none;
        }

        @keyframes cardGlowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* LEFT SIDE */
        .left-side {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
          padding: 50px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          border-right: 1px solid rgba(56, 189, 248, 0.2);
          position: relative;
          overflow: hidden;
        }

        .left-side::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.15), transparent 70%);
          animation: pulseGlow 4s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .logo-icon {
          font-size: 70px;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
          position: relative;
          z-index: 1;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .register-title {
          font-size: 38px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }

        .register-subtitle {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 35px;
          position: relative;
          z-index: 1;
        }

        /* FEATURES */
        .features {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          position: relative;
          z-index: 1;
          width: 100%;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(2, 6, 23, 0.4);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(2, 6, 23, 0.6);
          border-color: rgba(16, 185, 129, 0.4);
          transform: translateX(5px);
        }

        .feature-icon {
          font-size: 22px;
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .feature-item:nth-child(2) .feature-icon {
          animation-delay: 0.5s;
        }

        .feature-item:nth-child(3) .feature-icon {
          animation-delay: 1s;
        }

        .feature-text {
          font-size: 14px;
          color: #cbd5e1;
          font-weight: 600;
        }

        /* FORM */
        .form-wrapper {
          padding: 45px 45px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .input-group {
          margin-bottom: 18px;
        }

        .input-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          font-size: 18px;
          z-index: 1;
          pointer-events: none;
        }

        .input-field {
          width: 100%;
          padding: 13px 14px 13px 45px;
          background: rgba(2, 6, 23, 0.9);
          border: 2px solid #334155;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .password-field {
          padding-right: 45px;
        }

        .input-field:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.2);
          transform: translateY(-2px);
          background: rgba(2, 6, 23, 1);
        }

        .input-field::placeholder {
          color: #64748b;
        }

        .toggle-password {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 6px;
          z-index: 1;
          transition: transform 0.2s ease;
        }

        .toggle-password:hover {
          transform: scale(1.1);
        }

        /* ERROR */
        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          background: rgba(127, 29, 29, 0.3);
          border: 1px solid #991b1b;
          border-radius: 10px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
          animation: shake 0.5s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        .error-icon {
          font-size: 18px;
        }

        /* BUTTON */
        .register-button {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 16px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 10px 30px rgba(16, 185, 129, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .register-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .register-button:hover::before {
          left: 100%;
        }

        .register-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(16, 185, 129, 0.5);
        }

        .register-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 18px;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* DIVIDER */
        .divider {
          display: flex;
          align-items: center;
          margin: 18px 0;
          color: #64748b;
          font-size: 13px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(56, 189, 248, 0.2);
        }

        .divider span {
          padding: 0 14px;
        }

        /* SIGNUP LINK */
        .signup-link {
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        .link {
          color: #10b981;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .link:hover {
          color: #34d399;
          text-decoration: underline;
        }

        /* RESPONSIVE */
        @media (max-width: 1100px) {
          .register-card {
            max-width: 950px;
            height: 580px;
          }

          .left-side {
            padding: 40px 35px;
          }

          .form-wrapper {
            padding: 40px 40px;
          }

          .register-title {
            font-size: 34px;
          }

          .logo-icon {
            font-size: 60px;
          }
        }

        @media (max-width: 968px) {
          .register-card {
            grid-template-columns: 1fr;
            max-width: 500px;
            height: auto;
          }

          .left-side {
            border-right: none;
            border-bottom: 1px solid rgba(56, 189, 248, 0.2);
            padding: 35px 30px;
          }

          .form-wrapper {
            padding: 35px 30px;
          }

          .features {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .feature-item {
            flex-direction: column;
            padding: 12px;
            text-align: center;
          }

          .feature-text {
            font-size: 11px;
          }
        }

        @media (max-width: 768px) {
          .register-title {
            font-size: 28px;
          }

          .logo-icon {
            font-size: 50px;
          }

          .features {
            grid-template-columns: 1fr;
          }

          .feature-item {
            flex-direction: row;
            text-align: left;
          }

          .tickers {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
