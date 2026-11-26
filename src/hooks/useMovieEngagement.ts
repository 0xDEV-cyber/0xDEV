import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
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
import { MovieItem } from '../data/movieSchema';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface WatchlistRecord {
  movieId: string;
  rawMovieId: string;
  userId: string;
  title: string;
  posterUrl: string;
  genre: string;
  releaseYear: string;
  vjTranslator: string;
  updatedAtMs: number;
}

export interface WatchProgressRecord {
  movieId: string;
  rawMovieId: string;
  userId: string;
  title: string;
  posterUrl: string;
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  completed: boolean;
  updatedAtMs: number;
}

export interface UserEngagementRecord {
  uid: string;
  streakDays: number;
  lastActiveDay: string;
  lastSeenCatalogMs: number;
  totalMoviesWatched: number;
}

export interface MovieRequestRecord {
  requestId: string;
  authorId: string;
  authorName: string;
  title: string;
  vjPreference: string;
  releaseYear: string;
  notes: string;
  status: 'open' | 'fulfilled';
  fulfilledMovieId: string;
  upvoteCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export function safeFirestoreKey(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
  return cleaned || 'movie_item';
}

function getLocalDayString(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatPlaybackTimestamp(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remSecs = secs % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }
  return `${mins}:${String(remSecs).padStart(2, '0')}`;
}

const STORAGE_WATCHLIST_PREFIX = '0xdev_watchlist_v1_';
const STORAGE_PROGRESS_PREFIX = '0xdev_progress_v1_';
const STORAGE_ENGAGEMENT_PREFIX = '0xdev_engagement_v1_';

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function useMovieEngagement() {
  const { user } = useAuth();
  const uid = user?.uid || 'guest';
  const isVerified = Boolean(user && user.emailVerified);

  const [watchlist, setWatchlist] = useState<WatchlistRecord[]>(() =>
    readJsonStorage<WatchlistRecord[]>(`${STORAGE_WATCHLIST_PREFIX}${uid}`, [])
  );
  const [watchProgress, setWatchProgress] = useState<WatchProgressRecord[]>(() =>
    readJsonStorage<WatchProgressRecord[]>(`${STORAGE_PROGRESS_PREFIX}${uid}`, [])
  );
  const [engagement, setEngagement] = useState<UserEngagementRecord>(() =>
    readJsonStorage<UserEngagementRecord>(`${STORAGE_ENGAGEMENT_PREFIX}${uid}`, {
      uid,
      streakDays: 1,
      lastActiveDay: getLocalDayString(0),
      lastSeenCatalogMs: Date.now() - 48 * 3600 * 1000,
      totalMoviesWatched: 0,
    })
  );

  // Baseline timestamp frozen at mount/user-load so "New Since Last Visit" remains visible during the visit
  const [sessionSeenBaselineMs, setSessionSeenBaselineMs] = useState<number>(() => {
    const cached = readJsonStorage<UserEngagementRecord | null>(
      `${STORAGE_ENGAGEMENT_PREFIX}${uid}`,
      null
    );
    return cached?.lastSeenCatalogMs ?? Date.now() - 48 * 3600 * 1000;
  });
  const baselineInitializedRef = useRef(false);

  const [movieRequests, setMovieRequests] = useState<MovieRequestRecord[]>([]);
  const [votedRequestIds, setVotedRequestIds] = useState<Set<string>>(new Set());
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [engagementFeedback, setEngagementFeedback] = useState<string | null>(null);

  const lastProgressFlushByMovieRef = useRef<Record<string, number>>({});
  const streakSyncedForUidRef = useRef<string | null>(null);

  // Re-hydrate local fallback whenever user changes
  useEffect(() => {
    baselineInitializedRef.current = false;
    streakSyncedForUidRef.current = null;
    const localWatchlist = readJsonStorage<WatchlistRecord[]>(
      `${STORAGE_WATCHLIST_PREFIX}${uid}`,
      []
    );
    const localProgress = readJsonStorage<WatchProgressRecord[]>(
      `${STORAGE_PROGRESS_PREFIX}${uid}`,
      []
    );
    const localEng = readJsonStorage<UserEngagementRecord>(`${STORAGE_ENGAGEMENT_PREFIX}${uid}`, {
      uid,
      streakDays: 1,
      lastActiveDay: getLocalDayString(0),
      lastSeenCatalogMs: Date.now() - 48 * 3600 * 1000,
      totalMoviesWatched: 0,
    });
    setWatchlist(localWatchlist);
    setWatchProgress(localProgress);
    setEngagement(localEng);
    setSessionSeenBaselineMs(localEng.lastSeenCatalogMs);
  }, [uid]);

  // Real-time Watchlist listener for verified users
  useEffect(() => {
    if (!user || !isVerified) return;

    const colRef = collection(db, 'users', user.uid, 'watchlist');
    const q = query(colRef, where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: WatchlistRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              movieId: String(data.movieId || d.id),
              rawMovieId: String(data.movieId || d.id),
              userId: String(data.userId || user.uid),
              title: String(data.title || 'Untitled Movie'),
              posterUrl: String(data.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg'),
              genre: String(data.genre || 'Action'),
              releaseYear: String(data.releaseYear || '2026'),
              vjTranslator: String(data.vjTranslator || 'Original Audio'),
              updatedAtMs:
                data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
            };
          })
          .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setWatchlist(items);
        writeJsonStorage(`${STORAGE_WATCHLIST_PREFIX}${user.uid}`, items);
      },
      (err) => {
        console.warn('Watchlist sync notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user, isVerified]);

  // Real-time WatchProgress listener for verified users
  useEffect(() => {
    if (!user || !isVerified) return;

    const colRef = collection(db, 'users', user.uid, 'watchProgress');
    const q = query(colRef, where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: WatchProgressRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              movieId: String(data.movieId || d.id),
              rawMovieId: String(data.movieId || d.id),
              userId: String(data.userId || user.uid),
              title: String(data.title || 'Untitled Movie'),
              posterUrl: String(data.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg'),
              positionSeconds: Number(data.positionSeconds) || 0,
              durationSeconds: Number(data.durationSeconds) || 0,
              progressPercent: Number(data.progressPercent) || 0,
              completed: Boolean(data.completed),
              updatedAtMs:
                data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
            };
          })
          .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setWatchProgress(items);
        writeJsonStorage(`${STORAGE_PROGRESS_PREFIX}${user.uid}`, items);
      },
      (err) => {
        console.warn('Watch progress sync notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user, isVerified]);

  // Real-time UserEngagement streak & daily check-in tracker
  useEffect(() => {
    const todayStr = getLocalDayString(0);
    const yesterdayStr = getLocalDayString(-1);

    if (!user || !isVerified) {
      if (streakSyncedForUidRef.current === uid) return;
      streakSyncedForUidRef.current = uid;
      setEngagement((prev) => {
        let nextStreak = prev.streakDays || 1;
        if (prev.lastActiveDay !== todayStr) {
          nextStreak = prev.lastActiveDay === yesterdayStr ? nextStreak + 1 : 1;
        }
        const updated: UserEngagementRecord = {
          uid,
          streakDays: Math.max(1, nextStreak),
          lastActiveDay: todayStr,
          lastSeenCatalogMs: prev.lastSeenCatalogMs || Date.now() - 48 * 3600 * 1000,
          totalMoviesWatched: prev.totalMoviesWatched || 0,
        };
        writeJsonStorage(`${STORAGE_ENGAGEMENT_PREFIX}${uid}`, updated);
        return updated;
      });
      return;
    }

    const engRef = doc(db, 'users', user.uid, 'preferences', 'engagement');
    const unsubscribe = onSnapshot(
      engRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          if (streakSyncedForUidRef.current === user.uid) return;
          streakSyncedForUidRef.current = user.uid;

          const defaultSeenMs = Date.now() - 48 * 3600 * 1000;
          if (!baselineInitializedRef.current) {
            baselineInitializedRef.current = true;
            setSessionSeenBaselineMs(defaultSeenMs);
          }

          void setDoc(engRef, {
            uid: user.uid,
            streakDays: 1,
            lastActiveDay: todayStr,
            lastSeenCatalogMs: defaultSeenMs,
            totalMoviesWatched: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            console.warn('Unable to initialize user streak:', err);
          });
          return;
        }

        const data = snapshot.data();
        const remoteStreak = Number(data.streakDays) || 1;
        const remoteLastDay = typeof data.lastActiveDay === 'string' ? data.lastActiveDay : todayStr;
        const remoteSeenMs =
          typeof data.lastSeenCatalogMs === 'number'
            ? data.lastSeenCatalogMs
            : Date.now() - 48 * 3600 * 1000;
        const remoteWatched = Number(data.totalMoviesWatched) || 0;

        if (!baselineInitializedRef.current) {
          baselineInitializedRef.current = true;
          setSessionSeenBaselineMs(remoteSeenMs);
        }

        const record: UserEngagementRecord = {
          uid: user.uid,
          streakDays: remoteStreak,
          lastActiveDay: remoteLastDay,
          lastSeenCatalogMs: remoteSeenMs,
          totalMoviesWatched: remoteWatched,
        };
        setEngagement(record);
        writeJsonStorage(`${STORAGE_ENGAGEMENT_PREFIX}${user.uid}`, record);

        // Advance daily visit streak once per day automatically
        if (remoteLastDay !== todayStr && streakSyncedForUidRef.current !== user.uid) {
          streakSyncedForUidRef.current = user.uid;
          const nextStreak = remoteLastDay === yesterdayStr ? remoteStreak + 1 : 1;
          void updateDoc(engRef, {
            streakDays: Math.max(1, nextStreak),
            lastActiveDay: todayStr,
            lastSeenCatalogMs: remoteSeenMs,
            totalMoviesWatched: remoteWatched,
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            console.warn('Unable to increment daily streak:', err);
          });
        } else {
          streakSyncedForUidRef.current = user.uid;
        }
      },
      (err) => {
        console.warn('Engagement listener notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user, isVerified, uid]);

  // Real-time Community Movie Requests & Current User Upvotes
  useEffect(() => {
    if (!user) {
      setMovieRequests([]);
      setVotedRequestIds(new Set());
      setRequestsLoading(false);
      return;
    }

    const reqQuery = query(
      collection(db, 'movieRequests'),
      where('status', 'in', ['open', 'fulfilled'])
    );
    const unsubReqs = onSnapshot(
      reqQuery,
      (snapshot) => {
        const items: MovieRequestRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              requestId: String(data.requestId || d.id),
              authorId: String(data.authorId || ''),
              authorName: String(data.authorName || 'Member'),
              title: String(data.title || 'Requested Film'),
              vjPreference: String(data.vjPreference || 'Any VJ / Luganda'),
              releaseYear: String(data.releaseYear || '2026'),
              notes: String(data.notes || ''),
              status: (data.status === 'fulfilled' ? 'fulfilled' : 'open') as 'open' | 'fulfilled',
              fulfilledMovieId: String(data.fulfilledMovieId || ''),
              upvoteCount: Number(data.upvoteCount) || 0,
              createdAtMs:
                data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
              updatedAtMs:
                data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
            };
          })
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
            if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
            return b.createdAtMs - a.createdAtMs;
          });
        setMovieRequests(items);
        setRequestsLoading(false);
      },
      (err) => {
        setRequestsLoading(false);
        console.warn('Movie requests listener notice:', err.message);
      }
    );

    const votesQuery = query(
      collection(db, 'movieRequestVotes'),
      where('userId', '==', user.uid)
    );
    const unsubVotes = onSnapshot(
      votesQuery,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (typeof data.requestId === 'string') {
            ids.add(data.requestId);
          }
        });
        setVotedRequestIds(ids);
      },
      (err) => {
        console.warn('Votes listener notice:', err.message);
      }
    );

    return () => {
      unsubReqs();
      unsubVotes();
    };
  }, [user]);

