import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AboutPage } from './components/AboutPage';
import { AuthActionPage } from './components/AuthActionPage';
import { AuthGatePage } from './components/AuthGatePage';
import { BlogPage } from './components/BlogPage';
import { ContactPage } from './components/ContactPage';
import { DashboardPage } from './components/DashboardPage';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Logo } from './components/Logo';
import { MoviesPage } from './components/MoviesPage';
import { Navbar } from './components/Navbar';
import { ProcessPage } from './components/ProcessPage';
import { EstimateSelectionPayload } from './components/ProjectEstimator';
import { OfflineIndicator } from './components/PWAControls';
import { ServicesPage } from './components/ServicesPage';
import { WhatsAppLauncher } from './components/WhatsAppLauncher';
import { WorkPage } from './components/WorkPage';
import { WhyPage } from './components/WhyPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { BLOG_ARTICLES } from './data/blogData';
import { PageRoute } from './data/siteData';
import { useAdminAutoMovieSync } from './hooks/useAdminAutoMovieSync';
import {
  captureReferralCodeFromUrl,
  clearPendingReferralCode,
  getPendingReferralCode,
  redeemReferralCodeAsInvitee,
} from './utils/referralUtils';

const ROUTE_TO_PATH: Record<PageRoute, string> = {
  home: '/',
  services: '/services',
  'why-0xdev': '/why-0xdev',
  process: '/process',
  work: '/work',
  blog: '/blog',
  movies: '/movies',
  about: '/about',
  contact: '/contact',
  dashboard: '/dashboard',
};

const ROUTE_TITLES: Record<PageRoute, string> = {
  home: '0xDEV | One Team. Every Layer of Your Technology.',
  services: 'Services & Tech Stack | 0xDEV',
  'why-0xdev': 'Why 0xDEV & Engagement Models | 0xDEV',
  process: 'Our 5-Stage Engineering Process | 0xDEV',
  work: 'Case Studies & Featured Work | 0xDEV',
  blog: 'Engineering Blog & Technical Insights | 0xDEV',
  movies: 'Movies & Free Offline Downloads | 0xDEV',
  about: 'About Us (Kabale, Uganda) | 0xDEV',
  contact: 'Contact & Project Brief | 0xDEV',
  dashboard: 'User Dashboard | 0xDEV',
};

function resolveRouteFromPathname(pathname: string): PageRoute {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (normalized === '/blog' || normalized.startsWith('/blog/')) {
    return 'blog';
  }
  if (normalized === '/movies' || normalized.startsWith('/movies/')) {
    return 'movies';
  }
  const matched = (Object.keys(ROUTE_TO_PATH) as PageRoute[]).find(
    (route) => ROUTE_TO_PATH[route] === normalized
  );
  return matched || 'home';
}

function resolveBlogSlugFromPathname(pathname: string): string | null {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (!normalized.startsWith('/blog/')) return null;
  const slug = normalized.slice('/blog/'.length).split('/')[0]?.trim();
  return slug || null;
}

