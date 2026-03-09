import type { AppProps } from 'next/app';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { StockProvider } from '../components/StockContext';
import { supabase } from '../lib/supabase';

const PUBLIC_ROUTES = new Set(['/','/login','/register']);

function FullPageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: '#e2e8f0',
        fontSize: '14px',
        letterSpacing: '0.3px',
      }}
    >
      Loading...
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(() => !PUBLIC_ROUTES.has(router.pathname));
  const [isAuthed, setIsAuthed] = useState(() => PUBLIC_ROUTES.has(router.pathname));

  const isPublicRoute = useMemo(() => PUBLIC_ROUTES.has(router.pathname), [router.pathname]);
  const showNavbar = !['/login', '/register'].includes(router.pathname);

  useEffect(() => {
    let alive = true;

    if (isPublicRoute) {
      setCheckingAuth(false);
      setIsAuthed(true);
      return () => {
        alive = false;
      };
    }

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;

      if (!session) {
        setIsAuthed(false);
        setCheckingAuth(false);
        router.replace('/login');
        return;
      }

      setIsAuthed(true);
      setCheckingAuth(false);
    };

    check();

    return () => {
      alive = false;
    };
  }, [isPublicRoute, router]);

  if (checkingAuth) {
    return <FullPageLoader />;
  }

  if (!isPublicRoute && !isAuthed) {
    return <FullPageLoader />;
  }

  return (
    <StockProvider>
      {showNavbar ? <Navbar /> : null}
      <Component {...pageProps} />
      <style jsx global>{`
        html, body, #__next { height: 100%; }
        * { box-sizing: border-box; }
      `}</style>
    </StockProvider>
  );
}
