import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Dark theme matching the image
const THEME = {
  colors: {
    bg: '#0F1419',
    bgSecondary: '#1A1F29',
    textPrimary: '#E8EAED',
    textSecondary: '#9AA0A6',
    border: '#2D3139',
    hover: '#252A34',
    accent: '#00D09C',
  }
};

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const getInitials = () => {
    if (profile?.username) return profile.username[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  // Navigation links - AI Prediction Platform
  const links = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Prediction", path: "/predict", icon: "🎯" },
    { name: "Risk Analysis", path: "/RiskVsPredictionPlot", icon: "⚠️" },
    { name: "Narrative Engine", path: "/narrative", icon: "📝" },
    { name: "Event Impact", path: "/event-impact", icon: "⚡" },
  ];

  return (
    <>
      <div style={{ height: '70px' }} />

      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '70px',
        backgroundColor: THEME.colors.bg,
        borderBottom: `1px solid ${THEME.colors.border}`,
        boxShadow: isScrolled ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '1400px',
          width: '100%',
          height: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}>

          {/* Logo - Left */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#00D9FF',
                  letterSpacing: '0.5px',
                  lineHeight: '1'
                }}>
                  Stock Price Predictor
                </div>
              </div>
            </div>
          </Link>

          {/* Navigation Links - Center (Desktop) - ORIGINAL TABS */}
          <div className="desktop-only" style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            flex: 1,
            marginLeft: '48px'
          }}>
            {links.map((link) => {
              const isActive = router.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  style={{
                    textDecoration: 'none',
                    color: isActive ? THEME.colors.accent : THEME.colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '14px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(0, 208, 156, 0.1)' : 'transparent',
                    border: isActive ? `1px solid rgba(0, 208, 156, 0.2)` : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = THEME.colors.hover;
                      e.currentTarget.style.color = THEME.colors.textPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = THEME.colors.textSecondary;
                    }
                  }}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0
          }}>

            {/* Account Avatar / Login */}
            {user ? (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D09C, #3B82F6)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 208, 156, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {getInitials()}
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    width: '200px',
                    background: THEME.colors.bgSecondary,
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    padding: '8px',
                    zIndex: 1001,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{
                      padding: '12px',
                      borderBottom: `1px solid ${THEME.colors.border}`,
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.colors.textPrimary }}>
                        {profile?.username || 'User'}
                      </div>
                      <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        color: THEME.colors.textPrimary,
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = THEME.colors.hover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>⚙️</span> Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        color: '#ef4444',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="desktop-only" style={{ display: 'flex', gap: '12px' }}>
                <Link
                  href="/login"
                  style={{
                    padding: '8px 20px',
                    color: THEME.colors.textPrimary,
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  style={{
                    padding: '8px 20px',
                    background: THEME.colors.accent,
                    color: '#000',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 4px 14px rgba(0, 208, 156, 0.4)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 208, 156, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 208, 156, 0.4)';
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}



            {/* Mobile Hamburger */}
            <button
              className="mobile-only"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: THEME.colors.textPrimary,
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '70px',
            left: 0,
            right: 0,
            backgroundColor: THEME.colors.bgSecondary,
            borderBottom: `1px solid ${THEME.colors.border}`,
            padding: '20px 32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 999,
          }}>
            {links.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  color: router.pathname === link.path ? THEME.colors.accent : THEME.colors.textSecondary,
                  fontWeight: '600',
                  fontSize: '15px',
                  padding: '12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                {link.name}
              </Link>
            ))}

            {/* Mobile Search */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: THEME.colors.textSecondary,
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}>
              <svg
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </button>
          </div>
        )}
      </nav>

      {/* Responsive CSS & Keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .desktop-only { display: flex; }
        .mobile-only { display: none; }
        
        @media (max-width: 1024px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        
        * { box-sizing: border-box; }
      `}</style>
    </>
  );
}
