import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COUNTRIES, stripLeadingDialCode } from '../data/countries';
import {
  captureReferralCodeFromUrl,
  clearPendingReferralCode,
  normalizeReferralCode,
  setPendingReferralCode,
} from '../utils/referralUtils';
import { Logo } from './Logo';
import { EASE_OUT_EXPO, SPRING_GENTLE, SPRING_SNAPPY } from './MotionPrimitives';
import { ThemePicker } from './ThemePicker';

interface AuthGatePageProps {
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
}

const INSPIRING_LINES = [
  'Build with clarity, ship with quiet confidence.',
  'Great software begins the moment you focus.',
  'Precision craft across every layer you create.',
  'Turn ambitious ideas into lasting technology.',
];

const CONSTELLATION_NODES = [
  { id: 'n1', left: '12%', top: '18%', size: 10, duration: 11, delay: 0, driftX: 18, driftY: -22 },
  { id: 'n2', left: '84%', top: '22%', size: 12, duration: 14, delay: 1.2, driftX: -20, driftY: 16 },
  { id: 'n3', left: '18%', top: '76%', size: 9, duration: 13, delay: 0.6, driftX: 16, driftY: 20 },
  { id: 'n4', left: '86%', top: '74%', size: 11, duration: 15, delay: 2.1, driftX: -16, driftY: -18 },
  { id: 'n5', left: '50%', top: '9%', size: 8, duration: 12, delay: 0.9, driftX: 14, driftY: 14 },
  { id: 'n6', left: '8%', top: '49%', size: 8, duration: 16, delay: 1.7, driftX: 14, driftY: -14 },
  { id: 'n7', left: '91%', top: '48%', size: 9, duration: 13.5, delay: 0.4, driftX: -14, driftY: 14 },
];

const formContainerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_OUT_EXPO,
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.18,
      ease: EASE_OUT_EXPO,
    },
  },
};

const formFieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const AuthGatePage: React.FC<AuthGatePageProps> = ({
  initialMode = 'login',
  onModeChange,
}) => {
  const { isDark } = useTheme();
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
  const [shakeTick, setShakeTick] = useState(0);
  const [mottoIndex, setMottoIndex] = useState(0);

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
  const [regReferralCode, setRegReferralCode] = useState<string>(
    () => captureReferralCodeFromUrl() || ''
  );
  const [regErrors, setRegErrors] = useState<{
    name?: string;
    email?: string;
    country?: string;
    phone?: string;
    password?: string;
    confirm?: string;
  }>({});

  // Cursor spotlight + subtle 3D studio card tilt
  const pointerX = useMotionValue(-320);
  const pointerY = useMotionValue(-320);
  const normalizedX = useMotionValue(0);
  const normalizedY = useMotionValue(0);

  const rotateX = useSpring(useTransform(normalizedY, [-0.5, 0.5], [2.4, -2.4]), {
    stiffness: 180,
    damping: 24,
    mass: 0.6,
  });
  const rotateY = useSpring(useTransform(normalizedX, [-0.5, 0.5], [-2.4, 2.4]), {
    stiffness: 180,
    damping: 24,
    mass: 0.6,
  });

  const handleCardPointerMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      pointerX.set(relX);
      pointerY.set(relY);
      if (rect.width > 0 && rect.height > 0) {
        normalizedX.set(relX / rect.width - 0.5);
        normalizedY.set(relY / rect.height - 0.5);
      }
    },
    [pointerX, pointerY, normalizedX, normalizedY]
  );

  const handleCardPointerLeave = useCallback(() => {
    normalizedX.set(0);
    normalizedY.set(0);
  }, [normalizedX, normalizedY]);

  const lightSpotlight = useMotionTemplate`radial-gradient(400px circle at ${pointerX}px ${pointerY}px, color-mix(in srgb, var(--brand-navy) 8%, transparent), color-mix(in srgb, var(--brand-red) 5%, transparent) 45%, transparent 75%)`;
  const darkSpotlight = useMotionTemplate`radial-gradient(420px circle at ${pointerX}px ${pointerY}px, color-mix(in srgb, var(--theme-link-soft) 18%, transparent), color-mix(in srgb, var(--brand-red) 9%, transparent) 45%, transparent 75%)`;
  const borderGlow = useMotionTemplate`radial-gradient(280px circle at ${pointerX}px ${pointerY}px, color-mix(in srgb, var(--brand-red) 45%, transparent), color-mix(in srgb, var(--brand-navy) 28%, transparent) 45%, transparent 72%)`;

  useEffect(() => {
    const captured = captureReferralCodeFromUrl();
    if (captured) {
      setRegReferralCode(captured);
    }
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setResetView(false);
  }, [initialMode]);

  useEffect(() => {
    if (authError) {
      setShakeTick((prev) => prev + 1);
    }
  }, [authError]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMottoIndex((prev) => (prev + 1) % INSPIRING_LINES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

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
    if (Object.keys(errs).length > 0) {
      setShakeTick((prev) => prev + 1);
      return;
    }

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
      setShakeTick((prev) => prev + 1);
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
    if (Object.keys(errs).length > 0) {
      setShakeTick((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    try {
      const normalizedRef = normalizeReferralCode(regReferralCode);
      if (normalizedRef.length >= 6) {
        setPendingReferralCode(normalizedRef);
      } else {
        clearPendingReferralCode();
      }
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

  const activeHeading = resetView
    ? 'Reset password'
    : mode === 'login'
      ? 'Sign in'
      : 'Create account';

  const hasValidReferralCode = regReferralCode.trim().length >= 6;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F7FB] dark:bg-[#090D1F] flex items-center justify-center px-4 py-10 transition-colors duration-200 [perspective:1200px]">
      {/* Rich Inspirational Studio Motion Backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Precision architectural grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO }}
          className="absolute inset-0 bg-[radial-gradient(#1A1464_0.85px,transparent_0.85px)] dark:bg-[radial-gradient(#7C8CFF_0.85px,transparent_0.85px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_45%,#000_28%,transparent_100%)] opacity-25 dark:opacity-20"
        />

        {/* Dual concentric orbital geometry rings centered behind the login stage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 1.2, ease: EASE_OUT_EXPO },
            scale: { duration: 1.2, ease: EASE_OUT_EXPO },
            rotate: { duration: 64, repeat: Infinity, ease: 'linear' },
          }}
          className="absolute left-1/2 top-1/2 -ml-[340px] -mt-[340px] h-[680px] w-[680px] rounded-full border border-[#1A1464]/[0.06] dark:border-[#7C8CFF]/[0.1] hidden sm:block"
        >
          <span className="absolute -top-1 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#EE1119]/45 to-transparent" />
          <span className="absolute -bottom-1 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#1A1464]/35 dark:via-[#7C8CFF]/45 to-transparent" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1, rotate: -360 }}
          transition={{
            opacity: { duration: 1.2, delay: 0.1, ease: EASE_OUT_EXPO },
            scale: { duration: 1.2, delay: 0.1, ease: EASE_OUT_EXPO },
            rotate: { duration: 48, repeat: Infinity, ease: 'linear' },
          }}
          className="absolute left-1/2 top-1/2 -ml-[255px] -mt-[255px] h-[510px] w-[510px] rounded-full border border-dashed border-[#1A1464]/[0.07] dark:border-[#7C8CFF]/[0.12] hidden sm:block"
        />

        {/* Sweeping architectural light aurora ribbons (theme-reactive via CSS vars) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: [0.45, 0.78, 0.45],
            x: [0, 36, -16, 0],
            y: [0, -24, 18, 0],
            scale: [1, 1.08, 0.97, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-44 -left-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-navy)_15%,transparent)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme-link-soft)_22%,transparent)_0%,transparent_70%)]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: [0.35, 0.7, 0.35],
            x: [0, -34, 18, 0],
            y: [0, 26, -20, 0],
            scale: [1, 1.09, 0.96, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-48 -right-28 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-red)_12%,transparent)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-red)_18%,transparent)_0%,transparent_70%)]"
        />

        {/* Gliding diagonal studio light beams */}
        <motion.div
          initial={{ opacity: 0, x: '-25%' }}
          animate={{
            opacity: [0, 0.55, 0],
            x: ['-25%', '125%'],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="absolute top-[18%] left-0 h-px w-[420px] -rotate-12 bg-gradient-to-r from-transparent via-[#EE1119]/35 to-transparent"
        />

        <motion.div
          initial={{ opacity: 0, x: '115%' }}
          animate={{
            opacity: [0, 0.45, 0],
            x: ['115%', '-35%'],
          }}
          transition={{
            duration: 11,
            delay: 2.5,
            repeat: Infinity,
            repeatDelay: 4,
            ease: 'easeInOut',
          }}
          className="absolute bottom-[20%] left-0 h-px w-[460px] -rotate-12 bg-gradient-to-r from-transparent via-[#1A1464]/25 dark:via-[#7C8CFF]/35 to-transparent"
        />

        {/* Floating rotated architectural constellation diamonds */}
        {CONSTELLATION_NODES.map((node) => (
          <motion.div
            key={node.id}
            style={{ left: node.left, top: node.top, width: node.size, height: node.size }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0.18, 0.58, 0.18],
              x: [0, node.driftX, 0],
              y: [0, node.driftY, 0],
              rotate: [0, 90, 180],
              scale: [0.9, 1.15, 0.9],
            }}
            transition={{
              duration: node.duration,
              delay: node.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute hidden sm:block rounded-[2px] border border-[#1A1464]/25 dark:border-[#7C8CFF]/35 bg-[#EE1119]/10"
          />
        ))}
      </div>

      {/* Main Elevated 3D-Tilt Authentication Stage */}
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.56, ease: EASE_OUT_EXPO }}
        style={{ rotateX, rotateY }}
        className="relative z-10 w-full max-w-md will-change-transform"
      >
        <motion.div
          key={shakeTick}
          animate={
            shakeTick > 0
              ? { x: [0, -7, 7, -5, 5, -2, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.38, ease: 'easeInOut' }}
          onMouseMove={handleCardPointerMove}
          onMouseLeave={handleCardPointerLeave}
          className="group/authcard relative overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white/95 dark:bg-[#141A38]/95 backdrop-blur-md p-6 sm:p-8 shadow-[0_28px_70px_rgba(26,20,100,0.1)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.55)]"
        >
          {/* Cursor-reactive perimeter border glow */}
          <motion.div
            aria-hidden="true"
            style={{ background: borderGlow }}
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover/authcard:opacity-35 [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] p-px"
          />

          {/* Pointer-tracking surface spotlight (light & dark bridges) */}
          <motion.div
            aria-hidden="true"
            style={{ background: lightSpotlight }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/authcard:opacity-100 dark:hidden"
          />
          <motion.div
            aria-hidden="true"
            style={{ background: darkSpotlight }}
            className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-300 group-hover/authcard:opacity-100 dark:block"
          />

          {/* Animated Signature Top Crimson Skew Bar with continuous subtle gleam */}
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.16, ease: EASE_OUT_EXPO }}
            className="origin-right absolute top-0 right-8 h-1.5 w-24 -skew-x-24 overflow-hidden bg-[#EE1119]"
          >
            <motion.span
              animate={{ x: ['-120%', '220%'] }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
              className="block h-full w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent"
            />
          </motion.div>

          {/* Top Bar: Brand Logo & Theme Selector */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="relative z-10 flex items-center justify-between gap-3 mb-5"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={SPRING_SNAPPY}
            >
              <Logo variant={isDark ? 'dark' : 'light'} />
            </motion.div>
            <ThemePicker variant="compact" />
          </motion.div>

          {/* Inspirational Editorial Line Carousel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="relative z-10 mb-5 min-h-[20px] overflow-hidden border-b border-[#E5E7F0]/80 dark:border-[#242C54]/80 pb-3"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={mottoIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                className="text-xs font-medium tracking-wide text-[#4A4F63] dark:text-[#C2C9E0]"
              >
                {INSPIRING_LINES[mottoIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Segmented Mode Switcher */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14, ease: EASE_OUT_EXPO }}
            className="relative z-10 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-1 border border-[#E5E7F0] dark:border-[#242C54]"
            role="tablist"
            aria-label="Authentication Mode"
          >
            <motion.button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_SNAPPY}
              onClick={() => switchMode('login')}
              className={`relative rounded-lg py-2 text-sm font-bold transition-colors ${
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
            </motion.button>
            <motion.button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_SNAPPY}
              onClick={() => switchMode('register')}
              className={`relative rounded-lg py-2 text-sm font-bold transition-colors ${
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
            </motion.button>
          </motion.div>

          {/* Animated Section Heading with Sweeping Accent Rule */}
          <div className="relative z-10 mt-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeHeading}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              >
                <h1 className="font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  {activeHeading}
                </h1>
                <motion.div
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.42, delay: 0.08, ease: EASE_OUT_EXPO }}
                  className="origin-left mt-1.5 h-0.5 w-10 -skew-x-24 bg-[#EE1119]"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Auth Error Alert */}
          <AnimatePresence>
            {authError && (
              <motion.div
                key="auth-error-alert"
                role="alert"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={SPRING_GENTLE}
                className="relative z-10 mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs text-[#1A1464] dark:text-[#F4F6FC]"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{authError}</p>
                    {emailProviderDisabled && (
                      <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                        Use <strong>Continue with Google</strong> below or enable Email/Password in Firebase Console.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign-In Button with Hover Lift & Micro-sheen */}
          <motion.button
            type="button"
            disabled={submitting}
            onClick={handleGoogleClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.2, ease: EASE_OUT_EXPO }}
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.985 }}
            className="group/google relative z-10 mt-5 flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-4 py-2.5 text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-20 bg-gradient-to-r from-transparent via-[#1A1464]/[0.06] dark:via-white/[0.08] to-transparent transition-transform duration-700 group-hover/google:translate-x-[420%]"
            />
            <svg className="relative z-10 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span className="relative z-10">
              {mode === 'login' ? 'Continue with Google' : 'Register with Google'}
            </span>
          </motion.button>

          {/* Animated Divider */}
          <div className="relative z-10 my-4 flex items-center gap-3">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.24, ease: EASE_OUT_EXPO }}
              className="origin-right h-px flex-1 bg-[#E5E7F0] dark:bg-[#242C54]"
            />
            <span className="text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">or</span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.24, ease: EASE_OUT_EXPO }}
              className="origin-left h-px flex-1 bg-[#E5E7F0] dark:bg-[#242C54]"
            />
          </div>

          {/* Smooth Morphing Form Container */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {resetView ? (
                <motion.form
                  key="auth-reset-form"
                  variants={formContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleResetSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <AnimatePresence>
                    {resetSentTo && (
                      <motion.div
                        role="status"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={SPRING_GENTLE}
                        className="rounded-xl border border-[#1A1464]/20 dark:border-[#3A437A] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-xs font-medium text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        If an account exists for <strong>{resetSentTo}</strong>, a reset link has been sent.
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div variants={formFieldVariants}>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Email
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
                      placeholder="you@example.com"
                      aria-invalid={Boolean(resetError)}
                      className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                        resetError
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:shadow-[0_0_0_3px_rgba(26,20,100,0.08)] dark:focus:shadow-[0_0_0_3px_rgba(124,140,255,0.16)]'
                      }`}
                    />
                    {resetError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-xs font-semibold text-[#EE1119]"
                      >
                        {resetError}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.985 }}
                      transition={SPRING_SNAPPY}
                      className="group/submit relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#EE1119] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(238,17,25,0.24)] transition-colors hover:bg-[#D00D14] disabled:opacity-60"
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={{ x: ['-140%', '420%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.4, ease: 'easeInOut' }}
                        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-20 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                      <AnimatePresence mode="wait" initial={false}>
                        {submitting ? (
                          <motion.span
                            key="reset-busy"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Sending...</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="reset-idle"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <span>Send Reset Link</span>
                            <ArrowRight
                              className="h-4 w-4 transition-transform duration-200 group-hover/submit:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>

                  <motion.p variants={formFieldVariants} className="pt-1 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                    <button
                      type="button"
                      onClick={() => {
                        setResetView(false);
                        setResetError(null);
                        clearAuthError();
                      }}
                      className="font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </motion.p>
                </motion.form>
              ) : mode === 'login' ? (
                <motion.form
                  key="auth-login-form"
                  variants={formContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleLoginSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <motion.div variants={formFieldVariants}>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Email
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
                      placeholder="you@example.com"
                      aria-invalid={Boolean(loginErrors.email)}
                      className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                        loginErrors.email
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:shadow-[0_0_0_3px_rgba(26,20,100,0.08)] dark:focus:shadow-[0_0_0_3px_rgba(124,140,255,0.16)]'
                      }`}
                    />
                    {loginErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-xs font-semibold text-[#EE1119]"
                      >
                        {loginErrors.email}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
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
                        className="text-xs font-semibold text-[#1A1464] dark:text-[#B8C0DA] hover:text-[#EE1119] transition-colors"
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
                        placeholder="Enter password"
                        aria-invalid={Boolean(loginErrors.password)}
                        className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                          loginErrors.password
                            ? 'border-[#EE1119]'
                            : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:shadow-[0_0_0_3px_rgba(26,20,100,0.08)] dark:focus:shadow-[0_0_0_3px_rgba(124,140,255,0.16)]'
                        }`}
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white transition-colors"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={showPassword ? 'hide' : 'show'}
                            initial={{ opacity: 0, scale: 0.75, rotate: -15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.75, rotate: 15 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    {loginErrors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-xs font-semibold text-[#EE1119]"
                      >
                        {loginErrors.password}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.985 }}
                      transition={SPRING_SNAPPY}
                      className="group/submit relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#EE1119] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(238,17,25,0.24)] transition-colors hover:bg-[#D00D14] disabled:opacity-60"
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={{ x: ['-140%', '420%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.4, ease: 'easeInOut' }}
                        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-20 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                      <AnimatePresence mode="wait" initial={false}>
                        {submitting ? (
                          <motion.span
                            key="login-busy"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Signing In...</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="login-idle"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <span>Sign In</span>
                            <ArrowRight
                              className="h-4 w-4 transition-transform duration-200 group-hover/submit:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form
                  key="auth-register-form"
                  variants={formContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleRegisterSubmit}
                  noValidate
                  className="space-y-3.5"
                >
                  <motion.div variants={formFieldVariants}>
                    <label
                      htmlFor="reg-name"
                      className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
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
                      className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                        regErrors.name
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:shadow-[0_0_0_3px_rgba(26,20,100,0.08)] dark:focus:shadow-[0_0_0_3px_rgba(124,140,255,0.16)]'
                      }`}
                    />
                    {regErrors.name && (
                      <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.name}</p>
                    )}
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Email
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
                      placeholder="you@example.com"
                      aria-invalid={Boolean(regErrors.email)}
                      className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                        regErrors.email
                          ? 'border-[#EE1119]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:shadow-[0_0_0_3px_rgba(26,20,100,0.08)] dark:focus:shadow-[0_0_0_3px_rgba(124,140,255,0.16)]'
                      }`}
                    />
                    {regErrors.email && (
                      <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.email}</p>
                    )}
                  </motion.div>

                  <motion.div variants={formFieldVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="reg-country"
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Country
                      </label>
                      <select
                        id="reg-country"
                        value={regCountry}
                        onChange={(e) => handleCountrySelect(e.target.value)}
                        aria-invalid={Boolean(regErrors.country)}
                        className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-medium text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
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
                        <p className="mt-1 text-xs font-semibold text-[#EE1119]">
                          {regErrors.country}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="reg-phone"
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Phone
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
                        placeholder="+256..."
                        aria-invalid={Boolean(regErrors.phone)}
                        className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                          regErrors.phone
                            ? 'border-[#EE1119]'
                            : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                        }`}
                      />
                      {regErrors.phone && (
                        <p className="mt-1 text-xs font-semibold text-[#EE1119]">{regErrors.phone}</p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div variants={formFieldVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="reg-password"
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Password
                      </label>
                      <div className="relative mt-1">
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
                          placeholder="Min. 8 chars"
                          aria-invalid={Boolean(regErrors.password)}
                          className={`w-full rounded-xl border px-3.5 py-2.5 pr-9 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                            regErrors.password
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
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
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Confirm
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
                        className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                          regErrors.confirm
                            ? 'border-[#EE1119]'
                            : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                        }`}
                      />
                      {regErrors.confirm && (
                        <p className="mt-1 text-xs font-semibold text-[#EE1119]">
                          {regErrors.confirm}
                        </p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="reg-referral"
                        className="block text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Referral Code{' '}
                        <span className="font-medium text-[#6B7188] dark:text-[#8E97B8]">
                          (Optional · +50 DevCredits)
                        </span>
                      </label>
                      <AnimatePresence>
                        {hasValidReferralCode && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]"
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                            <span>Bonus Ready</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <input
                      id="reg-referral"
                      type="text"
                      value={regReferralCode}
                      onChange={(e) => {
                        const nextVal = normalizeReferralCode(e.target.value);
                        setRegReferralCode(nextVal);
                        if (nextVal.length >= 6) {
                          setPendingReferralCode(nextVal);
                        } else if (nextVal.length === 0) {
                          clearPendingReferralCode();
                        }
                      }}
                      placeholder="e.g. 0X9K4M2P7Q"
                      maxLength={24}
                      className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-[#1A1464] dark:text-white placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 bg-[#F6F7FB]/50 dark:bg-[#101530] focus:bg-white dark:focus:bg-[#182044] transition-all duration-200 ${
                        hasValidReferralCode
                          ? 'border-[#10B981]/60 focus:border-[#10B981]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#5D6BFF]'
                      }`}
                    />
                  </motion.div>

                  <motion.div variants={formFieldVariants}>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.985 }}
                      transition={SPRING_SNAPPY}
                      className="group/submit relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#EE1119] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(238,17,25,0.24)] transition-colors hover:bg-[#D00D14] disabled:opacity-60"
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={{ x: ['-140%', '420%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.4, ease: 'easeInOut' }}
                        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-20 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                      <AnimatePresence mode="wait" initial={false}>
                        {submitting ? (
                          <motion.span
                            key="register-busy"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Creating Account...</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="register-idle"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16 }}
                            className="relative z-10 inline-flex items-center gap-2"
                          >
                            <span>Create Account</span>
                            <ArrowRight
                              className="h-4 w-4 transition-transform duration-200 group-hover/submit:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
};
