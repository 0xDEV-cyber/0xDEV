import React, { useEffect, useState } from 'react';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPANY_CONTACT } from '../data/siteData';
import { auth } from '../firebase';
import { Logo } from './Logo';

interface AuthActionPageProps {
  onDone: (target?: 'home' | 'login') => void;
}

type ActionStage = 'processing' | 'verify_success' | 'reset_form' | 'reset_success' | 'error';

export const AuthActionPage: React.FC<AuthActionPageProps> = ({ onDone }) => {
  const { user, refreshUserStatus } = useAuth();

  const [stage, setStage] = useState<ActionStage>('processing');
  const [title, setTitle] = useState('Completing your request...');
  const [message, setMessage] = useState('Please wait a moment while 0xDEV verifies your link.');
  const [oobCode, setOobCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || '';
    const code = params.get('oobCode') || '';

    if (!mode || !code) {
      setStage('error');
      setTitle('Invalid or incomplete link');
      setMessage(
        'This verification or password reset link is missing required security parameters. Request a fresh link from the sign-in portal.'
      );
      return;
    }

    setOobCode(code);
    let cancelled = false;

    const run = async () => {
      try {
        if (mode === 'verifyEmail') {
          await applyActionCode(auth, code);
          if (auth.currentUser) {
            try {
              await refreshUserStatus();
            } catch {
              // User state reload errors are non-blocking here
            }
          }
          if (!cancelled) {
            setStage('verify_success');
            setTitle('Email Address Verified');
            setMessage(
              'Your email address has been confirmed for 0xDEV. You now have full access to submit project briefs and manage your dashboard.'
            );
          }
          return;
        }

        if (mode === 'resetPassword') {
          const email = await verifyPasswordResetCode(auth, code);
          if (!cancelled) {
            setResetEmail(email);
            setStage('reset_form');
            setTitle('Set a New Password');
            setMessage(`Choose a strong new password for ${email}.`);
          }
          return;
        }

        if (mode === 'recoverEmail') {
          await applyActionCode(auth, code);
          if (!cancelled) {
            setStage('verify_success');
            setTitle('Email Address Restored');
            setMessage(
              'Your previous email address has been restored on your 0xDEV account. We recommend updating your password right away.'
            );
          }
          return;
        }

        if (!cancelled) {
          setStage('error');
          setTitle('Unsupported link action');
          setMessage('This link type is not recognized. Please return to the 0xDEV portal.');
        }
      } catch (err) {
        if (cancelled) return;
        const codeStr =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: string }).code)
            : '';
        setStage('error');
        if (codeStr === 'auth/expired-action-code') {
          setTitle('This link has expired');
          setMessage(
            'Security links expire after a single use or timeout. Return to 0xDEV to request a fresh email.'
          );
        } else {
          setTitle('Link already used or invalid');
          setMessage(
            'This action link may have already been completed or is invalid. Please sign in or request a new link.'
          );
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshUserStatus]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStage('reset_success');
      setTitle('Password Updated');
      setMessage(
        'Your 0xDEV password has been changed. You can now sign in with your new credentials.'
      );
    } catch {
      setFormError(
        'Could not update your password—this reset link may have expired. Please request a new one.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#090D1F] flex flex-col items-center justify-center px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] overflow-hidden shadow-[0_20px_50px_rgba(26,20,100,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Navy Header Band */}
        <div className="bg-[#1A1464] dark:bg-[#0E1330] px-6 py-6 sm:px-8 border-b-4 border-[#EE1119] flex items-center justify-between">
          <Logo variant="dark" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">
            Security Action
          </span>
        </div>

        <div className="p-6 sm:p-8">
          {stage === 'processing' && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC]">
                <ShieldCheck className="h-6 w-6 text-[#EE1119]" aria-hidden="true" />
              </div>
              <h1 className="mt-4 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">{title}</h1>
              <p className="mt-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">{message}</p>
            </div>
          )}

          {(stage === 'verify_success' || stage === 'reset_success') && (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1464] dark:bg-[#2E368F] text-white">
                <CheckCircle2 className="h-6 w-6 text-[#EE1119]" aria-hidden="true" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">{message}</p>
              <button
                type="button"
                onClick={() => onDone(user ? 'home' : 'login')}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-colors hover:bg-[#D00D14]"
              >
                <span>{user ? 'Continue to 0xDEV' : 'Continue to Sign In'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {stage === 'reset_form' && (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Password Recovery</span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">{title}</h1>
              <p className="text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                Updating credentials for <strong className="text-[#1A1464] dark:text-[#F4F6FC]">{resetEmail}</strong>
              </p>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="action-new-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="action-new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 pr-11 text-sm text-[#1A1464] dark:text-white focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:bg-white dark:focus:bg-[#182044]"
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
              </div>

              <div>
                <label
                  htmlFor="action-confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Confirm New Password
                </label>
                <input
                  id="action-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Repeat new password"
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 text-sm text-[#1A1464] dark:text-white focus:border-[#1A1464] dark:focus:border-[#5D6BFF] focus:bg-white dark:focus:bg-[#182044]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-colors hover:bg-[#D00D14] disabled:opacity-60"
              >
                <span>{submitting ? 'Updating Password...' : 'Save New Password'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}

          {stage === 'error' && (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EE1119]/10 text-[#EE1119]">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">{message}</p>
              <button
                type="button"
                onClick={() => onDone(user ? 'home' : 'login')}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
              >
                <span>{user ? 'Return to 0xDEV' : 'Return to Sign In'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-[#E5E7F0] dark:border-[#242C54] pt-4 text-center text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
            0xDEV Client Security · {COMPANY_CONTACT.location} · {COMPANY_CONTACT.phoneDisplay}
          </div>
        </div>
      </div>
    </div>
  );
};
