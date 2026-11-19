import { useEffect, useMemo, useState } from 'react';
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

export type { MovieCategory, MovieGenre, MovieItem, MovieQualityLabel, MovieSchema };

export function useMovies(includeDrafts = false) {
  const [firestoreMovies, setFirestoreMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const movies = useMemo<MovieItem[]>(() => {
    if (includeDrafts) {
      return firestoreMovies;
    }
    const firestoreIds = new Set(firestoreMovies.map((m) => m.movieId));
    const remainingBaseline = VERIFIED_ARCHIVE_MOVIES.filter(
      (baseline) => !firestoreIds.has(baseline.movieId)
    );
    return [...firestoreMovies, ...remainingBaseline];
  }, [firestoreMovies, includeDrafts]);

  return { movies, firestoreMovies, loading, error };
}
