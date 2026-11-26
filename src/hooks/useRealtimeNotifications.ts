import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { UPCOMING_BLOG_DISPATCHES } from '../data/blogData';
import { VERIFIED_ARCHIVE_MOVIES } from '../data/moviesData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { mapReferralDocToRecord, ReferralRecord } from '../utils/referralUtils';

export type BellCategory = 'project' | 'movie' | 'blog' | 'referral';

export interface RealtimeBellAlert {
  id: string;
  sourceKind: 'firestore_notification' | 'movie_catalog' | 'blog_post' | 'referral_payout';
  category: BellCategory;
  badgeLabel: string;
  title: string;
  summary: string;
  timestampMs: number;
  timestampLabel: string;
  isRead: boolean;
  route: 'dashboard' | 'movies' | 'blog';
  targetId?: string;
  firestoreNotificationId?: string;
}

interface RawFirestoreNotif {
  notificationId: string;
  type: 'status_update' | 'admin_message' | 'movie_release' | 'blog_upcoming';
  title: string;
  body: string;
  inquiryId?: string;
  linkRoute?: 'dashboard' | 'movies' | 'blog';
  targetId?: string;
  isRead: boolean;
  createdAtMs: number;
}

interface RawMovieAlert {
  movieId: string;
  title: string;
  releaseYear: string;
  qualityLabel: string;
  vjTranslator?: string;
  genre?: string;
  createdAtMs: number;
}

interface RawBlogAlert {
  postId: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishStatus: 'published' | 'upcoming';
  scheduledDate?: string;
  createdAtMs: number;
}

function formatAlertTime(ms: number): string {
  const diffMs = Date.now() - ms;
  if (diffMs >= 0 && diffMs < 60_000) return 'Just now';
  if (diffMs >= 0 && diffMs < 3_600_000) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    return `${mins}m ago`;
  }
  if (diffMs >= 0 && diffMs < 86_400_000) {
    const hrs = Math.max(1, Math.floor(diffMs / 3_600_000));
    return `${hrs}h ago`;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
}

