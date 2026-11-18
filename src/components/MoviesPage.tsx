import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Check,
  Clapperboard,
  Download,
  Film,
  HardDrive,
  Laptop,
  Play,
  ShieldCheck,
  Smartphone,
  Subtitles,
} from 'lucide-react';
import { PageRoute } from '../data/siteData';
import {
  EASE_OUT_EXPO,
  InteractiveCard,
  Reveal,
  SPRING_SNAPPY,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface MoviesPageProps {
  onNavigate: (page: PageRoute) => void;
}

type QualityTierId = '480p' | '720p' | '1080p';

const QUALITY_TIERS: {
  id: QualityTierId;
  label: string;
  sizeRange: string;
  codec: string;
  bestFor: string;
  audio: string;
  subtitles: string;
  checksum: string;
}[] = [
  {
    id: '480p',
    label: '480p Lite',
    sizeRange: '280 – 420 MB',
    codec: 'H.264 / MP4 Fast-Start',
    bestFor: 'Mobile data connections and fast offline saving on phones.',
    audio: 'AAC Stereo · 128 kbps',
    subtitles: 'Embedded WebVTT (EN / SW)',
    checksum: 'SHA-256 Verified Packages',
  },
  {
    id: '720p',
    label: '720p HD',
    sizeRange: '620 – 890 MB',
    codec: 'H.265 / MP4 Stream-Ready',
    bestFor: 'Crisp tablet and laptop playback with balanced file sizes.',
    audio: 'AAC Stereo · 192 kbps',
    subtitles: 'Multi-track SRT & WebVTT',
    checksum: 'SHA-256 Verified Packages',
  },
  {
    id: '1080p',
    label: '1080p Full HD',
    sizeRange: '1.2 – 1.8 GB',
    codec: 'AV1 & H.264 Dual Bundle',
    bestFor: 'Large monitors, projectors, and studio archive viewing.',
    audio: 'AAC / Opus 256 kbps',
    subtitles: 'Multi-track SRT & WebVTT',
    checksum: 'SHA-256 Verified Packages',
  },
];

const UPCOMING_COLLECTIONS = [
  {
    id: 'open-classics',
    number: '01',
    title: 'Open Classics & Public Cinema',
    meta: 'Restored Archive · Free MP4',
    summary:
      'Timeless public-domain cinema restored cleanly for modern screens, complete with synced subtitle tracks and direct download links.',
    highlights: ['Zero paywall or sign-up wall', 'Direct resumable HTTP downloads'],
    icon: Film,
  },
  {
    id: 'indie-regional',
    number: '02',
    title: 'Independent & Regional Films',
    meta: 'Creator-Licensed · East Africa & Global',
    summary:
      'Festival shorts, independent features, and community stories licensed directly from filmmakers for free viewing and sharing.',
    highlights: ['Creator attribution & project notes', 'Behind-the-scenes production files'],
    icon: Clapperboard,
  },
  {
    id: 'tech-docs',
    number: '03',
    title: 'Engineering & Builder Documentaries',
    meta: 'Open Source · Field Stories',
    summary:
      'Full-length documentaries profiling software engineers, African tech ecosystems, hardware makers, and open infrastructure.',
    highlights: ['Chapter markers & transcripts', 'Offline study pack bundles'],
    icon: Laptop,
  },
  {
    id: 'offline-packs',
    number: '04',
    title: 'Offline-Ready Mobile Downloads',
    meta: 'Low-Data Friendly · 480p to 1080p',
    summary:
      'Every film ships in three compressed sizes so you can download quickly on metered mobile data and watch offline anywhere.',
    highlights: ['Clean filenames with SHA-256 checks', 'Works in any default media player'],
    icon: Download,
  },
];

const LAUNCH_CHECKLIST = [
  { stage: '01. Video Encoding Pipeline', status: 'Ready', detail: 'Automated 480p, 720p, and 1080p MP4 transcoding' },
  { stage: '02. Open Catalog Curation', status: 'In Progress', detail: 'Clearing indie & public-domain titles with subtitle sync' },
  { stage: '03. Free CDN Mirror', status: 'Upcoming', detail: 'Fast regional edge caching for zero-cost downloads' },
];

const WAITLIST_STORAGE_KEY = '0xdev_movies_waitlist_email';

export const MoviesPage: React.FC<MoviesPageProps> = ({ onNavigate }) => {
  const [selectedTier, setSelectedTier] = useState<QualityTierId>('720p');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [archiveImgFailed, setArchiveImgFailed] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    if (!justSubscribed) return;
    const timer = window.setTimeout(() => setJustSubscribed(false), 4500);
    return () => window.clearTimeout(timer);
  }, [justSubscribed]);

  const activeTier = QUALITY_TIERS.find((t) => t.id === selectedTier) || QUALITY_TIERS[1];

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = notifyEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setFormError('Please enter a valid email address to receive the launch alert.');
      return;
    }
    try {
      window.localStorage.setItem(WAITLIST_STORAGE_KEY, trimmed);
    } catch {
      // Ignore storage quota errors
    }
    setSavedEmail(trimmed);
    setNotifyEmail('');
    setJustSubscribed(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Coming Soon · Free Media Hub"
        title="Movies & free downloads, built for offline viewing."
        description="We are launching a free cinema and documentary archive on 0xDEV. Stream directly or download clean, lightweight MP4 files with zero subscriptions."
        currentLabel="Movies"
        onNavigate={onNavigate}
      />

      {/* Section 1: Hero Screening Showcase + Interactive Quality Preview */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
            {/* Left: 16:9 Cinema Hub Preview */}
            <Reveal direction="right" distance={20} className="lg:col-span-7 flex">
              <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#120D4A] text-white shadow-[0_20px_50px_rgba(26,20,100,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                  {!heroImgFailed ? (
                    <img
                      src="/src/assets/images/movies_cinema_hub_1795014042309.jpg"
                      alt="0xDEV digital screening room and free movie download hub preview"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1A1464] via-[#120D4A] to-[#090D1F] p-8 text-center">
                      <Clapperboard className="h-12 w-12 text-[#EE1119]" aria-hidden="true" />
                      <p className="mt-3 font-display text-lg font-bold text-white">
                        0xDEV Free Cinema &amp; Downloads
                      </p>
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#090D1F]/90 via-[#090D1F]/35 to-transparent"
                  />
                  <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                        Coming Soon · Free Access
                      </p>
                      <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-white">
                        Stream online or save full movies for offline viewing.
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/20 whitespace-nowrap shrink-0">
                      <Play className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>Preparing First Release</span>
                    </span>
                  </div>
                </div>

                {/* Launch Readiness Strip */}
                <div className="grid grid-cols-1 gap-4 border-t border-white/15 bg-[#1A1464] dark:bg-[#141A3B] p-5 sm:grid-cols-3">
                  {LAUNCH_CHECKLIST.map((item) => (
                    <div key={item.stage} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="text-white/90">{item.stage}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#EE1119]">{item.status}</p>
                      <p className="text-xs text-white/75 leading-relaxed">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Right: Interactive Download Format Inspector */}
            <Reveal direction="left" distance={20} delay={0.08} className="lg:col-span-5 flex">
              <div className="relative flex w-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                />

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Download Packaging Preview
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    Choose your quality before you download.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                    Every movie and documentary will include three direct MP4 download sizes with
                    clean audio and subtitle tracks.
                  </p>

                  {/* Interactive Tier Switcher */}
                  <div
                    role="tablist"
                    aria-label="Preview free movie download sizes"
                    className="mt-6 grid grid-cols-3 gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-1.5"
                  >
                    {QUALITY_TIERS.map((tier) => {
                      const active = selectedTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSelectedTier(tier.id)}
                          className={`relative rounded-lg px-2.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'text-white'
                              : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="movies-tier-pill"
                              aria-hidden="true"
                              transition={SPRING_SNAPPY}
                              className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                            />
                          )}
                          <span className="relative z-10">{tier.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTier.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      className="mt-5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-5 space-y-4"
                    >
                      <div className="flex items-baseline justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                          Typical File Size
                        </span>
                        <span className="font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                          {activeTier.sizeRange}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {activeTier.bestFor}
                      </p>

                      <dl className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <HardDrive className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Video Format</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {activeTier.codec}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <Smartphone className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Audio Stream</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {activeTier.audio}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <Subtitles className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Captions</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {activeTier.subtitles}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Integrity</span>
                          </dt>
                          <dd className="font-bold text-[#10B981]">{activeTier.checksum}</dd>
                        </div>
                      </dl>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] flex items-center justify-between text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                  <span>Cost at launch</span>
                  <span className="font-display text-sm font-extrabold text-[#10B981]">
                    100% Free · No Ads
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Section 2: Upcoming Movie Collections */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-16 sm:py-20 border-y border-[#E5E7F0] dark:border-[#242C54]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center mb-12">
              <div className="lg:col-span-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  What Is Coming
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                  Four free film &amp; download shelves preparing for release.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] max-w-2xl">
                  We are curating open-license cinema, independent filmmaker releases, and engineering
                  documentaries so visitors can stream online or save MP4 files cleanly for offline
                  playback.
                </p>
              </div>
              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] aspect-[4/3]">
                  {!archiveImgFailed ? (
                    <img
                      src="/src/assets/images/documentary_film_archive_1795014043378.jpg"
                      alt="Cinema camera and calibrated monitor preparing indie films and documentaries"
                      referrerPolicy="no-referrer"
                      onError={() => setArchiveImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[#1A1464] p-6 text-center text-white">
                      <Film className="h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                      <p className="mt-2 font-display text-base font-bold">
                        Curated Open Cinema Archive
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          <StaggerGrid staggerDelay={0.06} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {UPCOMING_COLLECTIONS.map((shelf) => {
              const Icon = shelf.icon;
              return (
                <StaggerItem key={shelf.id} className="h-full">
                  <InteractiveCard
                    hoverY={-5}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-7 transition-colors hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:shadow-md"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover/card:scale-x-100"
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] border border-[#E5E7F0] dark:border-[#242C54] transition-colors group-hover/card:bg-[#1A1464] dark:group-hover/card:bg-[#2E368F] group-hover/card:text-white">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="font-display text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                          {shelf.number} · {shelf.meta}
                        </span>
                      </div>

                      <h3 className="mt-5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        {shelf.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {shelf.summary}
                      </p>
                    </div>

                    <ul className="relative z-10 mt-5 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] space-y-2">
                      {shelf.highlights.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          <Check className="h-3.5 w-3.5 text-[#EE1119] shrink-0" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </InteractiveCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Section 3: Launch Alert Waitlist */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span>Launch Notification</span>
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                Get notified the moment free movie downloads go live.
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4F63] dark:text-[#C2C9E0] max-w-2xl">
                Leave your email below to receive one announcement when the first batch of free
                films and downloadable offline packages opens on 0xDEV.
              </p>

              <form onSubmit={handleNotifySubmit} noValidate className="mt-6 flex flex-col sm:flex-row gap-3">
                <label htmlFor="movies-waitlist-email" className="sr-only">
                  Email address for launch notification
                </label>
                <input
                  id="movies-waitlist-email"
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => {
                    setNotifyEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Enter your email address"
                  className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-4 py-3 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] transition-colors"
                />
                <motion.button
                  type="submit"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAPPY}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#D00D14] whitespace-nowrap shrink-0"
                >
                  <span>Notify Me</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
              </form>

              {formError && (
                <p className="mt-2.5 text-xs font-semibold text-[#EE1119]">{formError}</p>
              )}

              <AnimatePresence>
                {(justSubscribed || savedEmail) && (
                  <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                    className="mt-4 flex items-center gap-3 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 px-4 py-3 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <motion.path
                          d="M3.5 8.5L6.5 11.5L12.5 4.8"
                          stroke="currentColor"
                          strokeWidth="2.1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
                        />
                      </svg>
                    </span>
                    <span>
                      Launch alert saved for <strong>{savedEmail}</strong>. We will notify you as
                      soon as the free catalog opens.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
