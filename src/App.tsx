import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AboutPage } from './components/AboutPage';
import { AuthActionPage } from './components/AuthActionPage';
import { AuthGatePage } from './components/AuthGatePage';
import { ContactPage } from './components/ContactPage';
import { DashboardPage } from './components/DashboardPage';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Logo } from './components/Logo';
import { Navbar } from './components/Navbar';
import { ProcessPage } from './components/ProcessPage';
import { ServicesPage } from './components/ServicesPage';
import { WorkPage } from './components/WorkPage';
import { WhyPage } from './components/WhyPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageRoute } from './data/siteData';

const ROUTE_TO_PATH: Record<PageRoute, string> = {
  home: '/',
  services: '/services',
  'why-0xdev': '/why-0xdev',
  process: '/process',
  work: '/work',
  about: '/about',
  contact: '/contact',
  dashboard: '/dashboard',
};

const ROUTE_TITLES: Record<PageRoute, string> = {
  home: '0xDEV — One Team. Every Layer of Your Technology.',
  services: 'Services & Tech Stack — 0xDEV',
  'why-0xdev': 'Why 0xDEV & Engagement Models — 0xDEV',
  process: 'Our 5-Stage Engineering Process — 0xDEV',
  work: 'Case Studies & Featured Work — 0xDEV',
  about: 'About Us (Kabale, Uganda) — 0xDEV',
  contact: 'Contact & Project Brief — 0xDEV',
  dashboard: 'User Dashboard — 0xDEV',
};

function resolveRouteFromPathname(pathname: string): PageRoute {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const matched = (Object.keys(ROUTE_TO_PATH) as PageRoute[]).find(
    (route) => ROUTE_TO_PATH[route] === normalized
  );
  return matched || 'home';
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Application render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7FB] px-4 text-center">
          <Logo variant="light" showEmblemAbove />
          <h1 className="mt-6 font-display text-2xl font-extrabold text-[#1A1464]">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#4A4F63]">
            An unexpected display error occurred. Reload or return to the 0xDEV home view to
            continue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
              }}
              className="rounded-xl bg-[#EE1119] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D00D14]"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                window.history.replaceState({ page: 'home' }, '', '/');
                window.location.reload();
              }}
              className="rounded-xl border border-[#1A1464] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1464] hover:bg-[#1A1464] hover:text-white"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function isEmailActionUrl(): boolean {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const hasActionParams =
    Boolean(params.get('oobCode')) &&
    (mode === 'verifyEmail' || mode === 'resetPassword' || mode === 'recoverEmail');
  return path === '/auth-action' || hasActionParams;
}