export function useRealtimeNotifications() {
  const { user } = useAuth();

  const [firestoreNotifs, setFirestoreNotifs] = useState<RawFirestoreNotif[]>([]);
  const [recentMovies, setRecentMovies] = useState<RawMovieAlert[]>([]);
  const [blogAlerts, setBlogAlerts] = useState<RawBlogAlert[]>([]);
  const [pendingReferrals, setPendingReferrals] = useState<ReferralRecord[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hasStateDoc, setHasStateDoc] = useState(false);
  const [localReadIds, setLocalReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. User's /notifications stream (project updates, admin messages, custom broadcasts)
  useEffect(() => {
    if (!user) {
      setFirestoreNotifs([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: RawFirestoreNotif[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          const rawType = String(data.type || 'status_update');
          const type: RawFirestoreNotif['type'] =
            rawType === 'admin_message' ||
            rawType === 'movie_release' ||
            rawType === 'blog_upcoming'
              ? rawType
              : 'status_update';
          const linkRoute =
            data.linkRoute === 'movies' ||
            data.linkRoute === 'blog' ||
            data.linkRoute === 'dashboard'
              ? data.linkRoute
              : undefined;
          return {
            notificationId: String(data.notificationId || d.id),
            type,
            title: String(data.title || 'Project Update'),
            body: String(data.body || ''),
            inquiryId: data.inquiryId ? String(data.inquiryId) : undefined,
            linkRoute,
            targetId: data.targetId ? String(data.targetId) : undefined,
            isRead: Boolean(data.isRead),
            createdAtMs,
          };
        });
        setFirestoreNotifs(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Owner-only cross-device read state for movie/upcoming-blog catalog alerts
  useEffect(() => {
    if (!user) {
      setReadIds([]);
      setHasStateDoc(false);
      setLocalReadIds([]);
      return;
    }

    const stateRef = doc(db, 'users', user.uid, 'preferences', 'notificationState');
    const unsubscribe = onSnapshot(
      stateRef,
      (snap) => {
        if (!snap.exists()) {
          setReadIds([]);
          setHasStateDoc(false);
          return;
        }
        const data = snap.data();
        const ids = Array.isArray(data.readIds)
          ? data.readIds.filter((item): item is string => typeof item === 'string').slice(0, 200)
          : [];
        setReadIds(ids);
        setHasStateDoc(true);
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${user.uid}/preferences/notificationState`
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Real-time published /movies stream (alerts on newly uploaded movies)
  useEffect(() => {
    if (!user) {
      setRecentMovies([]);
      return;
    }

    const q = query(collection(db, 'movies'), where('published', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: RawMovieAlert[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
            return {
              movieId: String(data.movieId || d.id),
              title: String(data.title || 'New Film'),
              releaseYear: String(data.releaseYear || '2026'),
              qualityLabel: String(data.qualityLabel || '720p HD'),
              vjTranslator: data.vjTranslator ? String(data.vjTranslator) : undefined,
              genre: data.genre ? String(data.genre) : undefined,
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs)
          .slice(0, 6);
        setRecentMovies(rows);
      },
      (err) => {
        console.warn('Realtime movies bell listener fallback:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 4. Real-time /blogPosts stream (upcoming & recently published custom technical posts)
  useEffect(() => {
    if (!user) {
      setBlogAlerts([]);
      return;
    }

    const q = query(collection(db, 'blogPosts'), where('featured', 'in', [true, false]));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: RawBlogAlert[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
            return {
              postId: String(data.postId || d.id),
              slug: String(data.slug || d.id),
              title: String(data.title || 'Upcoming Engineering Dispatch'),
              excerpt: String(data.excerpt || ''),
              category: String(data.category || 'Architecture'),
              publishStatus: (data.publishStatus === 'upcoming' ? 'upcoming' : 'published') as
                | 'published'
                | 'upcoming',
              scheduledDate: data.scheduledDate ? String(data.scheduledDate) : undefined,
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs)
          .slice(0, 6);
        setBlogAlerts(rows);
      },
      (err) => {
        console.warn('Realtime blog bell listener fallback:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 5. Real-time /referrals stream for unclaimed referrer payout bonuses
  useEffect(() => {
    if (!user) {
      setPendingReferrals([]);
      return;
    }

    const q = query(collection(db, 'referrals'), where('referrerUid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => mapReferralDocToRecord(d.id, d.data() as Record<string, unknown>))
          .filter((r) => !r.referrerBonusClaimed)
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setPendingReferrals(list);
      },
      (err) => {
        console.warn('Realtime referral bell listener fallback:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const combinedReadSet = useMemo(
    () => new Set([...readIds, ...localReadIds]),
    [readIds, localReadIds]
  );

  const alerts = useMemo<RealtimeBellAlert[]>(() => {
    const list: RealtimeBellAlert[] = [];

    // Project updates & direct notifications from /notifications
    for (const n of firestoreNotifs) {
      const category: BellCategory =
        n.type === 'movie_release'
          ? 'movie'
          : n.type === 'blog_upcoming'
            ? 'blog'
            : 'project';
      const route: RealtimeBellAlert['route'] =
        n.linkRoute ||
        (category === 'movie' ? 'movies' : category === 'blog' ? 'blog' : 'dashboard');
      const badgeLabel =
        n.type === 'status_update'
          ? 'Project Update'
          : n.type === 'movie_release'
            ? 'New Movie'
            : n.type === 'blog_upcoming'
              ? 'Upcoming Post'
              : 'Studio Alert';
      list.push({
        id: `notif-${n.notificationId}`,
        sourceKind: 'firestore_notification',
        category,
        badgeLabel,
        title: n.title,
        summary: n.body,
        timestampMs: n.createdAtMs,
        timestampLabel: formatAlertTime(n.createdAtMs),
        isRead: n.isRead || combinedReadSet.has(`notif-${n.notificationId}`),
        route,
        targetId: n.targetId,
        firestoreNotificationId: n.notificationId,
      });
    }

    // Movie catalog live additions (fallback to top 3 verified featured movies if Firestore catalog hasn't been seeded yet)
    const moviePool: RawMovieAlert[] =
      recentMovies.length > 0
        ? recentMovies
        : VERIFIED_ARCHIVE_MOVIES.slice(0, 3).map((m) => ({
            movieId: m.movieId,
            title: m.title,
            releaseYear: m.releaseYear,
            qualityLabel: m.qualityLabel,
            vjTranslator: m.vjTranslator,
            genre: m.genre,
            createdAtMs: m.createdAtMs,
          }));

    for (const m of moviePool) {
      const id = `movie-${m.movieId}`;
      const details = [m.releaseYear, m.genre, m.qualityLabel, m.vjTranslator]
        .filter(Boolean)
        .join(' · ');
      list.push({
        id,
        sourceKind: 'movie_catalog',
        category: 'movie',
        badgeLabel: 'New Movie',
        title: `${m.title} Now Available`,
        summary: details
          ? `${details} — ready for instant streaming or offline download.`
          : 'Ready to stream or download in the 0xDEV movie theater.',
        timestampMs: m.createdAtMs,
        timestampLabel: formatAlertTime(m.createdAtMs),
        isRead: combinedReadSet.has(id),
        route: 'movies',
        targetId: m.movieId,
      });
    }

    // Blog posts: Firestore upcoming + recently published custom posts + curated upcoming dispatches
    const firestoreSlugs = new Set(blogAlerts.map((b) => b.slug));
    for (const b of blogAlerts) {
      const id = `blog-${b.postId}`;
      const isUpcoming = b.publishStatus === 'upcoming';
      list.push({
        id,
        sourceKind: 'blog_post',
        category: 'blog',
        badgeLabel: isUpcoming ? 'Upcoming Post' : 'New Article',
        title: b.title,
        summary:
          isUpcoming && b.scheduledDate
            ? `Scheduled (${b.scheduledDate}) — ${b.excerpt}`
            : b.excerpt,
        timestampMs: b.createdAtMs,
        timestampLabel: isUpcoming && b.scheduledDate ? b.scheduledDate : formatAlertTime(b.createdAtMs),
        isRead: combinedReadSet.has(id),
        route: 'blog',
        targetId: b.slug,
      });
    }

    const baseNow = Date.now() - 3_600_000;
    UPCOMING_BLOG_DISPATCHES.filter((d) => !firestoreSlugs.has(d.slug)).forEach((d, idx) => {
      const id = `blog-${d.id}`;
      list.push({
        id,
        sourceKind: 'blog_post',
        category: 'blog',
        badgeLabel: 'Upcoming Post',
        title: d.title,
        summary: d.scheduledDate ? `${d.scheduledDate} · ${d.excerpt}` : d.excerpt,
        timestampMs: baseNow - idx * 1_800_000,
        timestampLabel: d.scheduledDate || 'Upcoming',
        isRead: combinedReadSet.has(id),
        route: 'blog',
        targetId: d.slug,
      });
    });

    for (const r of pendingReferrals) {
      const id = `referral-${r.referralId}`;
      list.push({
        id,
        sourceKind: 'referral_payout',
        category: 'referral',
        badgeLabel: 'Referral Bonus',
        title: `Claim +${r.referrerBonusCredits} DevCredits from ${r.inviteeName}`,
        summary: `${r.inviteeName} joined with your referral code ${r.referralCode}. Open Dashboard to claim your +${r.referrerBonusCredits} DevCredits payout.`,
        timestampMs: r.createdAtMs,
        timestampLabel: formatAlertTime(r.createdAtMs),
        isRead: combinedReadSet.has(id),
        route: 'dashboard',
        targetId: 'referral-program',
      });
    }

    // Sort unread first, then newest first
    return list.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return b.timestampMs - a.timestampMs;
    });
  }, [firestoreNotifs, recentMovies, blogAlerts, pendingReferrals, combinedReadSet]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts]
  );

  const countsByCategory = useMemo(
    () => ({
      all: alerts.length,
      project: alerts.filter((a) => a.category === 'project').length,
      movie: alerts.filter((a) => a.category === 'movie').length,
      blog: alerts.filter((a) => a.category === 'blog').length,
      referral: alerts.filter((a) => a.category === 'referral').length,
    }),
    [alerts]
  );

  const persistFeedReadIds = useCallback(
    async (idsToAdd: string[]) => {
      if (!user || idsToAdd.length === 0) return;

      // Always reflect immediately in UI state
      setLocalReadIds((prev) => Array.from(new Set([...prev, ...idsToAdd])).slice(-200));

      if (!user.emailVerified) return;

      const merged = Array.from(new Set([...readIds, ...idsToAdd])).slice(-200);
      const path = `users/${user.uid}/preferences/notificationState`;
      const stateRef = doc(db, 'users', user.uid, 'preferences', 'notificationState');
      try {
        if (hasStateDoc) {
          await updateDoc(stateRef, {
            readIds: merged,
            lastCheckedMs: Date.now(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(stateRef, {
            uid: user.uid,
            readIds: merged,
            lastCheckedMs: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, hasStateDoc ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [user, readIds, hasStateDoc]
  );

  const markAlertRead = useCallback(
    async (alert: RealtimeBellAlert) => {
      if (!user || alert.isRead) return;

      if (alert.sourceKind === 'firestore_notification' && alert.firestoreNotificationId) {
        setLocalReadIds((prev) => Array.from(new Set([...prev, alert.id])).slice(-200));
        if (!user.emailVerified) return;
        const notifId = alert.firestoreNotificationId;
        try {
          await updateDoc(doc(db, 'notifications', notifId), {
            isRead: true,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
        }
        return;
      }

      await persistFeedReadIds([alert.id]);
    },
    [user, persistFeedReadIds]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = alerts.filter((a) => !a.isRead);
    if (unread.length === 0) return;

    const notifIds = unread
      .filter((a) => a.sourceKind === 'firestore_notification' && a.firestoreNotificationId)
      .map((a) => a.firestoreNotificationId as string);
    const feedIds = unread
      .filter((a) => a.sourceKind !== 'firestore_notification')
      .map((a) => a.id);

    setLocalReadIds((prev) =>
      Array.from(new Set([...prev, ...unread.map((a) => a.id)])).slice(-200)
    );

    if (!user.emailVerified) return;

    if (notifIds.length > 0) {
      try {
        const batch = writeBatch(db);
        notifIds.slice(0, 400).forEach((id) => {
          batch.update(doc(db, 'notifications', id), {
            isRead: true,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'notifications');
      }
    }

    if (feedIds.length > 0) {
      await persistFeedReadIds(feedIds);
    }
  }, [user, alerts, persistFeedReadIds]);

  return {
    alerts,
    unreadCount,
    countsByCategory,
    loading,
    markAlertRead,
    markAllRead,
  };
}
