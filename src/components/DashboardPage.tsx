import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
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
          description="View your registered account details, track live project milestones, collaborate with your engineering squad, and manage your 0xDEV notifications."
          currentLabel="Dashboard"
          onNavigate={onNavigate}
        />
      </div>

      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20 print:py-0 print:bg-white transition-colors">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start print:hidden">
            {/* Left Card: Account Overview */}
            <div className="lg:col-span-6 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
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

              {fullProfileNotice && (
                <div
                  role="status"
                  className="mt-5 flex items-center gap-2 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-white dark:bg-[#141A38] px-4 py-2.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <span>{fullProfileNotice}</span>
                </div>
              )}

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
            </div>

            {/* Right Card: Update Profile Name Form */}
            <div className="lg:col-span-6 relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.06)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
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
                  <UserAvatar
                    src={profilePhotoUrl}
                    name={user.displayName}
                    email={user.email}
                    size="lg"
                  />
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

                {showUrlInput && (
                  <form onSubmit={handleApplyPhotoUrl} noValidate className="mt-3 flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="url"
                      value={photoUrlInput}
                      onChange={(e) => {
                        setPhotoUrlInput(e.target.value);
                        if (photoError) setPhotoError(null);
                      }}
                      placeholder="https://example.com/avatar.jpg"
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
                  </form>
                )}

                {photoError && (
                  <p className="mt-2.5 text-xs font-semibold text-[#EE1119]">{photoError}</p>
                )}

                {photoNotice && (
                  <div
                    role="status"
                    className="mt-3 flex items-center gap-2 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                    <span>{photoNotice}</span>
                  </div>
                )}
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
                    placeholder="Arigye Wisdom"
                    aria-invalid={Boolean(error)}
                    className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:bg-white dark:focus:bg-[#182044] transition-colors ${
                      error ? 'border-[#EE1119]' : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                    }`}
                  />
                  {error && (
                    <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{error}</p>
                  )}
                </div>

                {savedNotice && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-3 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                    <span>Profile name updated successfully.</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all duration-150 hover:bg-[#D00D14] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    <span>{saving ? 'Saving...' : 'Save Profile Name'}</span>
                  </button>
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
            </div>
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
