import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  Copy,
  Film,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BrandedTemplateKind, buildBrandedEmailHtml } from '../utils/brandedEmailTemplates';
import { EASE_OUT_EXPO } from './MotionPrimitives';

export interface NotificationRecord {
  notificationId: string;
  recipientId: string;
  senderEmail: string;
  type: 'status_update' | 'admin_message' | 'movie_release' | 'blog_upcoming';
  title: string;
  body: string;
  inquiryId?: string;
  projectStatus?: string;
  linkRoute?: 'dashboard' | 'movies' | 'blog';
  targetId?: string;
  isRead: boolean;
  createdAtMs: number;
  createdAtLabel: string;
}

interface AdminInquirySummary {
  inquiryId: string;
  authorId: string;
  name: string;
  email: string;
  service: string;
  status: string;
}

type FilterTab = 'all' | 'unread' | 'status_update' | 'admin_message';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

function formatTimestamp(ts: unknown): { ms: number; label: string } {
  if (ts instanceof Timestamp) {
    const date = ts.toDate();
    return {
      ms: date.getTime(),
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date),
    };
  }
  return { ms: Date.now(), label: 'Just now' };
}

function formatStatusLabel(status?: string): string {
  if (!status) return '';
  const match = STATUS_OPTIONS.find((s) => s.value === status);
  return match ? match.label : status;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Admin dispatch state (only active when primary admin is signed in & verified)
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';
  const [adminInquiries, setAdminInquiries] = useState<AdminInquirySummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<{ uid: string; displayName: string }[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState('');
  const [nextStatus, setNextStatus] = useState('in_progress');
  const [statusNote, setStatusNote] = useState('');
  const [adminMsgRecipientId, setAdminMsgRecipientId] = useState('');
  const [adminMsgTitle, setAdminMsgTitle] = useState('');
  const [adminMsgBody, setAdminMsgBody] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [previewKind, setPreviewKind] = useState<BrandedTemplateKind>('verify');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Real-time listener for the signed-in user's notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: NotificationRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const ts = formatTimestamp(data.createdAt);
            const rawType = String(data.type || 'status_update');
            const normalizedType: NotificationRecord['type'] =
              rawType === 'admin_message' ||
              rawType === 'movie_release' ||
              rawType === 'blog_upcoming'
                ? rawType
                : 'status_update';
            return {
              notificationId: String(data.notificationId || d.id),
              recipientId: String(data.recipientId || ''),
              senderEmail: String(data.senderEmail || ''),
              type: normalizedType,
              title: String(data.title || ''),
              body: String(data.body || ''),
              inquiryId: data.inquiryId ? String(data.inquiryId) : undefined,
              projectStatus: data.projectStatus ? String(data.projectStatus) : undefined,
              linkRoute:
                data.linkRoute === 'movies' ||
                data.linkRoute === 'blog' ||
                data.linkRoute === 'dashboard'
                  ? data.linkRoute
                  : undefined,
              targetId: data.targetId ? String(data.targetId) : undefined,
              isRead: Boolean(data.isRead),
              createdAtMs: ts.ms,
              createdAtLabel: ts.label,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);

        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for inquiries & registered users when signed in as Primary Admin
  useEffect(() => {
    if (!isPrimaryAdmin) {
      setAdminInquiries([]);
      setAdminUsers([]);
      return;
    }

    const unsubInquiries = onSnapshot(
      collection(db, 'inquiries'),
      (snapshot) => {
        const rows: AdminInquirySummary[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            inquiryId: String(data.inquiryId || d.id),
            authorId: String(data.authorId || ''),
            name: String(data.name || ''),
            email: String(data.email || ''),
            service: String(data.service || ''),
            status: String(data.status || 'submitted'),
          };
        });
        setAdminInquiries(rows);
        setSelectedInquiryId((prev) =>
          rows.some((r) => r.inquiryId === prev) ? prev : rows[0]?.inquiryId || ''
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'inquiries');
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const rows = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.uid || d.id),
            displayName: String(data.displayName || 'Registered Member'),
          };
        });
        setAdminUsers(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => {
      unsubInquiries();
      unsubUsers();
    };
  }, [isPrimaryAdmin]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.isRead);
      case 'status_update':
        return notifications.filter((n) => n.type === 'status_update');
      case 'admin_message':
        return notifications.filter((n) => n.type !== 'status_update');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const handleMarkAsRead = async (item: NotificationRecord) => {
    if (!user || !user.emailVerified || item.isRead) return;
    setActionError(null);
    setActionBusyId(item.notificationId);
    const path = `notifications/${item.notificationId}`;
    try {
      await updateDoc(doc(db, 'notifications', item.notificationId), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      setActionError('Unable to mark alert as read right now.');
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || !user.emailVerified) return;
    const unreadItems = notifications.filter((n) => !n.isRead).slice(0, 450);
    if (unreadItems.length === 0) return;

    setActionError(null);
    setActionBusyId('all');
    try {
      const batch = writeBatch(db);
      unreadItems.forEach((item) => {
        batch.update(doc(db, 'notifications', item.notificationId), {
          isRead: true,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      setActionError('Unable to mark all alerts as read right now.');
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleAdminStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isPrimaryAdmin || !selectedInquiryId) return;
    const targetInquiry = adminInquiries.find((i) => i.inquiryId === selectedInquiryId);
    if (!targetInquiry) return;

    setAdminBusy(true);
    setAdminFeedback(null);
    const notifId = `NOTIF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const statusLabel = formatStatusLabel(nextStatus);
    const title = `Project status updated to ${statusLabel}`.slice(0, 140);
    const defaultBody = `Your ${targetInquiry.service} project brief (${targetInquiry.inquiryId}) is now marked as ${statusLabel}.`;
    const body = (statusNote.trim() || defaultBody).slice(0, 2000);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'inquiries', targetInquiry.inquiryId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', notifId), {
        notificationId: notifId,
        recipientId: targetInquiry.authorId,
        senderEmail: (user.email || 'arigyewisdom7@gmail.com').slice(0, 200),
        type: 'status_update',
        title,
        body,
        inquiryId: targetInquiry.inquiryId,
        projectStatus: nextStatus,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setStatusNote('');
      setAdminFeedback(
        `Status updated to ${statusLabel} and alert delivered to ${targetInquiry.name}.`
      );
    } catch (error) {
      setAdminFeedback('Failed to update project status. Please try again.');
      handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isPrimaryAdmin) return;
    const recipient = adminMsgRecipientId.trim() || user.uid;
    if (adminMsgTitle.trim().length < 2 || adminMsgBody.trim().length < 2) {
      setAdminFeedback('Please enter both a message title and message body.');
      return;
    }

    setAdminBusy(true);
    setAdminFeedback(null);
    const notifId = `MSG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'notifications', notifId), {
        notificationId: notifId,
        recipientId: recipient,
        senderEmail: (user.email || 'arigyewisdom7@gmail.com').slice(0, 200),
        type: 'admin_message',
        title: adminMsgTitle.trim().slice(0, 140),
        body: adminMsgBody.trim().slice(0, 2000),
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setAdminMsgTitle('');
      setAdminMsgBody('');
      setAdminFeedback('Admin message dispatched to user notification center.');
    } catch (error) {
      setAdminFeedback('Failed to dispatch message. Please verify recipient and try again.');
      handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const uniqueRecipients = useMemo(() => {
    const map = new Map<string, { uid: string; label: string }>();
    adminInquiries.forEach((inq) => {
      if (inq.authorId && !map.has(inq.authorId)) {
        map.set(inq.authorId, { uid: inq.authorId, label: `${inq.name} (${inq.email})` });
      }
    });
    adminUsers.forEach((u) => {
      if (u.uid && !map.has(u.uid)) {
        map.set(u.uid, { uid: u.uid, label: `${u.displayName} (Registered Member)` });
      }
    });
    if (user && !map.has(user.uid)) {
      map.set(user.uid, {
        uid: user.uid,
        label: `${user.displayName || 'Self'} (${user.email})`,
      });
    }
    return Array.from(map.values());
  }, [adminInquiries, adminUsers, user]);

  useEffect(() => {
    if (uniqueRecipients.length === 0) return;
    setAdminMsgRecipientId((prev) =>
      uniqueRecipients.some((r) => r.uid === prev) ? prev : uniqueRecipients[0].uid
    );
  }, [uniqueRecipients]);

  return (
    <div id="notification-center" className="mt-10 space-y-8 scroll-mt-24">
      {/* Main Notification Center Card */}
      <div className="relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <div
          aria-hidden="true"
          className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span>Notification Center</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Project Status &amp; Admin Alerts
            </h2>
            <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
              <span className="font-semibold text-[#1A1464] dark:text-white tabular-nums">{unreadCount}</span>{' '}
              unread alert{unreadCount === 1 ? '' : 's'}
              <span className="mx-2 text-[#D3D7E6] dark:text-[#2E3766]" aria-hidden="true">·</span>
              <span className="tabular-nums">{notifications.length}</span> total
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {unreadCount > 0 && user?.emailVerified && (
              <button
                type="button"
                disabled={actionBusyId === 'all'}
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#101530] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] dark:hover:bg-[#2E368F] hover:text-white disabled:opacity-60 whitespace-nowrap"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div
          className="mt-5 flex flex-wrap gap-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-1.5 border border-[#E5E7F0] dark:border-[#242C54]"
          role="tablist"
          aria-label="Filter notifications"
        >
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'status_update', label: 'Status Updates' },
            { id: 'admin_message', label: 'Admin Messages' },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab.id as FilterTab)}
                className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="notif-filter-pill"
                    aria-hidden="true"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        {actionError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 px-4 py-3 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
          >
            {actionError}
          </div>
        )}
        {unreadCount > 0 && !user?.emailVerified && (
          <p className="mt-4 text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
            Verify your email address via the banner above to mark alerts as read.
          </p>
        )}
        <div className="mt-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-[#6B7188] dark:text-[#8E97B8]">Loading your alerts...</p>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D3D7E6] dark:border-[#2E3766] bg-[#F6F7FB]/50 dark:bg-[#101530] px-6 py-10 text-center">
              <Bell className="mx-auto h-7 w-7 text-[#6B7188]/60 dark:text-[#8E97B8]/60" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                No alerts in this view
              </p>
              <p className="mt-1 text-sm text-[#6B7188] dark:text-[#8E97B8]">
                You will see real-time alerts here whenever your project status is updated or an
                admin sends you a message.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((item) => {
                  const isStatus = item.type === 'status_update';
                  const isMovie = item.type === 'movie_release';
                  const isBlog = item.type === 'blog_upcoming';
                  const typeLabel = isStatus
                    ? 'Project Status Update'
                    : isMovie
                      ? 'New Movie Release'
                      : isBlog
                        ? 'Upcoming Blog Post'
                        : 'Admin Message';
                  return (
                    <motion.li
                      key={item.notificationId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                        item.isRead
                          ? 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530]/60'
                          : 'border-[#1A1464]/30 dark:border-[#4F59B8] bg-[#F6F7FB] dark:bg-[#101530]'
                      }`}
                    >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isStatus || isBlog
                              ? 'bg-[#1A1464] dark:bg-[#232B6E] text-white'
                              : 'bg-[#EE1119] text-white'
                          }`}
                        >
                          {isStatus ? (
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          ) : isMovie ? (
                            <Film className="h-4 w-4" aria-hidden="true" />
                          ) : isBlog ? (
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <span className={isStatus || isBlog ? 'text-[#1A1464] dark:text-[#9FA8FF]' : 'text-[#EE1119]'}>
                              {typeLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{item.createdAtLabel}</span>
                            {!item.isRead && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-bold text-[#EE1119]">Unread</span>
                              </>
                            )}
                          </div>

                          <h3 className="mt-1 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                            {item.body}
                          </p>

                          {(item.inquiryId || item.projectStatus) && (
                            <p className="mt-2 text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
                              {item.inquiryId && <span>Ref: {item.inquiryId}</span>}
                              {item.inquiryId && item.projectStatus && (
                                <span className="mx-2" aria-hidden="true">
                                  ·
                                </span>
                              )}
                              {item.projectStatus && (
                                <span>Status: {formatStatusLabel(item.projectStatus)}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {!item.isRead && user?.emailVerified && (
                        <button
                          type="button"
                          disabled={actionBusyId === item.notificationId}
                          onClick={() => void handleMarkAsRead(item)}
                          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] dark:hover:border-[#7C8CFF] disabled:opacity-60 whitespace-nowrap"
                        >
                          <Check className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      {/* Admin Dispatch Panel: Visible only to verified primary admin (arigyewisdom7@gmail.com) */}
      {isPrimaryAdmin && (
        <div className="rounded-2xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-8">
          <div className="border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#EE1119]">
              Admin Controls · {user?.email}
            </p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Update Project Status or Send Client Message
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
              Actions below update Firestore and immediately push an alert to the recipient’s
              Notification Center.
            </p>
          </div>

          {adminFeedback && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-white dark:bg-[#141A38] px-4 py-3 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
            >
              {adminFeedback}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Update Project Status Form */}
            <form
              onSubmit={handleAdminStatusUpdate}
              className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 space-y-4"
            >
              <h4 className="font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                Update Inquiry / Project Status
              </h4>

              {adminInquiries.length === 0 ? (
                <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  No project inquiries submitted yet. Submit a brief on the Contact page to test
                  status alerts.
                </p>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="admin-inquiry-select"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Project Inquiry
                    </label>
                    <select
                      id="admin-inquiry-select"
                      value={selectedInquiryId}
                      onChange={(e) => setSelectedInquiryId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                    >
                      {adminInquiries.map((inq) => (
                        <option key={inq.inquiryId} value={inq.inquiryId}>
                          {inq.name} · {inq.service} ({inq.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-status-select"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      New Status
                    </label>
                    <select
                      id="admin-status-select"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-status-note"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Status Note (Optional)
                    </label>
                    <input
                      id="admin-status-note"
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Architecture review completed; moving into sprint 1."
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adminBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Update Status &amp; Notify</span>
                  </button>
                </>
              )}
            </form>

            {/* Send Admin Message Form */}
            <form
              onSubmit={handleSendAdminMessage}
              className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 space-y-4"
            >
              <h4 className="font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                Send Direct Admin Message
              </h4>

              <div>
                <label
                  htmlFor="admin-msg-recipient"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Recipient
                </label>
                <select
                  id="admin-msg-recipient"
                  value={adminMsgRecipientId}
                  onChange={(e) => setAdminMsgRecipientId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                >
                  {uniqueRecipients.map((r) => (
                    <option key={r.uid} value={r.uid}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="admin-msg-title"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Alert Subject
                </label>
                <input
                  id="admin-msg-title"
                  type="text"
                  value={adminMsgTitle}
                  onChange={(e) => setAdminMsgTitle(e.target.value)}
                  placeholder="Discovery call scheduled for Thursday"
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-msg-body"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  Message
                </label>
                <textarea
                  id="admin-msg-body"
                  rows={2}
                  value={adminMsgBody}
                  onChange={(e) => setAdminMsgBody(e.target.value)}
                  placeholder="Hello, we reviewed your requirements and prepared your milestone estimate."
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={adminBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Send Admin Message</span>
              </button>
            </form>
          </div>

          {/* Client Trust & Branded Email Template Kit (Primary Admin Only) */}
          <div className="mt-8 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Client Trust &amp; Branded Email Kit</span>
                </div>
                <h4 className="mt-1 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                  Custom Action URL &amp; 0xDEV HTML Email Templates
                </h4>
                <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                  Paste the Action URL below into Firebase Console → Authentication → Templates so
                  client email links open right inside your branded <code>/auth-action</code> page.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'netlify-action',
                  label: 'Netlify Custom Action URL',
                  value: 'https://0x4dev.netlify.app/auth-action',
                },
                {
                  key: 'current-action',
                  label: 'Current Preview Action URL',
                  value: `${window.location.origin}/auth-action`,
                },
              ].map((urlItem) => (
                <div
                  key={urlItem.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                      {urlItem.label}
                    </p>
                    <p className="truncate font-mono text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                      {urlItem.value}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(urlItem.value);
                      setCopiedKey(urlItem.key);
                      window.setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464] dark:hover:border-[#7C8CFF]"
                  >
                    <Copy className="h-3 w-3 text-[#EE1119]" aria-hidden="true" />
                    <span>{copiedKey === urlItem.key ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex flex-wrap gap-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-1 border border-[#E5E7F0] dark:border-[#242C54]"
                role="tablist"
                aria-label="Preview branded HTML email templates"
              >
                {[
                  { id: 'verify' as const, label: 'Verification Email' },
                  { id: 'reset' as const, label: 'Password Reset' },
                  { id: 'update' as const, label: 'Client Update' },
                ].map((tpl) => {
                  const active = previewKind === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPreviewKind(tpl.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                          : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={async () => {
                  const html = buildBrandedEmailHtml({
                    kind: previewKind,
                    actionUrl: 'https://0x4dev.netlify.app/auth-action',
                  });
                  await navigator.clipboard.writeText(html);
                  setCopiedKey('html');
                  window.setTimeout(() => setCopiedKey(null), 2200);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
              >
                <Copy className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span>{copiedKey === 'html' ? 'HTML Copied!' : 'Copy Branded HTML Template'}</span>
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]">
              <iframe
                title="0xDEV Branded Email Template Preview"
                srcDoc={buildBrandedEmailHtml({
                  kind: previewKind,
                  actionUrl: 'https://0x4dev.netlify.app/auth-action',
                })}
                className="h-[440px] w-full border-0 bg-[#F6F7FB]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
