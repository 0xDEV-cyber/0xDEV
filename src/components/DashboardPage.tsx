import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Calendar,
  Camera,
  Check,
  Link2,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Save,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageRoute } from '../data/siteData';
import {
  isValidProfilePhotoUrl,
  MAX_PROFILE_PHOTO_LENGTH,
  PreferredContactChannel,
} from '../firebase';
import { AdminBlogManager } from './AdminBlogManager';
import { AdminPortfolioManager } from './AdminPortfolioManager';
import { EditProfileModal } from './EditProfileModal';
import { EASE_OUT_EXPO, Reveal, SPRING_SNAPPY } from './MotionPrimitives';
import { NotificationCenter } from './NotificationCenter';
import { PageHeader } from './PageHeader';
import {
  ProjectMilestoneRecord,
  ProjectTimeline,
  TrackedInquiry,
} from './ProjectTimeline';
import { ProjectWorkspace } from './ProjectWorkspace';
import { UserAvatar } from './UserAvatar';

const CHANNEL_LABELS: Record<PreferredContactChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  phone: 'Phone Call',
  google_meet: 'Google Meet',
};

interface DashboardPageProps {
  onNavigate: (page: PageRoute) => void;
}

const ProfileSuccessBanner: React.FC<{ message: string; className?: string }> = ({
  message,
  className = '',
}) => (
  <motion.div
    role="status"
    aria-live="polite"
    initial={{ opacity: 0, y: 8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -6, scale: 0.98 }}
    transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
    className={`relative overflow-hidden flex items-center gap-3 rounded-xl border border-[#10B981]/35 dark:border-[#10B981]/40 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 px-4 py-3 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0] shadow-[0_8px_20px_rgba(16,185,129,0.08)] ${className}`}
  >
    {/* Subtle celebratory sheen */}
    <motion.span
      aria-hidden="true"
      initial={{ x: '-110%', opacity: 0.5 }}
      animate={{ x: '220%', opacity: 0 }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
      className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-20 bg-gradient-to-r from-transparent via-white/55 dark:via-white/15 to-transparent"
    />

    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
      {/* Subtle pulse ring */}
      <motion.span
        aria-hidden="true"
        initial={{ scale: 0.75, opacity: 0.7 }}
        animate={{ scale: 1.65, opacity: 0 }}
        transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
        className="absolute inset-0 rounded-full bg-[#10B981]/40"
      />
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_SNAPPY}
        className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <motion.path
            d="M3.5 8.5L6.5 11.5L12.5 4.8"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.34, delay: 0.08, ease: EASE_OUT_EXPO }}
          />
        </svg>
      </motion.span>
    </div>

    <span className="relative z-10">{message}</span>
  </motion.div>
);

function formatCreationDate(creationTime?: string): string {
  if (!creationTime) return 'Unavailable';
  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) return creationTime;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

