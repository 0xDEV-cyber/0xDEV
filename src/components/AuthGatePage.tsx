import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, stripLeadingDialCode } from '../data/countries';
import { COMPANY_CONTACT } from '../data/siteData';
import { Logo } from './Logo';

interface AuthGatePageProps {
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
}

export const AuthGatePage: React.FC<AuthGatePageProps> = ({
  initialMode = 'login',
  onModeChange,
}) => {
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
    <div className="min-h-screen bg-[#F6F7FB] flex flex-col lg:grid lg:grid-cols-12">
      {/* Left Branded Portal Panel (Deep Navy) */}
      <aside className="relative overflow-hidden bg-[#1A1464] px-6 py-10 text-white sm:px-10 lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
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
            One Team. Every Layer of Your Technology.
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-white/80">
            Sign in or register an account to explore 0xDEV’s full-lifecycle engineering services,
            case studies, technical process, and direct project consultation desk.
          </p>

          <ul className="mt-8 space-y-3.5 text-sm text-white/90">
            {[
              'Full access to our 9 core software, cloud & security services',
              'Detailed case study metrics & architecture breakdowns',
              'Direct freelance & full-stack project brief submission',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 border-t border-white/15 pt-6 text-xs text-white/75 space-y-1">
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
        <div className="w-full max-w-lg rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-9 shadow-[0_20px_50px_rgba(26,20,100,0.08)]">
          {/* Segmented Mode Tabs: Sign In | Create Account */}
          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]"
            role="tablist"
            aria-label="Authentication Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`rounded-lg py-2.5 text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#1A1464] text-white shadow-sm'
                  : 'text-[#4A4F63] hover:text-[#1A1464]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`rounded-lg py-2.5 text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-[#1A1464] text-white shadow-sm'
                  : 'text-[#4A4F63] hover:text-[#1A1464]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{mode === 'login' ? 'Member Sign In' : 'New Visitor Registration'}</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464]">
              {mode === 'login'
                ? 'Log in to access 0xDEV'
                : 'Register to view the 0xDEV platform'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7188]">
              {mode === 'login'
                ? 'Enter your credentials or continue with Google.'
                : 'Create your free visitor account in seconds.'}
            </p>
          </div>

          {/* Auth Error Alert */}
          {authError && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 p-4 text-xs sm:text-sm text-[#1A1464]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{authError}</p>
                  {emailProviderDisabled && (
                    <p className="mt-1.5 text-xs text-[#4A4F63]">
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
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7F0] bg-white px-4 py-3 text-sm font-bold text-[#1A1464] transition-colors hover:border-[#1A1464]/40 hover:bg-[#F6F7FB] disabled:opacity-60"
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
            <span className="h-px flex-1 bg-[#E5E7F0]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7188]">
              {mode === 'login' ? 'or sign in with email' : 'or register with email'}
            </span>
            <span className="h-px flex-1 bg-[#E5E7F0]" />
          </div>

          {resetView ? (
            <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1A1464]">
                  Reset Your Password
                </h3>
                <p className="mt-1 text-xs text-[#6B7188]">
                  Enter your account email and we will send you a secure 0xDEV password reset link.
                </p>
              </div>

              {resetSentTo && (
                <div
                  role="status"
                  className="rounded-xl border border-[#1A1464]/20 bg-[#F6F7FB] p-4 text-xs sm:text-sm font-medium text-[#1A1464]"
                >
                  If an account exists for <strong>{resetSentTo}</strong>, a reset link has been
                  sent. Please check your inbox and spam folder.
                </div>
              )}

              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                  placeholder="arigyewisdom7@gmail.com"
                  aria-invalid={Boolean(resetError)}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                    resetError
                      ? 'border-[#EE1119]'
                      : 'border-[#E5E7F0] focus:border-[#1A1464]'
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

              <p className="pt-2 text-center text-xs text-[#6B7188]">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setResetView(false);
                    setResetError(null);
                    clearAuthError();
                  }}
                  className="font-bold text-[#1A1464] hover:text-[#EE1119]"
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                  placeholder="arigyewisdom7@gmail.com"
                  aria-invalid={Boolean(loginErrors.email)}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                    loginErrors.email
                      ? 'border-[#EE1119]'
                      : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                    className="text-xs font-semibold text-[#1A1464] hover:text-[#EE1119]"
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
                    className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      loginErrors.password
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] focus:border-[#1A1464]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] hover:text-[#1A1464]"
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

              <p className="pt-2 text-center text-xs text-[#6B7188]">
                First time visiting?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold text-[#1A1464] hover:text-[#EE1119]"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                    placeholder="Arigye Wisdom"
                    aria-invalid={Boolean(regErrors.name)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      regErrors.name ? 'border-[#EE1119]' : 'border-[#E5E7F0] focus:border-[#1A1464]'
                    }`}
                  />
                  {regErrors.name && (
                    <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                    placeholder="arigyewisdom7@gmail.com"
                    aria-invalid={Boolean(regErrors.email)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      regErrors.email
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                  >
                    Country
                  </label>
                  <select
                    id="reg-country"
                    value={regCountry}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                    aria-invalid={Boolean(regErrors.country)}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      regErrors.country
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                    placeholder="+256 766 922 566"
                    aria-invalid={Boolean(regErrors.phone)}
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      regErrors.phone
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                      className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                        regErrors.password
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] focus:border-[#1A1464]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] hover:text-[#1A1464]"
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                    className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] bg-[#F6F7FB]/50 focus:bg-white ${
                      regErrors.confirm
                        ? 'border-[#EE1119]'
                        : 'border-[#E5E7F0] focus:border-[#1A1464]'
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

              <p className="pt-2 text-center text-xs text-[#6B7188]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-[#1A1464] hover:text-[#EE1119]"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#E5E7F0] pt-4 text-[11px] text-[#6B7188]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1A1464]" aria-hidden="true" />
            <span>Encrypted Client Access · 0xDEV Kabale Studio</span>
          </div>
        </div>
      </main>
    </div>
  );
};