function AppShell() {
  const {
    user,
    loading,
    verificationSent,
    resendVerificationEmail,
    refreshUserStatus,
  } = useAuth();

  const [isAuthActionRoute, setIsAuthActionRoute] = useState<boolean>(() => isEmailActionUrl());
  const [currentPage, setCurrentPage] = useState<PageRoute>(() =>
    resolveRouteFromPathname(window.location.pathname)
  );
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    window.location.pathname.toLowerCase().includes('register') ? 'register' : 'login'
  );
  const [preselectedService, setPreselectedService] = useState<string>('');
  const [preselectedBudget, setPreselectedBudget] = useState<string>('');
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const wasSignedInRef = useRef(false);
  const isSignedInRef = useRef(false);
  isSignedInRef.current = Boolean(user);

  const navigateTo = useCallback((page: PageRoute) => {
    const targetPath = ROUTE_TO_PATH[page] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
    setIsAuthActionRoute(false);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Keep browser URL aligned with authentication transitions
  useEffect(() => {
    if (loading || isAuthActionRoute) return;

    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (user) {
      wasSignedInRef.current = true;
      if (path === '/login' || path === '/register') {
        const targetPath = ROUTE_TO_PATH[currentPage] || '/';
        window.history.replaceState({ page: currentPage }, '', targetPath);
      }
      return;
    }

    // Signed out
    if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      setCurrentPage('home');
      setVerifyFeedback(null);
    }
    const authPath = authMode === 'register' ? '/register' : '/login';
    if (path !== '/login' && path !== '/register') {
      window.history.replaceState({ authMode }, '', authPath);
    }
  }, [user, loading, authMode, currentPage, isAuthActionRoute]);

  useEffect(() => {
    if (isAuthActionRoute) {
      document.title = 'Account Verification & Security — 0xDEV';
      return;
    }
    if (!user) {
      document.title =
        authMode === 'register'
          ? 'Create Account — 0xDEV Client Portal'
          : 'Sign In — 0xDEV Client Portal';
      return;
    }
    document.title = ROUTE_TITLES[currentPage];
  }, [user, authMode, currentPage, isAuthActionRoute]);

  useEffect(() => {
    const handlePopState = () => {
      if (isEmailActionUrl()) {
        setIsAuthActionRoute(true);
        return;
      }
      setIsAuthActionRoute(false);
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (!isSignedInRef.current) {
        setAuthMode(path === '/register' ? 'register' : 'login');
      } else if (path === '/login' || path === '/register') {
        setCurrentPage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
      } else {
        setCurrentPage(resolveRouteFromPathname(window.location.pathname));
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectService = useCallback(
    (serviceTitle: string) => {
      setPreselectedService(serviceTitle);
      navigateTo('contact');
    },
    [navigateTo]
  );

  const handleSelectEngagement = useCallback(
    (modelName: string, budgetHint: string) => {
      setPreselectedService('Full-Stack (Multiple Layers)');
      setPreselectedBudget(budgetHint);
      void modelName;
      navigateTo('contact');
    },
    [navigateTo]
  );

  // Branded email verification & password reset handler (/auth-action)
  if (isAuthActionRoute) {
    return (
      <AuthActionPage
        onDone={(target) => {
          setIsAuthActionRoute(false);
          if (target === 'home' && user) {
            window.history.replaceState({ page: 'home' }, '', '/');
            setCurrentPage('home');
          } else {
            setAuthMode('login');
            window.history.replaceState({ authMode: 'login' }, '', '/login');
          }
        }}
      />
    );
  }

  // Loading state while checking Firebase Auth session
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7FB] px-4">
        <Logo variant="light" showEmblemAbove />
        <p className="mt-5 text-sm font-semibold text-[#1A1464]">
          Checking your session...
        </p>
      </div>
    );
  }

  // Gate: every visitor must log in or register before viewing site content
  if (!user) {
    return (
      <AuthGatePage
        initialMode={authMode}
        onModeChange={(nextMode) => {
          setAuthMode(nextMode);
          const nextPath = nextMode === 'register' ? '/register' : '/login';
          if (window.location.pathname !== nextPath) {
            window.history.pushState({ authMode: nextMode }, '', nextPath);
          }
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#4A4F63]">
      <Navbar currentPage={currentPage} onNavigate={navigateTo} />

      {/* Quiet Verification Banner for newly registered email/password users */}
      {!user.emailVerified && (
        <div
          role="status"
          className="border-b border-[#EE1119]/25 bg-[#F6F7FB] px-4 py-2.5 text-xs sm:text-sm text-[#1A1464]"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p>
              <strong>Verify your email ({user.email})</strong> to save project inquiries and
              sync your profile.
              {verificationSent && !verifyFeedback && ' Verification link sent—check your inbox.'}
              {verifyFeedback && ` ${verifyFeedback}`}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={verifyBusy}
                onClick={async () => {
                  setVerifyBusy(true);
                  setVerifyFeedback(null);
                  try {
                    await resendVerificationEmail();
                    setVerifyFeedback('Verification email re-sent.');
                  } catch {
                    setVerifyFeedback('Please wait a moment before requesting another link.');
                  } finally {
                    setVerifyBusy(false);
                  }
                }}
                className="font-bold text-[#EE1119] hover:underline disabled:opacity-60"
              >
                Resend link
              </button>
              <button
                type="button"
                disabled={verifyBusy}
                onClick={async () => {
                  setVerifyBusy(true);
                  setVerifyFeedback(null);
                  try {
                    const verified = await refreshUserStatus();
                    setVerifyFeedback(
                      verified
                        ? 'Email verified!'
                        : 'Still awaiting verification—please click the link in your inbox.'
                    );
                  } catch {
                    setVerifyFeedback('Unable to check verification status right now.');
                  } finally {
                    setVerifyBusy(false);
                  }
                }}
                className="rounded-lg bg-[#1A1464] px-3 py-1 text-xs font-semibold text-white hover:bg-[#120D4A] disabled:opacity-60"
              >
                I have verified
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentPage === 'home' && (
              <HomePage onNavigate={navigateTo} onSelectService={handleSelectService} />
            )}
            {currentPage === 'services' && (
              <ServicesPage onNavigate={navigateTo} onSelectService={handleSelectService} />
            )}
            {currentPage === 'why-0xdev' && (
              <WhyPage onNavigate={navigateTo} onSelectEngagement={handleSelectEngagement} />
            )}
            {currentPage === 'process' && <ProcessPage onNavigate={navigateTo} />}
            {currentPage === 'work' && <WorkPage onNavigate={navigateTo} />}
            {currentPage === 'about' && <AboutPage onNavigate={navigateTo} />}
            {currentPage === 'contact' && (
              <ContactPage
                preselectedService={preselectedService}
                preselectedBudget={preselectedBudget}
                onNavigate={navigateTo}
              />
            )}
            {currentPage === 'dashboard' && <DashboardPage onNavigate={navigateTo} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer onNavigate={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ErrorBoundary>
    </MotionConfig>
  );
}

