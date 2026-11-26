import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCheck,
  Film,
  FolderGit2,
  Gift,
  X,
} from 'lucide-react';
import { PageRoute } from '../data/siteData';
import {
  BellCategory,
  RealtimeBellAlert,
  useRealtimeNotifications,
} from '../hooks/useRealtimeNotifications';
import { EASE_OUT_EXPO } from './MotionPrimitives';

type FilterScope = 'all' | BellCategory;

interface NotificationBellProps {
  onNavigate: (page: PageRoute) => void;
  onSelectMovie: (movieId: string | null) => void;
  onSelectArticle: (slug: string | null) => void;
  onBeforeOpen?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigate,
  onSelectMovie,
  onSelectArticle,
  onBeforeOpen,
}) => {
  const { alerts, unreadCount, countsByCategory, loading, markAlertRead, markAllRead } =
    useRealtimeNotifications();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterScope>('all');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    return alerts.filter((a) => a.category === filter);
  }, [alerts, filter]);

  const handleOpenToggle = () => {
    if (!open && onBeforeOpen) onBeforeOpen();
    setOpen((prev) => !prev);
  };

  const handleAlertClick = (alert: RealtimeBellAlert) => {
    setOpen(false);
    void markAlertRead(alert);

    if (alert.route === 'movies') {
      onSelectMovie(alert.targetId || null);
      return;
    }
    if (alert.route === 'blog') {
      onSelectArticle(alert.targetId || null);
      return;
    }

    onNavigate('dashboard');
    const scrollTargetId =
      alert.category === 'referral' || alert.targetId === 'referral-program'
        ? 'referral-program'
        : 'notification-center';
    window.setTimeout(() => {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth' });
    }, 180);
  };

  const handleOpenCenter = () => {
    setOpen(false);
    onNavigate('dashboard');
    window.setTimeout(() => {
      document.getElementById('notification-center')?.scrollIntoView({ behavior: 'smooth' });
    }, 180);
  };

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <>
      <motion.button
        type="button"
        onClick={handleOpenToggle}
        whileTap={{ scale: 0.95 }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Real-time notifications (${unreadCount} unread)`
            : 'Real-time notifications'
        }
        title="Real-time alerts: project updates, new movies & upcoming blog posts"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-white dark:hover:bg-[#1C234B] shrink-0"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-[20px] h-[20px] items-center justify-center rounded-full bg-[#EE1119] px-1 text-[10px] font-extrabold leading-none text-white tabular-nums ring-2 ring-white dark:ring-[#090D1F]">
            {badgeText}
          </span>
        )}
      </motion.button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                className="fixed inset-0 z-[85] flex items-start justify-end p-3 sm:p-5 pt-16 sm:pt-[4.5rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="realtime-bell-title"
              >
                {/* Click-outside Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 bg-[#090D1F]/45 backdrop-blur-[2px]"
                />

                {/* Popover Panel */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                  className="relative z-10 flex max-h-[82dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] shadow-2xl"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                        <h2
                          id="realtime-bell-title"
                          className="font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Live Activity Feed
                        </h2>
                      </div>
                      <p className="mt-0.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0] tabular-nums">
                        {unreadCount > 0
                          ? `${unreadCount} unread across projects, movies & blog`
                          : 'You are caught up on all updates'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void markAllRead()}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]"
                        >
                          <CheckCheck className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close notifications panel"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:text-[#EE1119]"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <div
                    className="flex items-center gap-1 border-b border-[#E5E7F0] dark:border-[#242C54] px-4 py-2.5 overflow-x-auto"
                    role="tablist"
                    aria-label="Filter live notifications"
                  >
                    {(
                      [
                        { id: 'all', label: `All (${countsByCategory.all})` },
                        { id: 'project', label: `Projects (${countsByCategory.project})` },
                        { id: 'movie', label: `Movies (${countsByCategory.movie})` },
                        { id: 'blog', label: `Blog (${countsByCategory.blog})` },
                        { id: 'referral', label: `Referrals (${countsByCategory.referral})` },
                      ] as const
                    ).map((tab) => {
                      const active = filter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setFilter(tab.id)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                            active
                              ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                              : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:bg-[#F6F7FB] dark:hover:bg-[#101530] hover:text-[#1A1464] dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feed List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7F0] dark:divide-[#242C54]">
                    {loading && filteredAlerts.length === 0 ? (
                      <p className="px-5 py-10 text-center text-sm text-[#6B7188] dark:text-[#8E97B8]">
                        Connecting live updates...
                      </p>
                    ) : filteredAlerts.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <Bell
                          className="mx-auto h-7 w-7 text-[#6B7188]/60 dark:text-[#8E97B8]/60"
                          aria-hidden="true"
                        />
                        <p className="mt-3 font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                          No alerts in this category yet
                        </p>
                        <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                          Project updates, new movie drops, and upcoming articles appear here in real time.
                        </p>
                      </div>
                    ) : (
                      filteredAlerts.map((item) => {
                        const Icon =
                          item.category === 'movie'
                            ? Film
                            : item.category === 'blog'
                              ? BookOpen
                              : item.category === 'referral'
                                ? Gift
                                : FolderGit2;
                        const accentBg =
                          item.category === 'movie' || item.category === 'referral'
                            ? 'bg-[#EE1119] text-white'
                            : 'bg-[#1A1464] dark:bg-[#232B6E] text-white';

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAlertClick(item)}
                            className={`w-full px-5 py-3.5 text-left transition-colors hover:bg-[#F6F7FB] dark:hover:bg-[#101530] ${
                              !item.isRead
                                ? 'bg-[#F6F7FB]/80 dark:bg-[#101530]/80'
                                : 'bg-white dark:bg-[#141A38]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentBg}`}
                              >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                                  <span
                                    className={
                                      item.category === 'movie'
                                        ? 'font-bold text-[#EE1119]'
                                        : 'font-bold text-[#1A1464] dark:text-[#9FA8FF]'
                                    }
                                  >
                                    {item.badgeLabel}
                                  </span>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  <span>{item.timestampLabel}</span>
                                  {!item.isRead && (
                                    <>
                                      <span className="mx-1.5" aria-hidden="true">·</span>
                                      <span className="font-bold text-[#EE1119]">Unread</span>
                                    </>
                                  )}
                                </p>

                                <p className="mt-0.5 truncate font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                                  {item.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                                  {item.summary}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-3 border-t border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-3">
                    <button
                      type="button"
                      onClick={handleOpenCenter}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                    >
                      <span>Open Full Notification Center</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
