import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COUNTRIES, stripLeadingDialCode } from '../data/countries';
import { CaseStudy, COMPANY_CONTACT } from '../data/siteData';
import { usePortfolioProjects } from '../hooks/usePortfolioProjects';
import { Logo } from './Logo';
import { EASE_OUT_EXPO, MaskLine, SPRING_SNAPPY, StaggerGrid, StaggerItem } from './MotionPrimitives';
import {
  ProjectPreviewModal,
  ProjectPreviewScreen,
  WorkShowcaseModal,
} from './ProjectPreviewVisual';

interface AuthGatePageProps {
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
  onBrowsePublic?: () => void;
}

export const AuthGatePage: React.FC<AuthGatePageProps> = ({
  initialMode = 'login',
  onModeChange,
  onBrowsePublic,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const {
    authError,
    emailProviderDisabled,
    clearAuthError,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [resetView, setResetView] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { projects } = usePortfolioProjects();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [inspectedStudy, setInspectedStudy] = useState<CaseStudy | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [regDialCode, setRegDialCode] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState<{
    name?: string;
    email?: string;
    country?: string;
    phone?: string;
    password?: string;
    confirm?: string;
  }>({});

  useEffect(() => {
    setMode(initialMode);
    setResetView(false);
  }, [initialMode]);

  useEffect(() => {
    if (previewPaused || showcaseOpen || inspectedStudy || projects.length === 0) return;
    const id = window.setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % projects.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [previewPaused, showcaseOpen, inspectedStudy, projects.length]);

  const activePreviewStudy = projects[previewIndex % Math.max(1, projects.length)] || projects[0];

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setResetView(false);
    setResetError(null);
    setResetSentTo(null);
    clearAuthError();
    setLoginErrors({});
    setRegErrors({});
    if (onModeChange) onModeChange(nextMode);
  };

  const handleCountrySelect = (countryName: string) => {
    const selected = COUNTRIES.find((c) => c.name === countryName);
    const nextDialCode = selected ? selected.dialCode : '';
    const localPart = stripLeadingDialCode(regPhone, regDialCode);

    const nextPhone = nextDialCode
      ? localPart
        ? `${nextDialCode} ${localPart}`
        : `${nextDialCode} `
      : localPart;

    setRegCountry(countryName);
    setRegDialCode(nextDialCode);
    setRegPhone(nextPhone);
    if (authError) clearAuthError();
    if (regErrors.country) setRegErrors((prev) => ({ ...prev, country: undefined }));
  };

  const handleGoogleClick = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled inside AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!loginPassword || loginPassword.length < 6) {
      errs.password = 'Please enter your password.';
    }
    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch {
      // Handled inside AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSentTo(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordReset(resetEmail);
      setResetSentTo(resetEmail.trim());
    } catch {
      // Handled inside AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof regErrors = {};
    if (!regName.trim() || regName.trim().length < 2) {
      errs.name = 'Please enter your full name.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!regCountry) {
      errs.country = 'Please select your country.';
    }
    const digits = regPhone.replace(/\D/g, '');
    if (digits.length < 7) {
      errs.phone = 'Please enter a valid phone number.';
    }
    if (regPassword.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (regPassword !== regConfirm) {
      errs.confirm = 'Passwords do not match.';
    }
    setRegErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await registerWithEmail({
        name: regName,
        email: regEmail,
        password: regPassword,
        country: regCountry,
        phone: regPhone,
      });
    } catch {
      // Handled inside AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#090D1F] flex flex-col lg:grid lg:grid-cols-12 transition-colors duration-200">
      {/* Left Branded Portal Panel (Deep Navy) */}
      <aside className="relative overflow-hidden bg-[#1A1464] dark:bg-[#0E1330] dark:border-r dark:border-[#242C54] px-6 py-10 text-white sm:px-10 lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 -skew-x-12 bg-[#EE1119]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-12 h-1.5 w-28 -skew-x-24 bg-[#EE1119]"
        />

        <div className="relative">
          <Logo variant="dark" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
            Client &amp; Visitor Access Portal
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white text-balance">
            <MaskLine delay={0.05}>One Team. Every Layer</MaskLine>
            <MaskLine delay={0.14}>of Your Technology.</MaskLine>
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-white/80">
            Sign in or register for free to view 0xDEV&apos;s software, cloud, and security
            services, past client builds, and direct project desk.
          </p>

          <StaggerGrid className="mt-8 space-y-3.5 text-sm text-white/90" staggerDelay={0.07}>
            {[
              'Browse our 9 core software, cloud & security services',
              'Read detailed case study metrics and architecture notes',
              'Send a freelance or full-product project brief directly',
            ].map((item) => (
              <StaggerItem key={item}>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
          {/* Interactive "See Some of Our Work" Live Preview Strip */}
          <div
            className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm"
            onMouseEnter={() => setPreviewPaused(true)}
            onMouseLeave={() => setPreviewPaused(false)}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  See Some of Our Work
                </p>
                <p className="font-display text-sm font-bold text-white truncate">
                  {activePreviewStudy.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-white/75 tabular-nums mr-1">
                  {String((previewIndex % projects.length) + 1).padStart(2, '0')} / {projects.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewIndex(
                      (prev) => (prev - 1 + projects.length) % projects.length
                    )
                  }
                  aria-label="Previous project preview"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white hover:text-[#1A1464]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((prev) => (prev + 1) % projects.length)}
                  aria-label="Next project preview"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white hover:text-[#1A1464]"
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activePreviewStudy.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
              >
                <ProjectPreviewScreen
                  study={activePreviewStudy}
                  compact
                  onInspect={(study) => setInspectedStudy(study)}
                />
              </motion.div>
            </AnimatePresence>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-white/80">
                {activePreviewStudy.sector} · {activePreviewStudy.metrics[0]?.value}{' '}
                {activePreviewStudy.metrics[0]?.label}
              </span>
              <button
                type="button"
                onClick={() => setShowcaseOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#EE1119] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#D00D14]"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>See All {projects.length} Projects</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-8 border-t border-white/15 pt-5 text-xs text-white/75 space-y-1">
          <p className="font-display font-bold text-white">
            {COMPANY_CONTACT.location} · Open for Remote &amp; Freelance Work
          </p>
          <p>
            Lead Contact: {COMPANY_CONTACT.leadName} · {COMPANY_CONTACT.phoneDisplay}
          </p>
        </div>
      </aside>

      {/* Right Authentication Form Area */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:col-span-7 lg:py-12">
        <div className="w-full max-w-lg rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-9 shadow-[0_20px_50px_rgba(26,20,100,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            {onBrowsePublic ? (
              <button
                type="button"
                onClick={onBrowsePublic}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Browse 0xDEV Site Without Signing In</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                0xDEV Portal
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-2.5 py-1.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/40 dark:hover:border-white/30 transition-colors shrink-0"
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#1A1464]" aria-hidden="true" />
              )}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* Segmented Mode Tabs: Sign In | Create Account */}
          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-1.5 border border-[#E5E7F0] dark:border-[#242C54]"
            role="tablist"
            aria-label="Authentication Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`relative rounded-lg py-2.5 text-sm font-bold transition-colors ${
                mode === 'login'
                  ? 'text-white'
                  : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
              }`}
            >
              {mode === 'login' && (
                <motion.span
                  layoutId="auth-mode-tab"
                  aria-hidden="true"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                />
              )}
              <span className="relative z-10">Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`relative rounded-lg py-2.5 text-sm font-bold transition-colors ${
                mode === 'register'
                  ? 'text-white'
                  : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
              }`}
            >
              {mode === 'register' && (
                <motion.span
                  layoutId="auth-mode-tab"
                  aria-hidden="true"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                />
              )}
              <span className="relative z-10">Create Account</span>
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{mode === 'login' ? 'Member Sign In' : 'New Visitor Registration'}</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              {mode === 'login'
                ? 'Log in to access 0xDEV'
                : 'Register to view the 0xDEV platform'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7188] dark:text-[#8E97B8]">
              {mode === 'login'
                ? 'Enter your credentials or continue with Google.'
                : 'Create your free visitor account in seconds.'}
            </p>
          </div>

          {/* Auth Error Alert */}
          {authError && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-4 text-xs sm:text-sm text-[#1A1464] dark:text-[#F4F6FC]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{authError}</p>
                  {emailProviderDisabled && (
                    <p className="mt-1.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                      Use <strong>Continue with Google</strong> below right now, or enable
                      Email/Password in Firebase Console under Authentication → Sign-in method.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Single Sign-On Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleClick}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-4 py-3 text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>
              {mode === 'login' ? 'Continue with Google' : 'Register with Google'}
            </span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E5E7F0] dark:bg-[#242C54]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
              {mode === 'login' ? 'or sign in with email' : 'or register with email'}
            </span>
            <span className="h-px flex-1 bg-[#E5E7F0] dark:bg-[#242C54]" />
          </div>

          <AnimatePresence mode="wait">
          {resetView ? (
            <motion.form
              key="auth-reset-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              onSubmit={handleResetSubmit}
              noValidate
              className="space-y-4"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                  Reset Your Password
                </h3>
                <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  Enter your account email and we will send you a password reset link.
                </p>
              </div>

              {resetSentTo && (
                <div
                  role="status"
                  className="rounded-xl border border-[#1A1464]/20 dark:border-[#3A437A] bg-[#F6F7FB] dark:bg-[#101530] p-4 text-xs sm:text-sm font-medium text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  If an account exists for <strong>{resetSentTo}</strong>, a reset link has been
                  sent. Please check your inbox and spam folder.
                </div>
              )}

              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (resetError) setResetError(null);
                    if (authError) clearAuthError();
                  }}
                  placeholder="Your email address"
                  aria-invalid={Boolean(resetError)}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                    resetError
                      ? 'border-[#EE1119]'
                      : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                  }`}
                />
                {resetError && (
                  <p className="mt-1 text-xs font-semibold text-[#EE1119]">{resetError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all hover:bg-[#D00D14] disabled:opacity-60"
              >
                <span>{submitting ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="pt-2 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setResetView(false);
                    setResetError(null);
                    clearAuthError();
                  }}
                  className="font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                >
                  Back to Sign In
                </button>
              </p>
            </motion.form>
          ) : mode === 'login' ? (
            <motion.form
              key="auth-login-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              onSubmit={handleLoginSubmit}
              noValidate
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (authError) clearAuthError();
                    if (loginErrors.email) setLoginErrors({ ...loginErrors, email: undefined });
                  }}
                  placeholder="Your email address"
                  aria-invalid={Boolean(loginErrors.email)}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                    loginErrors.email
                      ? 'border-[#EE1119]'
                      : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                  }`}
                />
                {loginErrors.email && (
                  <p className="mt-1 text-xs font-semibold text-[#EE1119]">{loginErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetView(true);
                      setResetEmail(loginEmail);
                      setResetSentTo(null);
                      setResetError(null);
                      clearAuthError();
                    }}
                    className="text-xs font-semibold text-[#1A1464] dark:text-[#B8C0DA] hover:text-[#EE1119]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (authError) clearAuthError();
                      if (loginErrors.password)
                        setLoginErrors({ ...loginErrors, password: undefined });
                    }}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(loginErrors.password)}
                    className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      loginErrors.password
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="mt-1 text-xs font-semibold text-[#EE1119]">
                    {loginErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all hover:bg-[#D00D14] disabled:opacity-60"
              >
                <span>{submitting ? 'Signing In...' : 'Sign In to 0xDEV'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="pt-2 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                First time visiting?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                >
                  Create an account
                </button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="auth-register-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              onSubmit={handleRegisterSubmit}
              noValidate
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regErrors.name) setRegErrors({ ...regErrors, name: undefined });
                    }}
                    placeholder="Your full name"
                    aria-invalid={Boolean(regErrors.name)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      regErrors.name ? 'border-[#EE1119]' : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  />
                  {regErrors.name && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regErrors.email) setRegErrors({ ...regErrors, email: undefined });
                    }}
                    placeholder="Your email address"
                    aria-invalid={Boolean(regErrors.email)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      regErrors.email
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  />
                  {regErrors.email && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-country"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Country
                  </label>
                  <select
                    id="reg-country"
                    value={regCountry}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                    aria-invalid={Boolean(regErrors.country)}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      regErrors.country
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((country) => (
                      <option key={country.iso} value={country.name}>
                        {country.name} ({country.dialCode})
                      </option>
                    ))}
                  </select>
                  {regErrors.country && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.country}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Phone Number
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value);
                      if (regErrors.phone) setRegErrors({ ...regErrors, phone: undefined });
                    }}
                    placeholder="Phone number with country code"
                    aria-invalid={Boolean(regErrors.phone)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      regErrors.phone
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  />
                  {regErrors.phone && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regErrors.password)
                          setRegErrors({ ...regErrors, password: undefined });
                      }}
                      placeholder="Min. 8 characters"
                      aria-invalid={Boolean(regErrors.password)}
                      className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                        regErrors.password
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regErrors.password && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">
                      {regErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirm}
                    onChange={(e) => {
                      setRegConfirm(e.target.value);
                      if (regErrors.confirm) setRegErrors({ ...regErrors, confirm: undefined });
                    }}
                    placeholder="Repeat password"
                    aria-invalid={Boolean(regErrors.confirm)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] ${
                      regErrors.confirm
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                    }`}
                  />
                  {regErrors.confirm && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.confirm}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all hover:bg-[#D00D14] disabled:opacity-60"
              >
                <span>{submitting ? 'Creating Account...' : 'Create Account & Enter'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="pt-2 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                >
                  Sign in here
                </button>
              </p>
            </motion.form>
          )}
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#E5E7F0] dark:border-[#242C54] pt-4 text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1A1464] dark:text-[#EE1119]" aria-hidden="true" />
            <span>Encrypted Client Access · 0xDEV Kabale Studio</span>
          </div>
        </div>
      </main>

      <WorkShowcaseModal
        open={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
        onRequestAuth={() => switchMode('register')}
      />

      <ProjectPreviewModal
        study={inspectedStudy}
        onClose={() => setInspectedStudy(null)}
        actionLabel="Create Free Account to Start Build"
        onAction={() => {
          setInspectedStudy(null);
          switchMode('register');
        }}
      />
    </div>
  );
};