async function compressAvatarImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Please choose a PNG, JPEG, WebP, or GIF image file.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Selected image must be 10 MB or smaller.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid or corrupted image file.'));
    el.src = rawDataUrl;
  });

  const targetSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas is unavailable for image processing.');
  }

  const sourceMin = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sx = Math.max(0, ((img.naturalWidth || img.width) - sourceMin) / 2);
  const sy = Math.max(0, ((img.naturalHeight || img.height) - sourceMin) / 2);
  ctx.drawImage(img, sx, sy, sourceMin, sourceMin, 0, 0, targetSize, targetSize);

  const candidates = [
    { mime: 'image/webp', quality: 0.84 },
    { mime: 'image/jpeg', quality: 0.84 },
    { mime: 'image/jpeg', quality: 0.7 },
    { mime: 'image/jpeg', quality: 0.55 },
  ];

  for (const { mime, quality } of candidates) {
    const encoded = canvas.toDataURL(mime, quality);
    if (encoded.length <= MAX_PROFILE_PHOTO_LENGTH - 1000 && isValidProfilePhotoUrl(encoded)) {
      return encoded;
    }
  }

  throw new Error('Image could not be compressed under 110 KB. Please choose a smaller photo.');
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    user,
    profilePhotoUrl,
    profileDetails,
    updateUserDisplayName,
    updateUserProfilePhoto,
    updateUserProfileDetails,
    signOutUser,
  } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullProfileNotice, setFullProfileNotice] = useState<string | null>(null);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeInquiry, setActiveInquiry] = useState<TrackedInquiry | null>(null);
  const [activeMilestones, setActiveMilestones] = useState<ProjectMilestoneRecord[]>([]);

  const handleTimelineStateChange = useCallback(
    (inquiry: TrackedInquiry | null, milestones: ProjectMilestoneRecord[]) => {
      setActiveInquiry(inquiry);
      setActiveMilestones(milestones);
    },
    []
  );

  useEffect(() => {
    setDisplayName(user?.displayName || '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(false), 3800);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    if (!photoNotice) return;
    const timer = window.setTimeout(() => setPhotoNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [photoNotice]);

  useEffect(() => {
    if (!fullProfileNotice) return;
    const timer = window.setTimeout(() => setFullProfileNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [fullProfileNotice]);

  if (!user) return null;

  const createdDate = formatCreationDate(user.metadata?.creationTime);
  const providerLabel = user.providerData?.some((p) => p.providerId === 'google.com')
    ? 'Google Account'
    : 'Email & Password';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setPhotoNotice(null);
    setSavingPhoto(true);
    try {
      const compressedDataUri = await compressAvatarImageFile(file);
      await updateUserProfilePhoto(compressedDataUri);
      setShowUrlInput(false);
      setPhotoUrlInput('');
      setPhotoNotice('Profile picture updated successfully.');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to upload profile picture.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleApplyPhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoError(null);
    setPhotoNotice(null);

    const trimmed = photoUrlInput.trim();
    if (!trimmed.startsWith('https://') || trimmed.length < 12) {
      setPhotoError('Please enter a valid image URL starting with https://');
      return;
    }

    setSavingPhoto(true);
    try {
      await updateUserProfilePhoto(trimmed);
      setShowUrlInput(false);
      setPhotoUrlInput('');
      setPhotoNotice('Profile picture updated successfully.');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to save image URL.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    setPhotoNotice(null);
    setSavingPhoto(true);
    try {
      await updateUserProfilePhoto('');
      setPhotoNotice('Profile picture removed.');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to remove profile picture.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError('Profile name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 100) {
      setError('Profile name must be 100 characters or fewer.');
      return;
    }

    setSaving(true);
    try {
      await updateUserDisplayName(trimmed);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Account Dashboard"
          title="Manage your 0xDEV profile."
          description="Update your account details, follow project milestones, message our engineers, and control your notifications."
          currentLabel="Dashboard"
          onNavigate={onNavigate}
        />
      </div>

      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20 print:py-0 print:bg-white transition-colors">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start print:hidden">
            {/* Left Card: Account Overview */}
            <Reveal delay={0.04} className="lg:col-span-6 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <AnimatePresence>
                      {(photoNotice || fullProfileNotice || savedNotice) && (
                        <motion.span
                          key="overview-avatar-pulse"
                          aria-hidden="true"
                          initial={{ scale: 0.92, opacity: 0.85 }}
                          animate={{ scale: 1.24, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                          className="pointer-events-none absolute -inset-1 rounded-2xl border-2 border-[#10B981]"
                        />
                      )}
                    </AnimatePresence>
                    <UserAvatar
                      src={profilePhotoUrl}
                      name={user.displayName}
                      email={user.email}
                      size="lg"
                    />
                    <button
                      type="button"
                      disabled={savingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload a new profile picture"
                      title="Change profile picture"
                      className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] shadow-sm transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                      Signed-In Member
                    </p>
                    <h2 className="mt-0.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                      {user.displayName || 'No name set yet'}
                    </h2>
                    <p className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
                      {providerLabel}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFullProfileNotice(null);
                    setEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EE1119] whitespace-nowrap shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit Profile</span>
                </button>
              </div>

              <AnimatePresence>
                {fullProfileNotice && (
                  <ProfileSuccessBanner message={fullProfileNotice} className="mt-5" />
                )}
              </AnimatePresence>

              {/* Bio Summary */}
              <div className="mt-5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white/80 dark:bg-[#141A38] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                  Bio / Role Summary
                </p>
                <p
                  className={`mt-1.5 text-sm leading-relaxed ${
                    profileDetails.bio
                      ? 'text-[#1A1464] dark:text-[#F4F6FC]'
                      : 'italic text-[#6B7188] dark:text-[#8E97B8]'
                  }`}
                >
                  {profileDetails.bio ||
                    'No bio added yet. Click Edit Profile to share your role or project focus.'}
                </p>
              </div>

              <dl className="mt-6 space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      Email Address
                    </dt>
                    <dd className="mt-0.5 text-sm sm:text-base font-bold text-[#1A1464] dark:text-[#F4F6FC] break-all">
                      {user.email || 'Not provided'}
                    </dd>
                    <dd className="mt-0.5 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                      {user.emailVerified ? 'Verified email' : 'Verification pending'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      Contact Details &amp; Channel
                    </dt>
                    <dd className="mt-0.5 text-sm sm:text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      Preferred: {CHANNEL_LABELS[profileDetails.preferredChannel]}
                    </dd>
                    <dd className="mt-0.5 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                      {[profileDetails.phone, profileDetails.country].filter(Boolean).join(' · ') ||
                        'Add phone & country in Edit Profile'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      Notification Preferences
                    </dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                      {profileDetails.projectUpdatesOptIn
                        ? 'Project alerts enabled'
                        : 'Project alerts muted'}
                      <span className="mx-1.5 text-[#6B7188] dark:text-[#8E97B8]" aria-hidden="true">
                        ·
                      </span>
                      {profileDetails.marketingOptIn
                        ? 'Dispatches subscribed'
                        : 'Dispatches off'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      Account Created
                    </dt>
                    <dd className="mt-0.5 text-sm sm:text-base font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                      {createdDate}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-8 pt-6 border-t border-[#E5E7F0] dark:border-[#242C54] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                >
                  Submit or view project inquiries →
                </button>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#EE1119] hover:text-[#EE1119]"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </Reveal>

            {/* Right Card: Update Profile Name Form */}
            <Reveal delay={0.1} className="lg:col-span-6 relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.06)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <div
                aria-hidden="true"
                className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>Profile Settings</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                Profile Picture &amp; Name
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                Changes save immediately to your 0xDEV account and sync across your client portal.
              </p>

              {/* Profile Picture Controls */}
              <div className="mt-6 border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                  Profile Picture
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="relative shrink-0">
                    <AnimatePresence>
                      {photoNotice && (
                        <motion.span
                          key="settings-avatar-pulse"
                          aria-hidden="true"
                          initial={{ scale: 0.9, opacity: 0.9 }}
                          animate={{ scale: 1.26, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                          className="pointer-events-none absolute -inset-1 rounded-2xl border-2 border-[#10B981]"
                        />
                      )}
                    </AnimatePresence>
                    <UserAvatar
                      src={profilePhotoUrl}
                      name={user.displayName}
                      email={user.email}
                      size="lg"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="sr-only"
                      aria-label="Choose profile picture file"
                    />
                    <button
                      type="button"
                      disabled={savingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#EE1119] disabled:opacity-60 whitespace-nowrap"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{savingPhoto ? 'Saving...' : 'Upload Photo'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingPhoto}
                      onClick={() => {
                        setShowUrlInput((prev) => !prev);
                        setPhotoError(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8] disabled:opacity-60 whitespace-nowrap"
                    >
                      <Link2 className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>{showUrlInput ? 'Hide URL' : 'Use Image URL'}</span>
                    </button>

                    {profilePhotoUrl && (
                      <button
                        type="button"
                        disabled={savingPhoto}
                        onClick={() => void handleRemovePhoto()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2.5 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60 whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  PNG, JPEG, WebP, or GIF. Automatically cropped and optimized for fast portal loading.
                </p>

                <AnimatePresence>
                  {showUrlInput && (
                    <motion.form
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      onSubmit={handleApplyPhotoUrl}
                      noValidate
                      className="mt-3 overflow-hidden flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="url"
                        value={photoUrlInput}
                        onChange={(e) => {
                          setPhotoUrlInput(e.target.value);
                          if (photoError) setPhotoError(null);
                        }}
                        placeholder="Paste an https:// image link"
                        aria-label="External HTTPS image URL"
                        className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={savingPhoto}
                        className="inline-flex items-center justify-center rounded-xl bg-[#EE1119] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#D00D14] disabled:opacity-60 whitespace-nowrap shrink-0"
                      >
                        Apply URL
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {photoError && (
                  <p className="mt-2.5 text-xs font-semibold text-[#EE1119]">{photoError}</p>
                )}

                <AnimatePresence>
                  {photoNotice && (
                    <ProfileSuccessBanner message={photoNotice} className="mt-3" />
                  )}
                </AnimatePresence>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="dashboard-display-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Profile Name <span className="text-[#EE1119]">*</span>
                  </label>
                  <input
                    id="dashboard-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (error) setError(null);
                      if (savedNotice) setSavedNotice(false);
                    }}
                    placeholder="Your display name"
                    aria-invalid={Boolean(error)}
                    className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:bg-white dark:focus:bg-[#182044] transition-colors ${
                      error ? 'border-[#EE1119]' : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                    }`}
                  />
                  {error && (
                    <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{error}</p>
                  )}
                </div>

                <AnimatePresence>
                  {savedNotice && (
                    <ProfileSuccessBanner message="Profile name updated successfully." />
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SNAPPY}
                    className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-200 disabled:opacity-60 ${
                      savedNotice
                        ? 'bg-[#10B981] shadow-[0_10px_24px_rgba(16,185,129,0.25)] hover:bg-[#059669]'
                        : 'bg-[#EE1119] shadow-[0_10px_24px_rgba(238,17,25,0.22)] hover:bg-[#D00D14]'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {savedNotice ? (
                        <motion.span
                          key="btn-saved"
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.9 }}
                          transition={SPRING_SNAPPY}
                          className="inline-flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>Saved</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="btn-save"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                          className="inline-flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          <span>{saving ? 'Saving...' : 'Save Profile Name'}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => {
                      setFullProfileNotice(null);
                      setEditModalOpen(true);
                    }}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-3.5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]"
                  >
                    <Pencil className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                    <span>Edit Bio &amp; Preferences</span>
                  </button>
                </div>
              </form>
            </Reveal>
          </div>

          <EditProfileModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            initialDisplayName={user.displayName || ''}
            initialDetails={profileDetails}
            userEmail={user.email || ''}
            photoUrl={profilePhotoUrl}
            onSave={async (params) => {
              await updateUserProfileDetails(params);
              setFullProfileNotice('Profile, bio, and contact preferences updated.');
            }}
          />

          <div className="print:hidden">
            <ProjectTimeline
              onNavigate={onNavigate}
              onActiveStateChange={handleTimelineStateChange}
            />
          </div>

          <ProjectWorkspace inquiry={activeInquiry} milestones={activeMilestones} />

          <div className="print:hidden">
            <AdminPortfolioManager />
            <AdminBlogManager />
            <NotificationCenter />
          </div>
        </div>
      </section>
    </>
  );
};
