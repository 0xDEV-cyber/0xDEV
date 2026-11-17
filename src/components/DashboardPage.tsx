import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle2, LogOut, Mail, Save, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageRoute } from '../data/siteData';
import { AdminBlogManager } from './AdminBlogManager';
import { AdminPortfolioManager } from './AdminPortfolioManager';
import { NotificationCenter } from './NotificationCenter';
import { PageHeader } from './PageHeader';
import {
  ProjectMilestoneRecord,
  ProjectTimeline,
  TrackedInquiry,
} from './ProjectTimeline';
import { ProjectWorkspace } from './ProjectWorkspace';

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

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '0X').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, updateUserDisplayName, signOutUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
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
  const initials = getInitials(user.displayName, user.email);
  const providerLabel = user.providerData?.some((p) => p.providerId === 'google.com')
    ? 'Google Account'
    : 'Email & Password';

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
              <div className="flex items-center gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
                <div
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#1A1464] dark:bg-[#232B6E] font-display text-xl font-extrabold text-white"
                  aria-hidden="true"
                >
                  <span className="absolute -bottom-2 -right-2 h-7 w-7 -skew-x-12 bg-[#EE1119]" />
                  <span className="relative z-10">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Signed-In Member
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                    {user.displayName || 'No name set yet'}
                  </h2>
                  <p className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">{providerLabel}</p>
                </div>
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

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      Current Profile Name
                    </dt>
                    <dd className="mt-0.5 text-sm sm:text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {user.displayName || 'Not set'}
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
                Update Profile Name
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                Changes save immediately to your 0xDEV account and sync across your client portal.
              </p>

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

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all duration-150 hover:bg-[#D00D14] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>{saving ? 'Saving...' : 'Save Profile Name'}</span>
                </button>
              </form>
            </div>
          </div>

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
