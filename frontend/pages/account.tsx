import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [pw1, setPw1] = useState<string>('');
  const [pw2, setPw2] = useState<string>('');

  // Auth state loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get Session & Profile
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        // Don't redirect here, let the UI show "Not Signed In" state
        return;
      }

      setUser(session.user);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setNameInput(data.username || '');
      }

      setLoading(false);
    };

    fetchData();

    // Local prefs
    const notif = localStorage.getItem('notificationsEnabled');
    if (notif != null) setNotificationsEnabled(notif === 'true');
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') setTheme(t);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!user) return;

    try {
      // 1. Delete Profile row
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // 2. Sign Out (Auth user deletion usually requires admin/edge function)
      await supabase.auth.signOut();

      alert('Account deleted successfully.');
      window.location.href = '/';
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete account: ' + err.message);
    }
  };






  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try { localStorage.setItem('notificationsEnabled', String(next)); } catch { }
  };

  const firstInitial = (profile?.username || '').trim().charAt(0).toUpperCase() || (user?.email || '').trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <Head><title>Account Settings | Stock Market Platform</title></Head>

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
              <div className="logo-icon">⚙️</div>
              <div>
                <h1 className="main-title">Account Settings</h1>
                <p className="subtitle">Manage your profile and preferences</p>
              </div>
            </div>
          </div>
        </header>

        {user ? (
          <>
            {/* Profile Card */}
            <section className="card profile-card">
              <div className="card-glow" />
              <div className="section-header">
                <div className="avatar-section">
                  <div className="avatar">
                    {firstInitial || '👤'}
                  </div>
                  <div>
                    <h2 className="section-title">Profile Information</h2>
                    <p className="section-desc">Update your personal details</p>
                  </div>
                </div>
              </div>

              <div className="settings-grid">
                {/* Username */}
                <div className="setting-item">
                  <label className="setting-label">Username</label>
                  <div className="setting-value">{profile?.username || '—'}</div>
                </div>

                {/* Email */}
                <div className="setting-item">
                  <label className="setting-label">Email Address</label>
                  <div className="setting-value">{user.email || '—'}</div>
                </div>

                {/* Display Name */}
                <div className="setting-item full-width">
                  <label className="setting-label">Update Username</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter your name"
                      className="input-field"
                    />
                    <button
                      className="save-button"
                      onClick={async () => {
                        const next = { ...user, name: nameInput || undefined };
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({ username: nameInput })
                            .eq('id', user.id);

                          if (error) alert('Error updating username');
                          else {
                            setProfile({ ...profile, username: nameInput });
                            alert('Username updated');
                          }
                        } catch { }
                      }}
                    >
                      💾 Save Username
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Card */}
            <section className="card security-card">
              <div className="card-glow" />
              <div className="section-header">
                <div className="icon-title">
                  <span className="section-icon">🔒</span>
                  <div>
                    <h2 className="section-title">Security</h2>
                    <p className="section-desc">Manage your password and security settings</p>
                  </div>
                </div>
              </div>

              <div className="password-section">
                <label className="setting-label">Change Password</label>
                <div className="password-inputs">
                  <input
                    type="password"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    placeholder="New password"
                    className="input-field"
                  />
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="Confirm new password"
                    className="input-field"
                  />
                </div>
                <button
                  className="update-button"
                  onClick={() => {
                    if (!pw1 || pw1.length < 6) { alert('Password must be at least 6 characters'); return; }
                    if (pw1 !== pw2) { alert('Passwords do not match'); return; }
                    try { localStorage.setItem('pw_set', 'true'); } catch { }
                    setPw1(''); setPw2('');
                    alert('Password updated (demo)');
                  }}
                >
                  🔐 Update Password
                </button>
              </div>
            </section>

            {/* Preferences Card */}
            <section className="card preferences-card">
              <div className="card-glow" />
              <div className="section-header">
                <div className="icon-title">
                  <span className="section-icon">🎨</span>
                  <div>
                    <h2 className="section-title">Preferences</h2>
                    <p className="section-desc">Customize your experience</p>
                  </div>
                </div>
              </div>

              <div className="preferences-grid">
                {/* Theme */}
                <div className="preference-item">
                  <div className="preference-header">
                    <span className="preference-icon">🌗</span>
                    <div>
                      <div className="preference-title">Theme</div>
                      <div className="preference-desc">Choose your preferred color scheme</div>
                    </div>
                  </div>
                  <select
                    className="theme-select"
                    value={theme}
                    onChange={(e) => {
                      const t = e.target.value === 'light' ? 'light' : 'dark';
                      setTheme(t);
                      try { localStorage.setItem('theme', t); } catch { }
                      try { document.documentElement.setAttribute('data-theme', t); } catch { }
                    }}
                  >
                    <option value="dark">🌙 Dark</option>
                    <option value="light">☀️ Light</option>
                  </select>
                </div>

                {/* Notifications */}
                <div className="preference-item">
                  <div className="preference-header">
                    <span className="preference-icon">{notificationsEnabled ? '🔔' : '🔕'}</span>
                    <div>
                      <div className="preference-title">Notifications</div>
                      <div className="preference-desc">Get alerts about market changes</div>
                    </div>
                  </div>
                  <button
                    className={`toggle-button ${notificationsEnabled ? 'active' : ''}`}
                    onClick={toggleNotifications}
                  >
                    {notificationsEnabled ? '✓ Enabled' : '✗ Disabled'}
                  </button>
                </div>
              </div>
            </section>

            {/* Danger Zone Card */}
            <section className="card danger-card">
              <div className="card-glow danger-glow" />
              <div className="section-header">
                <div className="icon-title">
                  <span className="section-icon">⚠️</span>
                  <div>
                    <h2 className="section-title">Danger Zone</h2>
                    <p className="section-desc">Irreversible actions</p>
                  </div>
                </div>
              </div>

              <div className="danger-actions">
                <button
                  className="logout-button"
                  onClick={handleLogout}
                >
                  <span className="btn-icon">🚪</span>
                  Logout
                </button>
                <button
                  className="delete-button"
                  onClick={handleDeleteAccount}
                >
                  <span className="btn-icon">🗑️</span>
                  Delete Account
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="not-signed-in-grid">
            <section className="card empty-card">
              <div className="card-glow" />
              <div className="empty-state">
                <div className="empty-icon">🔐</div>
                <h3>Not Signed In</h3>
                <p>Please log in or create an account to manage your settings.</p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
                  <a href="/login" className="login-link" style={{ textDecoration: 'none', color: '#38bdf8', fontWeight: 'bold' }}>
                    Login
                  </a>
                  <a href="/register" className="register-link" style={{ textDecoration: 'none', color: '#38bdf8', fontWeight: 'bold' }}>
                    Create Account
                  </a>
                </div>
              </div>
            </section>
          </div>
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
          max-width: 1000px;
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

        .profile-card { animation-delay: 0.1s; }
        .security-card { animation-delay: 0.2s; }
        .preferences-card { animation-delay: 0.3s; }
        .danger-card { animation-delay: 0.4s; }
        .empty-card { animation-delay: 0.1s; }

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

        .danger-glow {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.1), transparent 70%);
        }

        @keyframes cardGlowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* SECTION HEADERS */
        .section-header {
          margin-bottom: 32px;
          position: relative;
          z-index: 1;
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 700;
          color: white;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
          animation: avatarPulse 3s ease-in-out infinite;
        }

        @keyframes avatarPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(37, 99, 235, 0.6); }
        }

        .icon-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .section-icon {
          font-size: 32px;
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .section-desc {
          font-size: 14px;
          color: #94a3b8;
        }

        /* SETTINGS GRID */
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          position: relative;
          z-index: 1;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .setting-item.full-width {
          grid-column: 1 / -1;
        }

        .setting-label {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .setting-value {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          padding: 12px 20px;
          background: rgba(2, 6, 23, 0.5);
          border: 1px solid rgba(56, 189, 248, 0.1);
          border-radius: 12px;
        }

        .input-with-button {
          display: flex;
          gap: 12px;
        }

        .input-field {
          flex: 1;
          padding: 12px 20px;
          background: rgba(2, 6, 23, 0.8);
          border: 2px solid rgba(56, 189, 248, 0.2);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #38bdf8;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
        }

        .save-button, .update-button, .login-link, .predict-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .save-button:hover, .update-button:hover, .login-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
        }

        .password-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .password-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .preferences-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .preference-item {
          padding: 24px;
          background: rgba(2, 6, 23, 0.5);
          border: 1px solid rgba(56, 189, 248, 0.1);
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .preference-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .preference-icon {
          font-size: 24px;
        }

        .preference-title {
          font-weight: 700;
          color: #f1f5f9;
        }

        .preference-desc {
          font-size: 12px;
          color: #64748b;
        }

        .theme-select {
          padding: 8px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 8px;
          color: #f1f5f9;
          font-weight: 600;
          cursor: pointer;
        }

        .toggle-button {
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(56, 189, 248, 0.3);
          background: rgba(15, 23, 42, 0.8);
          color: #94a3b8;
        }

        .toggle-button.active {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border-color: #22c55e;
        }

        .danger-actions {
          display: flex;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .logout-button, .delete-button {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .logout-button {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #f1f5f9;
        }

        .delete-button {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .logout-button:hover {
          background: rgba(15, 23, 42, 1);
          border-color: #38bdf8;
          transform: translateY(-2px);
        }

        .delete-button:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .not-signed-in-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          position: relative;
          z-index: 1;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 8px;
        }

        .login-link {
          margin-top: 12px;
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .container { padding-top: 80px; }
          .settings-grid, .password-inputs, .preferences-grid, .danger-actions {
            grid-template-columns: 1fr;
          }
          .main-title { font-size: 32px; }
          .header-content { padding: 20px; }
        }
      `}</style >
    </>
  );
}
