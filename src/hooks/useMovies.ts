import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { VERIFIED_ARCHIVE_MOVIES } from '../data/moviesData';
import { db, handleFirestoreError, OperationType } from '../firebase';

export type MovieCategory =
  | 'Open Classics'
  | 'Indie & Regional'
  | 'Tech Documentaries'
  | 'Short Films';

export type MovieQualityLabel = '480p Lite' | '720p HD' | '1080p Full HD';

export interface MovieItem {
  movieId: string;
  title: string;
  category: MovieCategory;
  releaseYear: string;
  durationLabel: string;
  qualityLabel: MovieQualityLabel;
  fileSizeLabel: string;
  synopsis: string;
  posterUrl: string;
  videoUrl: string;
  published: boolean;
  createdAtMs: number;
}

const VALID_CATEGORIES: MovieCategory[] = [
  'Open Classics',
  'Indie & Regional',
  'Tech Documentaries',
  'Short Films',
];

const VALID_QUALITIES: MovieQualityLabel[] = ['480p Lite', '720p HD', '1080p Full HD'];

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
            const rawCat = String(data.category || 'Open Classics') as MovieCategory;
            const category = VALID_CATEGORIES.includes(rawCat) ? rawCat : 'Open Classics';
            const rawQuality = String(data.qualityLabel || '720p HD') as MovieQualityLabel;
            const qualityLabel = VALID_QUALITIES.includes(rawQuality) ? rawQuality : '720p HD';
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

            return {
              movieId: String(data.movieId || d.id),
              title: String(data.title || 'Untitled Film'),
              category,
              releaseYear: String(data.releaseYear || '2026'),
              durationLabel: String(data.durationLabel || '1h 30m'),
              qualityLabel,
              fileSizeLabel: String(data.fileSizeLabel || '500 MB'),
              synopsis: String(data.synopsis || ''),
              posterUrl: String(
                data.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg'
              ),
              videoUrl: String(data.videoUrl || ''),
              published: Boolean(data.published),
              createdAtMs,
            };
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
