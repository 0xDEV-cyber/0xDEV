import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import {
  MovieCategory,
  MovieGenre,
  MovieItem,
  MovieQualityLabel,
  MovieSchema,
  normalizeMovieRecord,
} from '../data/movieSchema';
import { VERIFIED_ARCHIVE_MOVIES } from '../data/moviesData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DiscoveredExternalMovie,
  discoverLatestExternalMovies,
  EXTERNAL_FEED_TTL_MS,
  getCachedExternalFeedSnapshot,
  mergeCatalogWithExternalMovies,
} from '../utils/externalMovieFeed';

export type { MovieCategory, MovieGenre, MovieItem, MovieQualityLabel, MovieSchema };

export const EXTERNAL_SOURCES_UPDATED_EVENT = '0xdev:external-sources-updated';

export function useMovies(includeDrafts = false, enableExternalAutoFeed = true) {
  const [firestoreMovies, setFirestoreMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialCache = useMemo(() => getCachedExternalFeedSnapshot(), []);
  const [externalMovies, setExternalMovies] = useState<DiscoveredExternalMovie[]>(
    () => initialCache?.movies || []
  );
  const [lastExternalSyncMs, setLastExternalSyncMs] = useState<number | null>(
    () => initialCache?.checkedAtMs || null
  );
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [externalSyncError, setExternalSyncError] = useState<string | null>(null);

  useEffect(() => {
    const moviesRef = collection(db, 'movies');
    const q = includeDrafts
      ? moviesRef
      : query(moviesRef, where('published', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: MovieItem[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

            return normalizeMovieRecord({
              movieId: String(data.movieId || d.id),
              title: typeof data.title === 'string' ? data.title : 'Untitled Film',
              category: data.category as MovieCategory | undefined,
              genre: typeof data.genre === 'string' ? data.genre : undefined,
              language: typeof data.language === 'string' ? data.language : undefined,
              vjTranslator: typeof data.vjTranslator === 'string' ? data.vjTranslator : undefined,
              releaseYear: typeof data.releaseYear === 'string' ? data.releaseYear : '2024',
              durationLabel: typeof data.durationLabel === 'string' ? data.durationLabel : '1h 30m',
              qualityLabel: data.qualityLabel as MovieQualityLabel | undefined,
              fileSizeLabel: typeof data.fileSizeLabel === 'string' ? data.fileSizeLabel : '350 MB',
              synopsis: typeof data.synopsis === 'string' ? data.synopsis : '',
              posterUrl: typeof data.posterUrl === 'string' ? data.posterUrl : undefined,
              coverArtUrl: typeof data.coverArtUrl === 'string' ? data.coverArtUrl : undefined,
              videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : undefined,
              downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : undefined,
              published: Boolean(data.published),
              createdAtMs,
            });
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);

        setFirestoreMovies(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (includeDrafts) {
          handleFirestoreError(err, OperationType.LIST, 'movies');
        } else {
          console.warn('Movies listener fallback active:', err.message);
          setError('Unable to sync movie catalog right now.');
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [includeDrafts]);

  const baseCatalog = useMemo<MovieItem[]>(() => {
    const firestoreIds = new Set(firestoreMovies.map((m) => m.movieId));
    const remainingBaseline = VERIFIED_ARCHIVE_MOVIES.filter(
      (baseline) => !firestoreIds.has(baseline.movieId)
    );
    return [...firestoreMovies, ...remainingBaseline];
  }, [firestoreMovies]);

  const baseCatalogRef = useRef<MovieItem[]>(baseCatalog);
  useEffect(() => {
    baseCatalogRef.current = baseCatalog;
  }, [baseCatalog]);

  const refreshExternalFeed = useCallback(
    async (forceRefresh = false) => {
      if (!enableExternalAutoFeed) return [];
      setSyncingExternal(true);
      setExternalSyncError(null);
      try {
        const result = await discoverLatestExternalMovies({
          forceRefresh,
          existingMovies: baseCatalogRef.current,
        });
        setExternalMovies(result.movies);
        setLastExternalSyncMs(result.checkedAtMs);
        if (result.sourceErrors.length > 0 && result.movies.length === 0) {
          setExternalSyncError(result.sourceErrors[0]);
        }
        return result.movies;
      } catch (err) {
        setExternalSyncError(
          err instanceof Error ? err.message : 'Unable to check external movie sites right now.'
        );
        return [];
      } finally {
        setSyncingExternal(false);
      }
    },
    [enableExternalAutoFeed]
  );

  // Automatic background polling + visibility resume + admin source updates
  useEffect(() => {
    if (!enableExternalAutoFeed) return;

    void refreshExternalFeed(false);

    const intervalId = window.setInterval(() => {
      void refreshExternalFeed(true);
    }, EXTERNAL_FEED_TTL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshExternalFeed(false);
      }
    };

    const handleSourceUpdate = () => {
      void refreshExternalFeed(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(EXTERNAL_SOURCES_UPDATED_EVENT, handleSourceUpdate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(EXTERNAL_SOURCES_UPDATED_EVENT, handleSourceUpdate);
    };
  }, [enableExternalAutoFeed, refreshExternalFeed]);

  const { merged: mergedPublicCatalog, externalIdSet } = useMemo(() => {
    if (includeDrafts || !enableExternalAutoFeed) {
      return { merged: baseCatalog, externalIdSet: new Set<string>() };
    }
    return mergeCatalogWithExternalMovies(baseCatalog, externalMovies);
  }, [baseCatalog, externalMovies, includeDrafts, enableExternalAutoFeed]);

  const movies = includeDrafts ? firestoreMovies : mergedPublicCatalog;

  return {
    movies,
    firestoreMovies,
    externalMovies,
    externalIdSet,
    loading,
    error,
    syncingExternal,
    lastExternalSyncMs,
    externalSyncError,
    refreshExternalFeed,
  };
}
