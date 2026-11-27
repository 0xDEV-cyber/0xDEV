import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { EASE_OUT_EXPO, SPRING_SNAPPY } from './MotionPrimitives';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  hasPasswordProvider: boolean;
  hasGoogleProvider: boolean;
  onConfirmDelete: (currentPassword?: string) => Promise<void>;
}

const CONFIRM_KEYWORD = 'DELETE';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  hasPasswordProvider,
  hasGoogleProvider,
  onConfirmDelete,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmText('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, onClose]);

  const keywordMatches = confirmText.trim().toUpperCase() === CONFIRM_KEYWORD;
  const passwordReady = !hasPasswordProvider || password.length > 0;
  const canSubmit = keywordMatches && passwordReady && !deleting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!keywordMatches) {
      setError(`Please type ${CONFIRM_KEYWORD} to confirm permanent deletion.`);
      return;
    }

    if (hasPasswordProvider && !password) {
      setError('Please enter your current password to verify your identity.');
      return;
    }

    setDeleting(true);
    try {
      await onConfirmDelete(hasPasswordProvider ? password : undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete your account right now. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D1F]/75 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              onClose();
            }
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#EE1119]/35 bg-white dark:bg-[#141A38] shadow-2xl"
          >
            <div
              aria-hidden="true"
              className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#FFF5F5] dark:bg-[#231222] px-6 py-5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EE1119] text-white shadow-sm">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Irreversible Action
                  </p>
                  <h2
                    id="delete-account-modal-title"
                    className="font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Delete Account Permanently
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={onClose}
                aria-label="Close delete account modal"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#4A4F63] dark:text-[#C2C9E0] transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="rounded-xl border border-[#EE1119]/25 bg-[#EE1119]/[0.04] dark:bg-[#EE1119]/[0.08] p-4 text-xs sm:text-sm leading-relaxed text-[#1A1464] dark:text-[#F4F6FC]">
                <p className="font-bold">
                  Deleting <span className="break-all">{userEmail || 'your account'}</span> cannot be undone.
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0] list-disc pl-4">
                  <li>Your public profile, bio, avatar, and private contact details will be erased.</li>
                  <li>Your watchlist, watch progress, DevCredits, streaks, and referral code will be removed.</li>
                  <li>Your discovery bookings, notifications, and sign-in credentials will be deleted immediately.</li>
                </ul>
              </div>

              {hasPasswordProvider ? (
                <div>
                  <label
                    htmlFor="delete-account-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Current Password <span className="text-[#EE1119]">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="delete-account-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                      className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530] px-4 py-2.5 pr-11 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#EE1119] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7188] hover:text-[#1A1464] dark:text-[#8E97B8] dark:hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                hasGoogleProvider && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-[#EE1119] mt-0.5" aria-hidden="true" />
                    <span>
                      For security, clicking <strong>Delete Permanently</strong> will open a quick Google verification popup to confirm ownership of your account.
                    </span>
                  </div>
                )
              )}

              <div>
                <label
                  htmlFor="delete-account-confirm-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Type <span className="font-mono text-[#EE1119]">{CONFIRM_KEYWORD}</span> to confirm{' '}
                  <span className="text-[#EE1119]">*</span>
                </label>
                <input
                  id="delete-account-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={CONFIRM_KEYWORD}
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/60 dark:placeholder:text-[#8E97B8]/60 focus:border-[#EE1119] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/8 px-3.5 py-2.5 text-xs font-semibold text-[#EE1119]"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-[#E5E7F0] dark:border-[#242C54]">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8] disabled:opacity-50"
                >
                  Keep My Account
                </button>
                <motion.button
                  type="submit"
                  disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.98 } : undefined}
                  transition={SPRING_SNAPPY}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.24)] transition-colors hover:bg-[#D00D14] disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Deleting Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
