import { useEffect, useRef } from 'react';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  AutoFirestoreSyncResult,
  discoverLatestExternalMovies,
  getAutoSyncSettings,
  syncDiscoveredMoviesToFirestore,
} from '../utils/externalMovieFeed';
import { isRealMovieTitle } from '../utils/internetArchiveApi';
import { EXTERNAL_SOURCES_UPDATED_EVENT, useMovies } from './useMovies';

export const AUTO_SYNC_RESULT_EVENT = '0xdev:auto-sync-completed';
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;

export function useAdminAutoMovieSync() {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';

  const { firestoreMovies, loading } = useMovies(isPrimaryAdmin, false);
  const firestoreMoviesRef = useRef(firestoreMovies);
  const syncingRef = useRef(false);

  useEffect(() => {
    firestoreMoviesRef.current = firestoreMovies;
  }, [firestoreMovies]);

  useEffect(() => {
    if (!isPrimaryAdmin || !user || loading) return;

    const runBackgroundSync = async (forceRefresh = false) => {
      if (syncingRef.current) return;
      const settings = getAutoSyncSettings();
      if (!settings.autoSyncToFirestore) return;

      syncingRef.current = true;
      try {
        // Purge any legacy auto-synced EXT-* items that lack a real movie title
        const staleInvalidDocs = firestoreMoviesRef.current.filter(
          (m) => m.movieId.startsWith('EXT-') && !isRealMovieTitle(m.title, m.movieId)
        );
        if (staleInvalidDocs.length > 0) {
          const cleanupBatch = writeBatch(db);
          staleInvalidDocs.slice(0, 100).forEach((bad) => {
            cleanupBatch.delete(doc(db, 'movies', bad.movieId));
          });
          await cleanupBatch.commit();
        }

        const discovery = await discoverLatestExternalMovies({
          forceRefresh,
          existingMovies: firestoreMoviesRef.current,
        });
        if (discovery.movies.length === 0) return;

        let activeSubscribers: Array<{
          subscriberUid: string;
          email: string;
          subscriberName: string;
        }> = [];

        if (settings.autoNotifySubscribers) {
          try {
            const subsSnap = await getDocs(collection(db, 'movieSubscribers'));
            activeSubscribers = subsSnap.docs
              .map((d) => {
                const data = d.data();
                return {
                  subscriberUid: String(data.subscriberUid || d.id),
                  email: String(data.email || ''),
                  subscriberName: String(data.subscriberName || 'Movie Subscriber'),
                  active: Boolean(data.active),
                };
              })
              .filter((s) => s.active && s.email);
          } catch {
            activeSubscribers = [];
          }
        }

        const result: AutoFirestoreSyncResult = await syncDiscoveredMoviesToFirestore({
          discoveredMovies: discovery.movies,
          existingFirestoreMovies: firestoreMoviesRef.current,
          adminUser: user,
          activeSubscribers,
          notifySubscribers: settings.autoNotifySubscribers,
        });

        window.dispatchEvent(new CustomEvent(AUTO_SYNC_RESULT_EVENT, { detail: result }));
      } catch (err) {
        console.warn('Admin auto-sync background check skipped:', err);
      } finally {
        syncingRef.current = false;
      }
    };

    // Delay slightly on initial load to avoid competing with critical startup listeners
    const initialTimer = window.setTimeout(() => {
      void runBackgroundSync(false);
    }, 3500);

    const intervalId = window.setInterval(() => {
      void runBackgroundSync(true);
    }, AUTO_SYNC_INTERVAL_MS);

    const onSourcesUpdated = () => {
      void runBackgroundSync(true);
    };

    window.addEventListener(EXTERNAL_SOURCES_UPDATED_EVENT, onSourcesUpdated);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
      window.removeEventListener(EXTERNAL_SOURCES_UPDATED_EVENT, onSourcesUpdated);
    };
  }, [isPrimaryAdmin, user, loading]);
}