  const watchlistIdSet = useMemo(() => {
    const set = new Set<string>();
    watchlist.forEach((item) => {
      set.add(item.movieId);
      set.add(item.rawMovieId);
    });
    return set;
  }, [watchlist]);

  const progressByMovieId = useMemo(() => {
    const map = new Map<string, WatchProgressRecord>();
    watchProgress.forEach((item) => {
      map.set(item.movieId, item);
      if (item.rawMovieId) {
        map.set(item.rawMovieId, item);
      }
    });
    return map;
  }, [watchProgress]);

  const continueWatchingList = useMemo(
    () =>
      watchProgress
        .filter((item) => !item.completed && item.positionSeconds >= 5 && item.progressPercent < 92)
        .slice(0, 8),
    [watchProgress]
  );

  const isInWatchlist = useCallback(
    (movieId: string) => watchlistIdSet.has(movieId) || watchlistIdSet.has(safeFirestoreKey(movieId)),
    [watchlistIdSet]
  );

  const getProgressForMovie = useCallback(
    (movieId: string): WatchProgressRecord | undefined =>
      progressByMovieId.get(movieId) || progressByMovieId.get(safeFirestoreKey(movieId)),
    [progressByMovieId]
  );

  const toggleWatchlist = useCallback(
    async (movie: Pick<MovieItem, 'movieId' | 'title' | 'posterUrl' | 'coverArtUrl' | 'genre' | 'releaseYear' | 'vjTranslator'>) => {
      const safeId = safeFirestoreKey(movie.movieId);
      const alreadySaved = isInWatchlist(movie.movieId);
      const poster = (movie.coverArtUrl || movie.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg').slice(0, 500);

      // Update local state optimistically
      setWatchlist((prev) => {
        const next = alreadySaved
          ? prev.filter((w) => w.movieId !== safeId && w.rawMovieId !== movie.movieId)
          : [
              {
                movieId: safeId,
                rawMovieId: movie.movieId,
                userId: uid,
                title: movie.title.slice(0, 140),
                posterUrl: poster,
                genre: (movie.genre || 'Action').slice(0, 60),
                releaseYear: (movie.releaseYear || '2026').slice(0, 12),
                vjTranslator: (movie.vjTranslator || 'Original Audio').slice(0, 80),
                updatedAtMs: Date.now(),
              },
              ...prev.filter((w) => w.movieId !== safeId),
            ];
        writeJsonStorage(`${STORAGE_WATCHLIST_PREFIX}${uid}`, next);
        return next;
      });

      if (!user || !isVerified) return;

      const docRef = doc(db, 'users', user.uid, 'watchlist', safeId);
      const path = `users/${user.uid}/watchlist/${safeId}`;
      try {
        if (alreadySaved) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, {
            movieId: safeId,
            userId: user.uid,
            title: movie.title.trim().slice(0, 140) || 'Movie',
            posterUrl: poster,
            genre: (movie.genre || 'Action').trim().slice(0, 60),
            releaseYear: (movie.releaseYear || '2026').trim().slice(0, 12),
            vjTranslator: (movie.vjTranslator || 'Original Audio').trim().slice(0, 80),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [isInWatchlist, user, isVerified, uid]
  );

  const recordPlaybackProgress = useCallback(
    async (
      movie: Pick<MovieItem, 'movieId' | 'title' | 'posterUrl' | 'coverArtUrl'>,
      positionSecondsRaw: number,
      durationSecondsRaw: number,
      forceFlush = false
    ) => {
      if (!Number.isFinite(positionSecondsRaw) || !Number.isFinite(durationSecondsRaw) || durationSecondsRaw <= 10) {
        return;
      }

      const safeId = safeFirestoreKey(movie.movieId);
      const posSec = Math.min(86400, Math.max(0, Math.floor(positionSecondsRaw)));
      const durSec = Math.min(86400, Math.max(1, Math.floor(durationSecondsRaw)));
      const pct = Math.min(100, Math.max(0, Math.round((posSec / durSec) * 100)));
      const isNowCompleted = pct >= 90;
      const previousRecord = getProgressForMovie(movie.movieId);
      const wasCompleted = Boolean(previousRecord?.completed);
      const poster = (movie.coverArtUrl || movie.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg').slice(0, 500);

      // Update local state immediately for seamless resume
      setWatchProgress((prev) => {
        const filtered = prev.filter((p) => p.movieId !== safeId && p.rawMovieId !== movie.movieId);
        const updated: WatchProgressRecord = {
          movieId: safeId,
          rawMovieId: movie.movieId,
          userId: uid,
          title: movie.title.slice(0, 140),
          posterUrl: poster,
          positionSeconds: posSec,
          durationSeconds: durSec,
          progressPercent: pct,
          completed: wasCompleted || isNowCompleted,
          updatedAtMs: Date.now(),
        };
        const next = [updated, ...filtered];
        writeJsonStorage(`${STORAGE_PROGRESS_PREFIX}${uid}`, next);
        return next;
      });

      const now = Date.now();
      const lastFlush = lastProgressFlushByMovieRef.current[safeId] || 0;
      const flippedComplete = isNowCompleted && !wasCompleted;
      if (!forceFlush && !flippedComplete && now - lastFlush < 6000) {
        return;
      }
      lastProgressFlushByMovieRef.current[safeId] = now;

      if (!user || !isVerified) {
        if (flippedComplete) {
          setEngagement((prev) => {
            const next = { ...prev, totalMoviesWatched: (prev.totalMoviesWatched || 0) + 1 };
            writeJsonStorage(`${STORAGE_ENGAGEMENT_PREFIX}${uid}`, next);
            return next;
          });
        }
        return;
      }

      const progRef = doc(db, 'users', user.uid, 'watchProgress', safeId);
      const payload = {
        movieId: safeId,
        userId: user.uid,
        title: movie.title.trim().slice(0, 140) || 'Movie',
        posterUrl: poster,
        positionSeconds: posSec,
        durationSeconds: durSec,
        progressPercent: pct,
        completed: wasCompleted || isNowCompleted,
        updatedAt: serverTimestamp(),
      };

      try {
        if (!previousRecord) {
          await setDoc(progRef, {
            ...payload,
            createdAt: serverTimestamp(),
          });
        } else {
          await updateDoc(progRef, payload);
        }

        if (flippedComplete) {
          const engRef = doc(db, 'users', user.uid, 'preferences', 'engagement');
          const nextWatchedCount = Math.min(100000, (engagement.totalMoviesWatched || 0) + 1);
          await setDoc(
            engRef,
            {
              uid: user.uid,
              streakDays: Math.max(1, engagement.streakDays || 1),
              lastActiveDay: engagement.lastActiveDay || getLocalDayString(0),
              lastSeenCatalogMs: engagement.lastSeenCatalogMs || Date.now(),
              totalMoviesWatched: nextWatchedCount,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch(() => undefined);
        }
      } catch (err) {
        console.warn('Watch progress cloud save notice:', err);
      }
    },
    [uid, user, isVerified, getProgressForMovie, engagement]
  );

  const clearWatchProgress = useCallback(
    async (movieId: string) => {
      const safeId = safeFirestoreKey(movieId);
      setWatchProgress((prev) => {
        const next = prev.filter((p) => p.movieId !== safeId && p.rawMovieId !== movieId);
        writeJsonStorage(`${STORAGE_PROGRESS_PREFIX}${uid}`, next);
        return next;
      });
      if (!user || !isVerified) return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'watchProgress', safeId));
      } catch {
        // Ignore if doc wasn't saved remotely yet
      }
    },
    [uid, user, isVerified]
  );

  const markCatalogSeenNow = useCallback(
    async (latestMovieCreatedMs?: number) => {
      const seenMs = Math.max(Date.now(), latestMovieCreatedMs || 0);
      setSessionSeenBaselineMs(seenMs);
      setEngagement((prev) => {
        const next = { ...prev, lastSeenCatalogMs: seenMs };
        writeJsonStorage(`${STORAGE_ENGAGEMENT_PREFIX}${uid}`, next);
        return next;
      });

      if (!user || !isVerified) return;
      const engRef = doc(db, 'users', user.uid, 'preferences', 'engagement');
      try {
        await updateDoc(engRef, {
          streakDays: Math.max(1, engagement.streakDays || 1),
          lastActiveDay: engagement.lastActiveDay || getLocalDayString(0),
          lastSeenCatalogMs: seenMs,
          totalMoviesWatched: Math.max(0, engagement.totalMoviesWatched || 0),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Doc may not exist yet; create safely
        await setDoc(engRef, {
          uid: user.uid,
          streakDays: Math.max(1, engagement.streakDays || 1),
          lastActiveDay: engagement.lastActiveDay || getLocalDayString(0),
          lastSeenCatalogMs: seenMs,
          totalMoviesWatched: Math.max(0, engagement.totalMoviesWatched || 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => undefined);
      }
    },
    [uid, user, isVerified, engagement]
  );

  const submitMovieRequest = useCallback(
    async (input: {
      title: string;
      vjPreference: string;
      releaseYear?: string;
      notes?: string;
    }): Promise<{ ok: boolean; message: string }> => {
      if (!user || !user.emailVerified) {
        return {
          ok: false,
          message: 'Please sign in with a verified email address to post a movie request.',
        };
      }

      const cleanTitle = input.title.trim().slice(0, 140);
      if (cleanTitle.length < 2) {
        return { ok: false, message: 'Enter at least 2 characters for the requested movie title.' };
      }

      const cleanVj = (input.vjPreference || 'Any Luganda VJ').trim().slice(0, 80);
      const cleanYear = (input.releaseYear || '2026').trim().slice(0, 12);
      const cleanNotes = (input.notes || '').trim().slice(0, 300);
      const authorName = (user.displayName || user.email?.split('@')[0] || 'Member')
        .trim()
        .slice(0, 100);

      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const voteId = `${requestId}_${user.uid}`;

      try {
        const batch = writeBatch(db);
        const reqRef = doc(db, 'movieRequests', requestId);
        const voteRef = doc(db, 'movieRequestVotes', voteId);

        batch.set(reqRef, {
          requestId,
          authorId: user.uid,
          authorName,
          title: cleanTitle,
          vjPreference: cleanVj,
          releaseYear: cleanYear,
          notes: cleanNotes,
          status: 'open',
          fulfilledMovieId: '',
          upvoteCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(voteRef, {
          voteId,
          requestId,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        setEngagementFeedback(`Requested "${cleanTitle}" — others can now upvote it.`);
        return { ok: true, message: `Submitted "${cleanTitle}" to the community request board.` };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `movieRequests/${requestId}`);
      }
    },
    [user]
  );

  const toggleRequestUpvote = useCallback(
    async (request: MovieRequestRecord): Promise<void> => {
      if (!user || !user.emailVerified) {
        setEngagementFeedback('Verify your email to vote on requested movies.');
        return;
      }

      const hasVoted = votedRequestIds.has(request.requestId);
      const voteId = `${request.requestId}_${user.uid}`;
      const reqRef = doc(db, 'movieRequests', request.requestId);
      const voteRef = doc(db, 'movieRequestVotes', voteId);

      try {
        const batch = writeBatch(db);
        if (hasVoted) {
          batch.delete(voteRef);
          batch.update(reqRef, {
            upvoteCount: Math.max(0, request.upvoteCount - 1),
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(voteRef, {
            voteId,
            requestId: request.requestId,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.update(reqRef, {
            upvoteCount: request.upvoteCount + 1,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `movieRequests/${request.requestId}`);
      }
    },
    [user, votedRequestIds]
  );

  const deleteMovieRequest = useCallback(
    async (requestId: string) => {
      if (!user || !user.emailVerified) return;
      try {
        await deleteDoc(doc(db, 'movieRequests', requestId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `movieRequests/${requestId}`);
      }
    },
    [user]
  );

  const fulfillMovieRequest = useCallback(
    async (requestId: string, fulfilledMovieId = '', notes = '') => {
      if (!user || !user.emailVerified) return;
      try {
        await updateDoc(doc(db, 'movieRequests', requestId), {
          status: 'fulfilled',
          fulfilledMovieId: fulfilledMovieId.trim().slice(0, 128),
          notes: notes.trim().slice(0, 300),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `movieRequests/${requestId}`);
      }
    },
    [user]
  );

  const completedMovieIds = useMemo(() => {
    const set = new Set<string>();
    watchProgress.forEach((p) => {
      if (p.completed) {
        set.add(p.movieId);
        set.add(p.rawMovieId);
      }
    });
    return set;
  }, [watchProgress]);

  return {
    watchlist,
    watchlistIdSet,
    isInWatchlist,
    toggleWatchlist,
    watchProgress,
    continueWatchingList,
    completedMovieIds,
    getProgressForMovie,
    recordPlaybackProgress,
    clearWatchProgress,
    engagement,
    sessionSeenBaselineMs,
    markCatalogSeenNow,
    movieRequests,
    votedRequestIds,
    requestsLoading,
    submitMovieRequest,
    toggleRequestUpvote,
    deleteMovieRequest,
    fulfillMovieRequest,
    engagementFeedback,
    setEngagementFeedback,
  };
}
