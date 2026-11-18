import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Mail, MessageCircle, Phone, Save, Video, X } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { PreferredContactChannel, UserProfileDetails } from '../firebase';
import { EASE_OUT_EXPO } from './MotionPrimitives';
import { UserAvatar } from './UserAvatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDisplayName: string;
  initialDetails: UserProfileDetails;
  userEmail: string;
  photoUrl: string | null;
  onSave: (params: {
    displayName: string;
    bio: string;
    country: string;
    phone: string;
    preferredChannel: PreferredContactChannel;
    projectUpdatesOptIn: boolean;
    marketingOptIn: boolean;
  }) => Promise<void>;
}

const CONTACT_CHANNEL_OPTIONS: Array<{
  id: PreferredContactChannel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'phone', label: 'Phone Call', icon: Phone },
  { id: 'google_meet', label: 'Google Meet', icon: Video },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  initialDisplayName,
  initialDetails,
  userEmail,
  photoUrl,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialDetails.bio);
  const [country, setCountry] = useState(initialDetails.country);
  const [phone, setPhone] = useState(initialDetails.phone);
  const [preferredChannel, setPreferredChannel] = useState<PreferredContactChannel>(
    initialDetails.preferredChannel
  );
  const [projectUpdatesOptIn, setProjectUpdatesOptIn] = useState(
    initialDetails.projectUpdatesOptIn
  );
  const [marketingOptIn, setMarketingOptIn] = useState(initialDetails.marketingOptIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(initialDisplayName);
    setBio(initialDetails.bio);
    setCountry(initialDetails.country);
    setPhone(initialDetails.phone);
    setPreferredChannel(initialDetails.preferredChannel);
    setProjectUpdatesOptIn(initialDetails.projectUpdatesOptIn);
    setMarketingOptIn(initialDetails.marketingOptIn);
    setError(null);
  }, [isOpen, initialDisplayName, initialDetails]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  const handleCountryChange = (nextCountryName: string) => {
    setCountry(nextCountryName);
    if (!phone.trim() && nextCountryName) {
      const match = COUNTRIES.find((c) => c.name === nextCountryName);
      if (match) {
        setPhone(`${match.dialCode} `);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Display name must be 100 characters or fewer.');
      return;
    }
    if (bio.trim().length > 300) {
      setError('Bio must be 300 characters or fewer.');
      return;
    }
    if (phone.trim().length > 40) {
      setError('Phone number must be 40 characters or fewer.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: trimmedName,
        bio: bio.trim(),
        country: country.trim(),
        phone: phone.trim(),
        preferredChannel,
        projectUpdatesOptIn,
        marketingOptIn,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D1F]/70 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              onClose();
            }
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-modal-title"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] shadow-2xl"
          >
            <div
              aria-hidden="true"
              className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-6 py-5">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar
                  src={photoUrl}
                  name={displayName}
                  email={userEmail}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Account Settings
                  </p>
                  <h2
                    id="edit-profile-modal-title"
                    className="font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] truncate"
                  >
                    Edit Profile &amp; Contact Preferences
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                aria-label="Close edit profile modal"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#4A4F63] dark:text-[#C2C9E0] transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
              {/* Identity: Display Name & Bio */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="modal-display-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Display Name <span className="text-[#EE1119]">*</span>
                  </label>
                  <input
                    id="modal-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Arigye Wisdom"
                    maxLength={100}
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="modal-bio"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Bio / Role Summary
                    </label>
                    <span className="font-mono text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      {bio.length}/300
                    </span>
                  </div>
                  <textarea
                    id="modal-bio"
                    rows={3}
                    maxLength={300}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Engineering lead building resilient fintech and SaaS infrastructure..."
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] px-4 py-2.5 text-sm leading-relaxed text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Contact Details */}
              <div className="border-t border-[#E5E7F0] dark:border-[#242C54] pt-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Contact Details
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="modal-country"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Country / Region
                    </label>
                    <select
                      id="modal-country"
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.iso} value={c.name}>
                          {c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-phone"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Phone / WhatsApp Number
                    </label>
                    <input
                      id="modal-phone"
                      type="tel"
                      maxLength={40}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+256 772 000 000"
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] px-4 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Notification Preferences */}
              <div className="border-t border-[#E5E7F0] dark:border-[#242C54] pt-5 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                    Preferred Communication Channel
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {CONTACT_CHANNEL_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = preferredChannel === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setPreferredChannel(opt.id)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                            isSelected
                              ? 'border-[#1A1464] dark:border-[#7C8CFF] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                              : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#4A4F63] dark:text-[#C2C9E0] hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8] hover:text-[#1A1464] dark:hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                    Notification Preferences
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] p-3.5 transition-colors hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        projectUpdatesOptIn
                          ? 'border-[#EE1119] bg-[#EE1119] text-white'
                          : 'border-[#E5E7F0] dark:border-[#3A437A] bg-white dark:bg-[#141A38]'
                      }`}
                    >
                      {projectUpdatesOptIn && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={projectUpdatesOptIn}
                      onChange={(e) => setProjectUpdatesOptIn(e.target.checked)}
                      className="sr-only"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        Project milestone &amp; deliverable alerts
                      </span>
                      <span className="block text-xs text-[#6B7188] dark:text-[#8E97B8]">
                        Receive status updates, invoice notices, and engineering squad replies for active builds.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] p-3.5 transition-colors hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        marketingOptIn
                          ? 'border-[#EE1119] bg-[#EE1119] text-white'
                          : 'border-[#E5E7F0] dark:border-[#3A437A] bg-white dark:bg-[#141A38]'
                      }`}
                    >
                      {marketingOptIn && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="sr-only"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        0xDEV engineering dispatches
                      </span>
                      <span className="block text-xs text-[#6B7188] dark:text-[#8E97B8]">
                        Occasional architecture briefs, security advisories, and studio availability notes.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-xs font-semibold text-[#EE1119]" role="alert">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E7F0] dark:border-[#242C54] pt-5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-2.5 text-xs font-bold text-[#4A4F63] dark:text-[#C2C9E0] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8] hover:text-[#1A1464] dark:hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#D00D14] disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{saving ? 'Saving Profile...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