function resolveMovieIdFromPathname(pathname: string): string | null {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (!trimmed.toLowerCase().startsWith('/movies/')) return null;
  const id = trimmed.slice('/movies/'.length).split('/')[0]?.trim();
  return id || null;
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7FB] dark:bg-[#090D1F] px-4 text-center">
          <div className="dark:hidden">
            <Logo variant="light" showEmblemAbove />
          </div>
          <div className="hidden dark:block">
            <Logo variant="dark" showEmblemAbove />
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
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
              className="rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-5 py-2.5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F]"
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

function isAuthPath(pathname: string): boolean {
  const norm = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return norm === '/login' || norm === '/register';
}

function AppShell() {
  const { isDark } = useTheme();
  const {
    user,
    loading,
    verificationSent,
    resendVerificationEmail,
    refreshUserStatus,
  } = useAuth();

  useAdminAutoMovieSync();

  const [isAuthActionRoute, setIsAuthActionRoute] = useState<boolean>(() => isEmailActionUrl());
  const [showAuthPortal, setShowAuthPortal] = useState<boolean>(() =>
    isAuthPath(window.location.pathname)
  );
  const [currentPage, setCurrentPage] = useState<PageRoute>(() =>
    resolveRouteFromPathname(window.location.pathname)
  );
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | null>(() =>
    resolveBlogSlugFromPathname(window.location.pathname)
  );
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(() =>
    resolveMovieIdFromPathname(window.location.pathname)
  );
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    window.location.pathname.toLowerCase().includes('register') ? 'register' : 'login'
  );
  const [preselectedService, setPreselectedService] = useState<string>('');
  const [preselectedBudget, setPreselectedBudget] = useState<string>('');
  const [preselectedMessage, setPreselectedMessage] = useState<string>('');
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [referralBanner, setReferralBanner] = useState<string | null>(null);

  const wasSignedInRef = useRef(false);
  const attemptedReferralRef = useRef<string | null>(null);
  const initialRoute = resolveRouteFromPathname(window.location.pathname);
  const returnTargetRef = useRef<{
    page: PageRoute;
    articleSlug: string | null;
    movieId: string | null;
  }>({
    page: initialRoute === 'home' ? 'movies' : initialRoute,
    articleSlug: resolveBlogSlugFromPathname(window.location.pathname),
    movieId: resolveMovieIdFromPathname(window.location.pathname),
  });

  const navigateTo = useCallback((page: PageRoute) => {
    const targetPath = ROUTE_TO_PATH[page] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
    setIsAuthActionRoute(false);
    setShowAuthPortal(false);
    setSelectedArticleSlug(null);
    setSelectedMovieId(null);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToArticle = useCallback((slug: string | null) => {
    const targetPath = slug ? `/blog/${slug}` : '/blog';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: 'blog', slug }, '', targetPath);
    }
    setIsAuthActionRoute(false);
    setShowAuthPortal(false);
    setSelectedMovieId(null);
    setCurrentPage('blog');
    setSelectedArticleSlug(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToMovie = useCallback((movieId: string | null) => {
    const targetPath = movieId ? `/movies/${movieId}` : '/movies';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: 'movies', movieId }, '', targetPath);
    }
    setIsAuthActionRoute(false);
    setShowAuthPortal(false);
    setSelectedArticleSlug(null);
    setCurrentPage('movies');
    setSelectedMovieId(movieId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuthPortal = useCallback(
    (mode: 'login' | 'register' = 'login', returnTo?: PageRoute) => {
      const targetPage = returnTo || currentPage || 'movies';
      returnTargetRef.current = {
        page: targetPage,
        articleSlug: targetPage === 'blog' ? selectedArticleSlug : null,
        movieId: targetPage === 'movies' ? selectedMovieId : null,
      };
      setAuthMode(mode);
      setShowAuthPortal(true);
      const authPath = mode === 'register' ? '/register' : '/login';
      if (window.location.pathname !== authPath) {
        window.history.pushState({ authMode: mode }, '', authPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentPage, selectedArticleSlug, selectedMovieId]
  );

  // Capture invite ?ref=CODE parameter on entry
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  // Automatically redeem pending invite referral bonus once authenticated user is verified
  useEffect(() => {
    if (!user || !user.emailVerified) return;
    const pendingCode = getPendingReferralCode();
    if (!pendingCode) return;
    const attemptKey = `${user.uid}:${pendingCode}`;
    if (attemptedReferralRef.current === attemptKey) return;
    attemptedReferralRef.current = attemptKey;

    let active = true;
    redeemReferralCodeAsInvitee({ user, rawCode: pendingCode })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setReferralBanner(res.message);
        } else if (
          res.status === 'already_referred' ||
          res.status === 'invalid_code' ||
          res.status === 'self_referral'
        ) {
          clearPendingReferralCode();
        }
      })
      .catch(() => {
        // Handled silently on background redeem; user can retry inside Dashboard -> Referral Program
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Keep browser URL aligned with authentication transitions
  useEffect(() => {
    if (loading || isAuthActionRoute) return;

    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (user) {
      const isFreshSignIn = !wasSignedInRef.current;
      wasSignedInRef.current = true;
      if (isFreshSignIn || showAuthPortal || path === '/login' || path === '/register') {
        const dest =
          path === '/' || path === '/login' || path === '/register'
            ? returnTargetRef.current
            : {
                page: resolveRouteFromPathname(window.location.pathname),
                articleSlug: resolveBlogSlugFromPathname(window.location.pathname),
                movieId: resolveMovieIdFromPathname(window.location.pathname),
              };
        const targetPath =
          dest.page === 'blog' && dest.articleSlug
            ? `/blog/${dest.articleSlug}`
            : dest.page === 'movies' && dest.movieId
              ? `/movies/${dest.movieId}`
              : ROUTE_TO_PATH[dest.page] || '/movies';
        setShowAuthPortal(false);
        setCurrentPage(dest.page);
        setSelectedArticleSlug(dest.articleSlug);
        setSelectedMovieId(dest.movieId);
        window.history.replaceState(
          { page: dest.page, slug: dest.articleSlug, movieId: dest.movieId },
          '',
          targetPath
        );
      }
      return;
    }

    // Signed out: reset any prior session back to plain login root
    if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      setVerifyFeedback(null);
      returnTargetRef.current = { page: 'movies', articleSlug: null, movieId: null };
      if (path !== '/' && path !== '/login' && path !== '/register') {
        window.history.replaceState({ page: 'login' }, '', '/');
      }
    }
  }, [user, loading, isAuthActionRoute, showAuthPortal]);

  useEffect(() => {
    let nextTitle = ROUTE_TITLES[currentPage];
    if (isAuthActionRoute) {
      nextTitle = 'Account Verification & Security | 0xDEV';
    } else if (!user) {
      nextTitle = authMode === 'register' ? 'Create Account | 0xDEV' : 'Sign In | 0xDEV';
    } else if (currentPage === 'blog' && selectedArticleSlug) {
      const matched = BLOG_ARTICLES.find((a) => a.slug === selectedArticleSlug);
      nextTitle = matched
        ? `${matched.title} | 0xDEV Blog`
        : 'Engineering Article | 0xDEV Blog';
    } else if (currentPage === 'movies' && selectedMovieId) {
      nextTitle = 'Movie Details & Offline Download | 0xDEV';
    }
    document.title = nextTitle;

    const fullUrl = window.location.origin + window.location.pathname;
    const ogImageUrl = `${window.location.origin}/og-logo-card.png`;

    let ogUrlMeta = document.querySelector('meta[property="og:url"]');
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.setAttribute('content', fullUrl);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', fullUrl);

    document.querySelector('meta[property="og:title"]')?.setAttribute('content', nextTitle);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', nextTitle);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', ogImageUrl);
    document
      .querySelector('meta[property="og:image:secure_url"]')
      ?.setAttribute('content', ogImageUrl);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', ogImageUrl);
  }, [
    user,
    authMode,
    currentPage,
    selectedArticleSlug,
    selectedMovieId,
    isAuthActionRoute,
    showAuthPortal,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      if (isEmailActionUrl()) {
        setIsAuthActionRoute(true);
        return;
      }
      setIsAuthActionRoute(false);
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (isAuthPath(path)) {
        setAuthMode(path === '/register' ? 'register' : 'login');
        setShowAuthPortal(true);
      } else {
        setShowAuthPortal(false);
        setCurrentPage(resolveRouteFromPathname(window.location.pathname));
        setSelectedArticleSlug(resolveBlogSlugFromPathname(window.location.pathname));
        setSelectedMovieId(resolveMovieIdFromPathname(window.location.pathname));
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

  const handleApplyEstimate = useCallback(
    (payload: EstimateSelectionPayload) => {
      setPreselectedService(payload.service);
      setPreselectedBudget(payload.budget);
      setPreselectedMessage(payload.summaryMessage);
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
            window.history.replaceState({ page: 'movies' }, '', '/movies');
            setCurrentPage('movies');
          } else {
            setAuthMode('login');
            setShowAuthPortal(true);
            window.history.replaceState({ authMode: 'login' }, '', '/');
          }
        }}
      />
    );
  }

  // Loading state while checking Firebase Auth session
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7FB] dark:bg-[#090D1F] px-4">
        <Logo variant={isDark ? 'dark' : 'light'} showEmblemAbove />
        <p className="mt-5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
          Checking your session...
        </p>
      </div>
    );
  }

  // Plain login screen on root entry & all routes when signed out
  if (!user) {
    return (
      <AuthGatePage
        initialMode={authMode}
        onModeChange={(nextMode) => {
          setAuthMode(nextMode);
          const nextPath = nextMode === 'register' ? '/register' : '/';
          if (window.location.pathname !== nextPath) {
            window.history.pushState({ authMode: nextMode }, '', nextPath);
          }
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#4A4F63] dark:bg-[#090D1F] dark:text-[#C2C9E0] transition-colors duration-200">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onSelectMovie={navigateToMovie}
        onSelectArticle={navigateToArticle}
        onOpenAuth={(mode) => openAuthPortal(mode, currentPage)}
      />

      {/* Quiet Verification Banner for newly registered email/password users */}
      {user && !user.emailVerified && (
        <div
          role="status"
          className="border-b border-[#EE1119]/25 bg-[#F6F7FB] dark:bg-[#111633] px-4 py-2.5 text-xs sm:text-sm text-[#1A1464] dark:text-[#F4F6FC] print:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p>
              <strong>Verify your email ({user.email})</strong> to save project inquiries and
              sync your profile.
              {verificationSent && !verifyFeedback && ' Verification link sent. Please check your inbox.'}
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
                        : 'Still waiting for verification. Please click the link in your inbox.'
                    );
                  } catch {
                    setVerifyFeedback('Unable to check verification status right now.');
                  } finally {
                    setVerifyBusy(false);
                  }
                }}
                className="rounded-lg bg-[#1A1464] dark:bg-[#2E368F] px-3 py-1 text-xs font-semibold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] disabled:opacity-60"
              >
                I have verified
              </button>
            </div>
          </div>
        </div>
      )}

      {referralBanner && (
        <div
          role="status"
          className="border-b border-[#10B981]/30 bg-[#ECFDF5] dark:bg-[#0D2A24] px-4 py-2.5 text-xs sm:text-sm text-[#065F46] dark:text-[#A7F3D0] print:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{referralBanner}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setReferralBanner(null);
                  navigateTo('dashboard');
                  window.setTimeout(() => {
                    document
                      .getElementById('referral-program')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }, 180);
                }}
                className="font-bold underline hover:opacity-80"
              >
                View DevCredits
              </button>
              <button
                type="button"
                onClick={() => setReferralBanner(null)}
                className="text-xs font-semibold opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 14, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentPage === 'home' && (
              <HomePage
                onNavigate={navigateTo}
                onSelectService={handleSelectService}
                onOpenArticle={(slug) => navigateToArticle(slug)}
              />
            )}
            {currentPage === 'services' && (
              <ServicesPage onNavigate={navigateTo} onSelectService={handleSelectService} />
            )}
            {currentPage === 'why-0xdev' && (
              <WhyPage
                onNavigate={navigateTo}
                onSelectEngagement={handleSelectEngagement}
                onApplyEstimate={handleApplyEstimate}
              />
            )}
            {currentPage === 'process' && <ProcessPage onNavigate={navigateTo} />}
            {currentPage === 'work' && <WorkPage onNavigate={navigateTo} />}
            {currentPage === 'blog' && (
              <BlogPage
                selectedSlug={selectedArticleSlug}
                onSelectArticle={navigateToArticle}
                onNavigate={navigateTo}
              />
            )}
            {currentPage === 'movies' && (
              <MoviesPage
                selectedMovieId={selectedMovieId}
                onSelectMovie={navigateToMovie}
                onNavigate={navigateTo}
                onRequestAuth={() => openAuthPortal('login', 'movies')}
              />
            )}
            {currentPage === 'about' && <AboutPage onNavigate={navigateTo} />}
            {currentPage === 'contact' && (
              <ContactPage
                preselectedService={preselectedService}
                preselectedBudget={preselectedBudget}
                preselectedMessage={preselectedMessage}
                onNavigate={navigateTo}
                onRequestAuth={() => openAuthPortal('login', 'contact')}
              />
            )}
            {currentPage === 'dashboard' && user && <DashboardPage onNavigate={navigateTo} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer onNavigate={navigateTo} />
      <WhatsAppLauncher />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </MotionConfig>
  );
}

