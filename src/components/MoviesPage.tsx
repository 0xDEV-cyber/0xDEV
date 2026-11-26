import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Download,
  Eye,
  Film,
  Flame,
  HardDrive,
  History,
  Languages,
  Laptop,
  MessageSquarePlus,
  Play,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Shuffle,
  Smartphone,
  Sparkles,
  Square,
  Subtitles,
  Tag,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageRoute } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MovieCategory, MovieItem, useMovies } from '../hooks/useMovies';
import {
  formatPlaybackTimestamp,
  safeFirestoreKey,
  useMovieEngagement,
} from '../hooks/useMovieEngagement';
import {
  DownloadProgressInfo,
  estimateBrowserStorageQuota,
  formatBytes,
  getSavedMovieBlobUrl,
  getSavedMovies,
  isOfflineStorageSupported,
  OfflineStorageCorsError,
  removeSavedMovie,
  SavedOfflineMovieMeta,
  saveMovieToLocalStorage,
} from '../utils/offlineMovieStorage';
import {
  EASE_OUT_EXPO,
  InteractiveCard,
  Reveal,
  SPRING_SNAPPY,
} from './MotionPrimitives';
import { MovieScenePreviewVideo } from './MovieScenePreview';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface MoviesPageProps {
  selectedMovieId?: string | null;
  onSelectMovie?: (movieId: string | null) => void;
  onNavigate: (page: PageRoute) => void;
  onRequestAuth?: () => void;
}

type LibraryViewTab = 'catalog' | 'watchlist' | 'requests' | 'offline' | 'roadmap';
type LanguageFilterScope = 'all' | 'luganda' | 'english';
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
    bestFor: 'Mobile data connections and fast offline saving into browser storage.',
    audio: 'AAC Stereo · 128 kbps',
    subtitles: 'Embedded WebVTT (EN / SW)',
    checksum: 'SHA-256 Verified Packages',
  },
  {
    id: '720p',
    label: '720p HD',
    sizeRange: '620 – 890 MB',
    codec: 'H.265 / MP4 Stream-Ready',
    bestFor: 'Crisp tablet and laptop playback with balanced local storage footprints.',
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
    highlights: ['Zero paywall or subscription fee', 'Direct resumable HTTP downloads'],
    icon: Film,
  },
  {
    id: 'indie-regional',
    number: '02',
    title: 'Independent & Regional Films',
    meta: 'Creator-Licensed · East Africa & Global',
    summary:
      'Festival shorts, independent features, and community stories licensed directly from filmmakers for free viewing and sharing.',
    highlights: ['Creator attribution & project notes', 'Offline browser vault support'],
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
    title: 'Local Storage Offline Vault',
    meta: 'IndexedDB Cache · Watch Anywhere',
    summary:
      'Save movies directly inside your browser local storage so you can play them smoothly on flights, commutes, or metered connections.',
    highlights: ['Persistent in-browser playback', 'One-click file export or cleanup'],
    icon: Download,
  },
];

interface ActivePlayerState {
  movieId: string;
  title: string;
  meta: string;
  synopsis: string;
  posterUrl: string;
  srcUrl: string;
  isOfflineBlob: boolean;
  isObjectUrl: boolean;
  initialSeekSeconds?: number;
}

type DisplayMovie = Pick<
  MovieItem,
  | 'movieId'
  | 'title'
  | 'category'
  | 'genre'
  | 'language'
  | 'vjTranslator'
  | 'releaseYear'
  | 'durationLabel'
  | 'qualityLabel'
  | 'fileSizeLabel'
  | 'synopsis'
  | 'posterUrl'
  | 'coverArtUrl'
  | 'videoUrl'
  | 'downloadUrl'
>;

export const MoviesPage: React.FC<MoviesPageProps> = ({
  selectedMovieId = null,
  onSelectMovie,
  onNavigate,
  onRequestAuth,
}) => {
  const { user } = useAuth();
  const {
    movies,
    externalIdSet,
    loading: moviesLoading,
    syncingExternal,
    lastExternalSyncMs,
    refreshExternalFeed,
  } = useMovies(false);

  const {
    watchlist,
    isInWatchlist,
    toggleWatchlist,
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
    engagementFeedback,
    setEngagementFeedback,
  } = useMovieEngagement();

  const [activeTab, setActiveTab] = useState<LibraryViewTab>('catalog');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilterScope>('all');
  const [releaseFilter, setReleaseFilter] = useState<'all' | '2026' | 'latest' | 'new'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<QualityTierId>('720p');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [tonightPickOffset, setTonightPickOffset] = useState(0);

  // Request board form state
  const [reqTitle, setReqTitle] = useState('');
  const [reqVj, setReqVj] = useState('VJ Junior (Luganda)');
  const [reqYear, setReqYear] = useState('2026');
  const [reqNotes, setReqNotes] = useState('');
  const [reqBusy, setReqBusy] = useState(false);
  const [reqNotice, setReqNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Offline local IndexedDB state
  const [savedMovies, setSavedMovies] = useState<SavedOfflineMovieMeta[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgressInfo>>({});
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<{
    usageBytes: number;
    quotaBytes: number;
  } | null>(null);

  // Theater modal state + detail inline player state
  const [activePlayer, setActivePlayer] = useState<ActivePlayerState | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalSeekAppliedRef = useRef<string | null>(null);
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const inlineSeekAppliedRef = useRef<string | null>(null);
  const [inlinePlayer, setInlinePlayer] = useState<{
    movieId: string;
    srcUrl: string;
    isOfflineBlob: boolean;
    isObjectUrl: boolean;
    isPreviewMode?: boolean;
    initialSeekSeconds?: number;
  } | null>(null);
  const [inlinePlayerError, setInlinePlayerError] = useState<string | null>(null);
  const [detailPreviewRemaining, setDetailPreviewRemaining] = useState<number>(30);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Interactive Movie Previews state (spotlight reel + per-card clip previews)
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightPlaying, setSpotlightPlaying] = useState(false);
  const [spotlightMuted, setSpotlightMuted] = useState(false);
  const [spotlightRemaining, setSpotlightRemaining] = useState(30);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);

  const [previewingCardId, setPreviewingCardId] = useState<string | null>(null);
  const [cardPreviewMuted, setCardPreviewMuted] = useState(true);
  const [cardPreviewRemaining, setCardPreviewRemaining] = useState(30);
  const [previewFailedIds, setPreviewFailedIds] = useState<Record<string, boolean>>({});

  // Verified Firestore subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subExists, setSubExists] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);

  const refreshSavedMovies = async () => {
    try {
      const items = await getSavedMovies();
      setSavedMovies(items);
      const quota = await estimateBrowserStorageQuota();
      setStorageQuota(quota);
    } catch {
      // Ignore if IndexedDB blocked in private mode
    }
  };

  useEffect(() => {
    void refreshSavedMovies();
  }, []);

  // Cleanup inline Blob object URL whenever selectedMovieId changes or unmounts
  useEffect(() => {
    return () => {
      if (inlinePlayer?.isObjectUrl) {
        URL.revokeObjectURL(inlinePlayer.srcUrl);
      }
    };
  }, [inlinePlayer]);

  useEffect(() => {
    setInlinePlayer(null);
    setInlinePlayerError(null);
    setSpotlightPlaying(false);
    setPreviewingCardId(null);
  }, [selectedMovieId]);

  useEffect(() => {
    if (!user) {
      setIsSubscribed(false);
      setSubExists(false);
      return;
    }

    const subPath = `movieSubscribers/${user.uid}`;
    const unsubscribe = onSnapshot(
      doc(db, 'movieSubscribers', user.uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setSubExists(false);
          setIsSubscribed(false);
          return;
        }
        const data = snapshot.data();
        setSubExists(true);
        setIsSubscribed(Boolean(data.active));
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, subPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!justSubscribed) return;
    const timer = window.setTimeout(() => setJustSubscribed(false), 4500);
    return () => window.clearTimeout(timer);
  }, [justSubscribed]);

  // Automatically revoke theater modal Blob ObjectURL when switching or unmounting
  useEffect(() => {
    return () => {
      if (activePlayer?.isObjectUrl) {
        URL.revokeObjectURL(activePlayer.srcUrl);
      }
    };
  }, [activePlayer]);

  useEffect(() => {
    if (!activePlayer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePlayer(null);
        setPlayerError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePlayer]);

  const closePlayer = () => {
    setActivePlayer(null);
    setPlayerError(null);
  };

  const savedById = useMemo(() => {
    const map = new Map<string, SavedOfflineMovieMeta>();
    savedMovies.forEach((item) => map.set(item.movieId, item));
    return map;
  }, [savedMovies]);

  const totalLocalBytes = useMemo(
    () => savedMovies.reduce((sum, item) => sum + item.sizeBytes, 0),
    [savedMovies]
  );

  const lugandaCount = useMemo(
    () => movies.filter((m) => m.language.toLowerCase().includes('luganda')).length,
    [movies]
  );

  const englishCount = useMemo(
    () => movies.filter((m) => !m.language.toLowerCase().includes('luganda')).length,
    [movies]
  );

  const release2026Count = useMemo(
    () => movies.filter((m) => m.releaseYear.includes('2026')).length,
    [movies]
  );

  const releaseLatestCount = useMemo(
    () =>
      movies.filter(
        (m) => m.releaseYear.includes('2026') || m.releaseYear.includes('2025')
      ).length,
    [movies]
  );

  const newSinceLastVisitMovies = useMemo(
    () => movies.filter((m) => m.createdAtMs > sessionSeenBaselineMs),
    [movies, sessionSeenBaselineMs]
  );

  const latestCatalogCreatedMs = useMemo(
    () => movies.reduce((maxMs, m) => Math.max(maxMs, m.createdAtMs || 0), 0),
    [movies]
  );

  // Daily deterministic spotlight pick prioritizing unwatched 2026 / Luganda releases
  const tonightPickPool = useMemo(() => {
    const unwatched = movies.filter(
      (m) => !completedMovieIds.has(m.movieId) && !completedMovieIds.has(safeFirestoreKey(m.movieId))
    );
    const pool = unwatched.length > 0 ? unwatched : movies;
    const priority = pool.filter(
      (m) => m.releaseYear.includes('2026') || m.language.toLowerCase().includes('luganda')
    );
    return priority.length > 0 ? priority : pool;
  }, [movies, completedMovieIds]);

  const tonightsPick = useMemo(() => {
    if (tonightPickPool.length === 0) return null;
    const daySeed = Math.floor(Date.now() / 86400000);
    const idx = (daySeed + tonightPickOffset) % tonightPickPool.length;
    return tonightPickPool[idx] || tonightPickPool[0];
  }, [tonightPickPool, tonightPickOffset]);

  const watchlistedCatalogMovies = useMemo(() => {
    const byId = new Map(movies.map((m) => [safeFirestoreKey(m.movieId), m]));
    return watchlist
      .map((item) => {
        const match = byId.get(item.movieId) || byId.get(safeFirestoreKey(item.rawMovieId));
        if (match) return match;
        return null;
      })
      .filter((m): m is MovieItem => Boolean(m));
  }, [movies, watchlist]);

  const upNextForActivePlayer = useMemo(() => {
    if (!activePlayer) return [];
    const currentMovie = movies.find((m) => m.movieId === activePlayer.movieId);
    const others = movies.filter((m) => m.movieId !== activePlayer.movieId);
    const sameGenre = currentMovie
      ? others.filter((m) => m.genre === currentMovie.genre)
      : [];
    const remaining = currentMovie
      ? others.filter((m) => m.genre !== currentMovie.genre)
      : others;
    return [...sameGenre, ...remaining].slice(0, 3);
  }, [activePlayer, movies]);

  const languageScopedMovies = useMemo(() => {
    let list = movies;
    if (languageFilter === 'luganda') {
      list = list.filter((m) => m.language.toLowerCase().includes('luganda'));
    } else if (languageFilter === 'english') {
      list = list.filter((m) => !m.language.toLowerCase().includes('luganda'));
    }
    if (releaseFilter === '2026') {
      list = list.filter((m) => m.releaseYear.includes('2026'));
    } else if (releaseFilter === 'latest') {
      list = list.filter(
        (m) => m.releaseYear.includes('2026') || m.releaseYear.includes('2025')
      );
    } else if (releaseFilter === 'new') {
      list = list.filter((m) => m.createdAtMs > sessionSeenBaselineMs);
    }
    return list;
  }, [movies, languageFilter, releaseFilter, sessionSeenBaselineMs]);

  const availableGenres = useMemo(() => {
    const genreCounts = new Map<string, number>();
    languageScopedMovies.forEach((m) => {
      const g = m.genre || 'Action';
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    });
    const sorted = Array.from(genreCounts.keys()).sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted];
  }, [languageScopedMovies]);

  const effectiveGenre = availableGenres.includes(selectedGenre) ? selectedGenre : 'All';

  const filteredMovies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return languageScopedMovies.filter((m) => {
      if (effectiveGenre !== 'All' && m.genre !== effectiveGenre) {
        return false;
      }
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q) ||
        m.vjTranslator.toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q) ||
        m.releaseYear.toLowerCase().includes(q) ||
        m.synopsis.toLowerCase().includes(q)
      );
    });
  }, [languageScopedMovies, effectiveGenre, searchQuery]);

  // Resolve active movie detail from live catalog or offline IndexedDB cache
  const selectedMovie: DisplayMovie | null = useMemo(() => {
    if (!selectedMovieId) return null;
    const fromCatalog = movies.find((m) => m.movieId === selectedMovieId);
    if (fromCatalog) return fromCatalog;
    const fromOffline = savedById.get(selectedMovieId);
    if (fromOffline) {
      return {
        movieId: fromOffline.movieId,
        title: fromOffline.title,
        category: (fromOffline.category as MovieCategory) || 'Indie & Regional',
        genre: fromOffline.genre || 'Action',
        language: fromOffline.language || 'Luganda Translated',
        vjTranslator: fromOffline.vjTranslator || 'Offline Archive',
        releaseYear: fromOffline.releaseYear,
        durationLabel: fromOffline.durationLabel,
        qualityLabel: (fromOffline.qualityLabel as MovieItem['qualityLabel']) || '480p Lite',
        fileSizeLabel: fromOffline.fileSizeLabel,
        synopsis: fromOffline.synopsis,
        posterUrl: fromOffline.posterUrl,
        coverArtUrl: fromOffline.coverArtUrl || fromOffline.posterUrl,
        videoUrl: fromOffline.videoUrl,
        downloadUrl: fromOffline.downloadUrl || fromOffline.videoUrl,
      };
    }
    return null;
  }, [selectedMovieId, movies, savedById]);

  const relatedMovies = useMemo(() => {
    if (!selectedMovie) return [];
    const sameGenre = movies.filter(
      (m) => m.movieId !== selectedMovie.movieId && m.genre === selectedMovie.genre
    );
    const others = movies.filter(
      (m) => m.movieId !== selectedMovie.movieId && m.genre !== selectedMovie.genre
    );
    return [...sameGenre, ...others].slice(0, 3);
  }, [movies, selectedMovie]);

  useEffect(() => {
    if (selectedMovie) {
      document.title = `${selectedMovie.title} | 0xDEV Movies`;
    } else if (!selectedMovieId) {
      document.title = 'Movies & Free Offline Downloads | 0xDEV';
    }
  }, [selectedMovie, selectedMovieId]);

  const previewPool = useMemo(() => {
    const sourceList = filteredMovies.length > 0 ? filteredMovies : movies;
    return sourceList.slice(0, 6);
  }, [filteredMovies, movies]);

  const activeSpotlightMovie =
    previewPool[spotlightIndex % Math.max(1, previewPool.length)] || previewPool[0] || null;

  const activeTier = QUALITY_TIERS.find((t) => t.id === selectedTier) || QUALITY_TIERS[1];

  const handleOpenMovieDetail = (movieId: string) => {
    setStorageError(null);
    setStorageNotice(null);
    setSpotlightPlaying(false);
    setPreviewingCardId(null);
    if (onSelectMovie) {
      onSelectMovie(movieId);
    }
  };

  const handleCopyMovieLink = async (movieId: string) => {
    const url = `${window.location.origin}/movies/${movieId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(movieId);
      window.setTimeout(() => setCopiedLinkId(null), 3000);
    } catch {
      // Clipboard blocked
    }
  };

  const handleSaveToLocalStorage = async (movie: DisplayMovie) => {
    setStorageError(null);
    setStorageNotice(null);
    setDownloadProgress((prev) => ({
      ...prev,
      [movie.movieId]: { loadedBytes: 0, totalBytes: null, percent: 0 },
    }));

    try {
      const savedMeta = await saveMovieToLocalStorage(
        {
          ...movie,
          published: true,
          createdAtMs: Date.now(),
        },
        (prog) => {
          setDownloadProgress((prev) => ({ ...prev, [movie.movieId]: prog }));
        }
      );
      await refreshSavedMovies();
      setStorageNotice(
        `"${movie.title}" (${formatBytes(savedMeta.sizeBytes)}) is now saved in your browser local storage for offline viewing.`
      );
    } catch (err) {
      if (err instanceof OfflineStorageCorsError) {
        setStorageError(
          `${err.message} Opening direct MP4 download link as fallback is available via "Download MP4".`
        );
      } else {
        setStorageError(
          err instanceof Error ? err.message : 'Unable to save movie into local browser storage.'
        );
      }
    } finally {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[movie.movieId];
        return next;
      });
    }
  };

  const handleRemoveLocalMovie = async (movieId: string, movieTitle: string) => {
    setStorageError(null);
    try {
      await removeSavedMovie(movieId);
      if (inlinePlayer?.movieId === movieId && inlinePlayer.isOfflineBlob) {
        setInlinePlayer(null);
      }
      await refreshSavedMovies();
      setStorageNotice(`Removed "${movieTitle}" from browser local storage.`);
    } catch (err) {
      setStorageError(
        err instanceof Error ? err.message : 'Unable to delete movie from local storage.'
      );
    }
  };

  const handlePlayInlineDetail = async (
    movie: DisplayMovie,
    isPreviewMode = false,
    resumeSeconds?: number
  ) => {
    setInlinePlayerError(null);
    setDetailPreviewRemaining(30);
    setPreviewingCardId(null);
    setSpotlightPlaying(false);
    inlineSeekAppliedRef.current = null;
    const savedProgress = !isPreviewMode ? getProgressForMovie(movie.movieId) : undefined;
    const initialSeek =
      resumeSeconds !== undefined
        ? resumeSeconds
        : savedProgress && !savedProgress.completed && savedProgress.positionSeconds >= 5
          ? savedProgress.positionSeconds
          : 0;

    try {
      const offlineBlobUrl = await getSavedMovieBlobUrl(movie.movieId);
      if (offlineBlobUrl) {
        setInlinePlayer({
          movieId: movie.movieId,
          srcUrl: offlineBlobUrl,
          isOfflineBlob: true,
          isObjectUrl: true,
          isPreviewMode,
          initialSeekSeconds: initialSeek,
        });
        return;
      }
    } catch {
      // Fallback to remote stream
    }

    const streamUrl = movie.downloadUrl || movie.videoUrl;
    const coverArt = movie.coverArtUrl || movie.posterUrl;

    setInlinePlayer({
      movieId: movie.movieId,
      srcUrl: streamUrl,
      isOfflineBlob: false,
      isObjectUrl: false,
      isPreviewMode,
      initialSeekSeconds: initialSeek,
    });
    void coverArt;
  };

  const handleToggleCardPreview = (movie: DisplayMovie) => {
    setSpotlightPlaying(false);
    setSpotlightError(null);
    if (previewingCardId === movie.movieId) {
      setPreviewingCardId(null);
      return;
    }
    setPreviewFailedIds((prev) => ({ ...prev, [movie.movieId]: false }));
    setCardPreviewRemaining(30);
    setCardPreviewMuted(true);
    setPreviewingCardId(movie.movieId);
  };

  const handleStartSpotlightPreview = (targetIndex: number) => {
    setPreviewingCardId(null);
    setSpotlightError(null);
    setSpotlightRemaining(30);
    setSpotlightIndex(targetIndex);
    setSpotlightPlaying(true);
  };

  const handleWatchMovieModal = async (movie: DisplayMovie, resumeSeconds?: number) => {
    setPreviewingCardId(null);
    setSpotlightPlaying(false);
    setPlayerError(null);
    modalSeekAppliedRef.current = null;
    const coverArt = movie.coverArtUrl || movie.posterUrl;
    const streamUrl = movie.downloadUrl || movie.videoUrl;
    const savedProgress = getProgressForMovie(movie.movieId);
    const initialSeek =
      resumeSeconds !== undefined
        ? resumeSeconds
        : savedProgress && !savedProgress.completed && savedProgress.positionSeconds >= 5
          ? savedProgress.positionSeconds
          : 0;

    const metaLabel = [
      movie.genre || movie.category,
      movie.releaseYear,
      movie.language || 'Offline Copy',
      movie.vjTranslator || movie.durationLabel,
    ]
      .filter(Boolean)
      .join(' · ');

    try {
      const offlineBlobUrl = await getSavedMovieBlobUrl(movie.movieId);
      if (offlineBlobUrl) {
        setActivePlayer({
          movieId: movie.movieId,
          title: movie.title,
          meta: metaLabel,
          synopsis: movie.synopsis,
          posterUrl: coverArt,
          srcUrl: offlineBlobUrl,
          isOfflineBlob: true,
          isObjectUrl: true,
          initialSeekSeconds: initialSeek,
        });
        return;
      }
    } catch {
      // Fallback to online stream URL
    }

    setActivePlayer({
      movieId: movie.movieId,
      title: movie.title,
      meta: metaLabel,
      synopsis: movie.synopsis,
      posterUrl: coverArt,
      srcUrl: streamUrl,
      isOfflineBlob: false,
      isObjectUrl: false,
      initialSeekSeconds: initialSeek,
    });
  };

  const handleSubmitMovieRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqNotice(null);
    if (!user || !user.emailVerified) {
      onRequestAuth?.();
      return;
    }
    setReqBusy(true);
    try {
      const res = await submitMovieRequest({
        title: reqTitle,
        vjPreference: reqVj,
        releaseYear: reqYear,
        notes: reqNotes,
      });
      setReqNotice({ ok: res.ok, text: res.message });
      if (res.ok) {
        setReqTitle('');
        setReqNotes('');
      }
    } catch (err) {
      setReqNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to submit movie request right now.',
      });
    } finally {
      setReqBusy(false);
    }
  };

  const handleExportSavedOfflineMovie = async (movie: SavedOfflineMovieMeta) => {
    try {
      const blobUrl = await getSavedMovieBlobUrl(movie.movieId);
      if (!blobUrl) {
        setStorageError('Local video file not found. Try saving it again while online.');
        return;
      }
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = movie.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      link.download = `${safeName || '0xdev-movie'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : 'Unable to export local video file.');
    }
  };

  const handleToggleSubscription = async () => {
    if (!user || !user.emailVerified || !user.email) {
      onRequestAuth?.();
      return;
    }

    setSubError(null);
    setSubBusy(true);
    const subRef = doc(db, 'movieSubscribers', user.uid);
    const subscriberName = (user.displayName || user.email.split('@')[0] || 'Movie Member')
      .trim()
      .slice(0, 100);

    try {
      if (!subExists) {
        await setDoc(subRef, {
          subscriberId: user.uid,
          subscriberUid: user.uid,
          email: user.email.trim().slice(0, 200),
          subscriberName,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setJustSubscribed(true);
      } else {
        const nextActive = !isSubscribed;
        await updateDoc(subRef, {
          email: user.email.trim().slice(0, 200),
          subscriberName,
          active: nextActive,
          updatedAt: serverTimestamp(),
        });
        if (nextActive) {
          setJustSubscribed(true);
        }
      }
    } catch (err) {
      setSubError('Unable to update movie release subscription right now.');
      handleFirestoreError(err, OperationType.WRITE, `movieSubscribers/${user.uid}`);
    } finally {
      setSubBusy(false);
    }
  };

  // =========================================================================
  // RENDER (DETAIL VIEW / CATALOG VIEW + SHARED THEATER MODAL)
  // =========================================================================
  const detailContent = (() => {
    if (!selectedMovieId) return null;
    const savedMeta = selectedMovie ? savedById.get(selectedMovie.movieId) : undefined;
    const isSaved = Boolean(savedMeta);
    const activeProgress = selectedMovie ? downloadProgress[selectedMovie.movieId] : undefined;
    const isInlineActive = Boolean(
      selectedMovie && inlinePlayer && inlinePlayer.movieId === selectedMovie.movieId
    );
    const imgFailed = Boolean(selectedMovie && failedImages[selectedMovie.movieId]);

    return (
      <>
        <PageHeader
          eyebrow={
            selectedMovie
              ? `${selectedMovie.genre} · ${selectedMovie.releaseYear} · ${selectedMovie.language} · ${selectedMovie.vjTranslator}`
              : 'Movies & Offline Downloads'
          }
          title={selectedMovie ? selectedMovie.title : 'Movie Details'}
          description={
            selectedMovie
              ? `${selectedMovie.qualityLabel} · ${selectedMovie.fileSizeLabel} · ${selectedMovie.durationLabel} · Stream directly or save into local browser storage.`
              : 'Loading movie metadata and offline playback availability.'
          }
          currentLabel={selectedMovie ? selectedMovie.title : 'Movie Detail'}
          onNavigate={onNavigate}
        />

        <section className="bg-white dark:bg-[#090D1F] py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Top Back Navigation & Share Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7F0] dark:border-[#242C54] pb-5">
              <button
                type="button"
                onClick={() => onSelectMovie?.(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to All Movies</span>
              </button>

              {selectedMovie && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleWatchlist(selectedMovie)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                      isInWatchlist(selectedMovie.movieId)
                        ? 'border-[#EE1119] bg-[#EE1119]/10 text-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]'
                    }`}
                  >
                    <Bookmark
                      className={`h-3.5 w-3.5 ${
                        isInWatchlist(selectedMovie.movieId) ? 'fill-current' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      {isInWatchlist(selectedMovie.movieId) ? 'In My Watchlist' : 'Add to Watchlist'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyMovieLink(selectedMovie.movieId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                  >
                    {copiedLinkId === selectedMovie.movieId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                        <span>Copy Movie Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {storageError && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-4 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
              >
                {storageError}
              </div>
            )}

            {storageNotice && (
              <div
                role="status"
                className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 p-4 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
              >
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{storageNotice}</span>
              </div>
            )}

            {moviesLoading && !selectedMovie ? (
              <div className="mt-8 h-96 animate-pulse rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38]" />
            ) : !selectedMovie ? (
              <div className="mt-8 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-10 text-center">
                <Clapperboard className="mx-auto h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                <h2 className="mt-3 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Movie Not Found
                </h2>
                <p className="mt-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                  This title may have been unpublished by the admin or moved from the catalog.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectMovie?.(null)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Browse Available Movies</span>
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-12">
                {/* Main Detail Split Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                  {/* Left: Poster / Inline Video Player */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#090D1F] shadow-[0_20px_50px_rgba(26,20,100,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      {isInlineActive && inlinePlayer ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#101530] px-4 py-2.5 text-xs font-bold text-white">
                            <span className="text-[#EE1119]">
                              {inlinePlayer.isPreviewMode
                                ? `Scene Preview (${detailPreviewRemaining}s remaining)`
                                : inlinePlayer.isOfflineBlob
                                  ? 'Playing from Local Browser Storage (Offline)'
                                  : 'Streaming Directly Online'}
                            </span>
                            <div className="flex items-center gap-3">
                              {inlinePlayer.isPreviewMode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handlePlayInlineDetail(selectedMovie, false)
                                  }
                                  className="text-[#A7F3D0] hover:text-white"
                                >
                                  Watch Full Movie
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setInlinePlayer(null)}
                                className="text-white/75 hover:text-white"
                              >
                                Show Poster
                              </button>
                            </div>
                          </div>
                          {inlinePlayer.isPreviewMode ? (
                            <MovieScenePreviewVideo
                              srcUrl={inlinePlayer.srcUrl}
                              posterUrl={selectedMovie.coverArtUrl || selectedMovie.posterUrl}
                              title={selectedMovie.title}
                              muted={false}
                              maxSeconds={30}
                              onProgress={(_, remaining) =>
                                setDetailPreviewRemaining(remaining)
                              }
                              onComplete={() => setInlinePlayer(null)}
                              onError={() => {
                                setInlinePlayer(null);
                                setInlinePlayerError(
                                  'Preview streaming failed for this source. Try Play Movie Here or Download MP4.'
                                );
                              }}
                              className="aspect-video w-full bg-black"
                            />
                          ) : (
                            <video
                              ref={inlineVideoRef}
                              src={inlinePlayer.srcUrl}
                              poster={
                                (selectedMovie.coverArtUrl || selectedMovie.posterUrl).startsWith(
                                  'https://'
                                ) ||
                                (selectedMovie.coverArtUrl || selectedMovie.posterUrl).startsWith(
                                  '/src/assets/images/'
                                )
                                  ? selectedMovie.coverArtUrl || selectedMovie.posterUrl
                                  : undefined
                              }
                              controls
                              autoPlay
                              playsInline
                              onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                const seekTo = inlinePlayer.initialSeekSeconds || 0;
                                if (
                                  seekTo >= 5 &&
                                  inlineSeekAppliedRef.current !== inlinePlayer.movieId &&
                                  Number.isFinite(video.duration) &&
                                  seekTo < video.duration - 5
                                ) {
                                  inlineSeekAppliedRef.current = inlinePlayer.movieId;
                                  video.currentTime = seekTo;
                                }
                              }}
                              onTimeUpdate={(e) => {
                                const v = e.currentTarget;
                                void recordPlaybackProgress(selectedMovie, v.currentTime, v.duration, false);
                              }}
                              onPause={(e) => {
                                const v = e.currentTarget;
                                void recordPlaybackProgress(selectedMovie, v.currentTime, v.duration, true);
                              }}
                              onEnded={(e) => {
                                const v = e.currentTarget;
                                void recordPlaybackProgress(selectedMovie, v.duration || v.currentTime, v.duration || 1, true);
                              }}
                              onError={() =>
                                setInlinePlayerError(
                                  'Direct browser streaming failed for this source. Try Download MP4 to play the file locally.'
                                )
                              }
                              className="aspect-video w-full bg-black"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                          {!imgFailed ? (
                            <img
                              src={selectedMovie.coverArtUrl || selectedMovie.posterUrl}
                              alt={`${selectedMovie.title} cover art`}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  [selectedMovie.movieId]: true,
                                }))
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1A1464] to-[#090D1F] p-8 text-center text-white">
                              <Film className="h-12 w-12 text-[#EE1119]" aria-hidden="true" />
                              <p className="mt-3 font-display text-lg font-bold">
                                {selectedMovie.title}
                              </p>
                            </div>
                          )}
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-[#090D1F]/90 via-[#090D1F]/25 to-transparent"
                          />
                          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                                {isSaved
                                  ? 'Saved Offline in Local Storage'
                                  : 'Free Stream & Offline Download'}
                              </p>
                              <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-white">
                                {selectedMovie.title}
                              </h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => void handlePlayInlineDetail(selectedMovie, true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#090D1F]/80 backdrop-blur-sm px-4 py-3 text-xs sm:text-sm font-bold text-white hover:border-[#EE1119] hover:text-[#EE1119] whitespace-nowrap shrink-0"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                <span>Watch 30s Preview</span>
                              </button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={SPRING_SNAPPY}
                                onClick={() => void handlePlayInlineDetail(selectedMovie, false)}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-[#D00D14] whitespace-nowrap shrink-0"
                              >
                                <Play className="h-4 w-4" aria-hidden="true" />
                                <span>
                                  {(() => {
                                    const p = getProgressForMovie(selectedMovie.movieId);
                                    if (p && !p.completed && p.positionSeconds >= 5) {
                                      return `Resume (${formatPlaybackTimestamp(p.positionSeconds)})`;
                                    }
                                    return isSaved ? 'Play Offline Now' : 'Play Movie Here';
                                  })()}
                                </span>
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {inlinePlayerError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        {inlinePlayerError}
                      </div>
                    )}

                    {/* Full Synopsis Card */}
                    <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-7">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                        Film Synopsis &amp; Notes
                      </p>
                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] whitespace-pre-line">
                        {selectedMovie.synopsis}
                      </p>
                    </div>
                  </div>

                  {/* Right: Technical Metadata & Download / Local Storage Controls */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-7">
                      <div
                        aria-hidden="true"
                        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                      />

                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                        Release Specifications
                      </p>
                      <h2 className="mt-1.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        Download &amp; Playback Options
                      </h2>

                      <dl className="mt-5 divide-y divide-[#E5E7F0] dark:divide-[#242C54] text-xs sm:text-sm">
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8] shrink-0">
                            <Film className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Title</span>
                          </dt>
                          <dd className="min-w-0 font-bold text-[#1A1464] dark:text-[#F4F6FC] text-right truncate">
                            {selectedMovie.title}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <Calendar className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Release Year</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                            {selectedMovie.releaseYear}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <Tag className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Genre</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {selectedMovie.genre}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8] shrink-0">
                            <Languages className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Audio &amp; VJ</span>
                          </dt>
                          <dd className="min-w-0 font-bold text-[#1A1464] dark:text-[#F4F6FC] text-right break-words">
                            {selectedMovie.language} · {selectedMovie.vjTranslator}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <Clock className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Runtime</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            {selectedMovie.durationLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <ShieldCheck
                              className="h-3.5 w-3.5 text-[#EE1119]"
                              aria-hidden="true"
                            />
                            <span>Quality &amp; Size</span>
                          </dt>
                          <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                            {selectedMovie.qualityLabel} · {selectedMovie.fileSizeLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="inline-flex items-center gap-1.5 font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                            <HardDrive className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>Local Storage</span>
                          </dt>
                          <dd
                            className={`font-bold ${
                              isSaved
                                ? 'text-[#10B981]'
                                : 'text-[#6B7188] dark:text-[#8E97B8]'
                            }`}
                          >
                            {savedMeta
                              ? `Cached (${formatBytes(savedMeta.sizeBytes)})`
                              : 'Not Saved Offline Yet'}
                          </dd>
                        </div>
                      </dl>

                      {activeProgress && (
                        <div className="mt-5 space-y-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-3.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            <span>Caching into browser storage...</span>
                            <span className="tabular-nums">
                              {activeProgress.percent !== null
                                ? `${activeProgress.percent}%`
                                : formatBytes(activeProgress.loadedBytes)}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7F0] dark:bg-[#242C54]">
                            <div
                              className="h-full rounded-full bg-[#EE1119] transition-all duration-150"
                              style={{
                                width: `${
                                  activeProgress.percent !== null ? activeProgress.percent : 45
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-6 space-y-2.5">
                        <button
                          type="button"
                          onClick={() => void handleWatchMovieModal(selectedMovie)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#D00D14]"
                        >
                          <Play className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {isSaved
                              ? 'Open Theater Player (Offline Copy)'
                              : 'Open Theater Player'}
                          </span>
                        </button>

                        {isSaved && savedMeta ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => void handleExportSavedOfflineMovie(savedMeta)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#120D4A]"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Export Saved MP4</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleRemoveLocalMovie(
                                  selectedMovie.movieId,
                                  selectedMovie.title
                                )
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-4 py-2.5 text-xs font-bold text-[#6B7188] dark:text-[#C2C9E0] hover:border-[#EE1119] hover:text-[#EE1119]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Remove Local Copy</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(activeProgress) || !isOfflineStorageSupported()}
                            onClick={() => void handleSaveToLocalStorage(selectedMovie)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#120D4A] disabled:opacity-60"
                          >
                            <HardDrive className="h-4 w-4" aria-hidden="true" />
                            <span>
                              {activeProgress
                                ? 'Saving to Local Storage...'
                                : 'Save to Local Storage (Offline)'}
                            </span>
                          </button>
                        )}

                        <a
                          href={selectedMovie.downloadUrl || selectedMovie.videoUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-5 py-2.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119]"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Direct Download MP4 File</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Movies Strip */}
                {relatedMovies.length > 0 && (
                  <div className="pt-8 border-t border-[#E5E7F0] dark:border-[#242C54]">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                          More From 0xDEV Cinema
                        </p>
                        <h3 className="mt-1 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                          Explore other free downloads
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectMovie?.(null)}
                        className="text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                      >
                        View full catalog &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      {relatedMovies.map((rel) => (
                        <button
                          key={rel.movieId}
                          type="button"
                          onClick={() => handleOpenMovieDetail(rel.movieId)}
                          className="group text-left rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-5 transition-colors hover:border-[#EE1119]/40"
                        >
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                            {rel.genre} · {rel.releaseYear} · {rel.vjTranslator}
                          </p>
                          <h4 className="mt-1.5 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors">
                            {rel.title}
                          </h4>
                          <p className="mt-1.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-2">
                            {rel.synopsis}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </>
    );
  })();

  // =========================================================================
  // CATALOG & LOCAL OFFLINE VAULT VIEW (/movies)
  // =========================================================================
  return (
    <>
      {detailContent || (
        <>
      <PageHeader
        eyebrow="Free Cinema & Luganda VJ Library"
        title="Stream Luganda-translated films or save movies to local storage."
        description="Explore verified Luganda-translated VJ releases and open-access films with release year, genre, cover art, direct MP4 download links, and offline browser storage."
        currentLabel="Movies"
        onNavigate={onNavigate}
      />

      {/* Section 1: Live Movie Library & Local Offline Vault */}
      <section className="bg-white dark:bg-[#090D1F] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Return Hub Strip: Daily Streak + New Since Last Visit + Tonight's Pick */}
          <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#120D4A] p-5 sm:p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EE1119] text-white shrink-0">
                    <Flame className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF8A8E]">
                      Daily Cinema Habit
                    </p>
                    <p className="font-display text-lg sm:text-xl font-extrabold text-white tabular-nums">
                      Day {engagement.streakDays} Return Streak
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                    <span className="tabular-nums">{engagement.totalMoviesWatched} Watched</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('watchlist')}
                    className="inline-flex items-center gap-1.5 hover:text-[#FF8A8E] transition-colors"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                    <span className="tabular-nums">{watchlist.length} Watchlist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className="inline-flex items-center gap-1.5 hover:text-[#FF8A8E] transition-colors"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5 text-[#A7F3D0]" aria-hidden="true" />
                    <span className="tabular-nums">
                      {movieRequests.filter((r) => r.status === 'open').length} Requests
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                <div className="text-xs text-white/85">
                  {newSinceLastVisitMovies.length > 0 ? (
                    <span>
                      <strong className="text-white tabular-nums">
                        {newSinceLastVisitMovies.length} new release
                        {newSinceLastVisitMovies.length === 1 ? '' : 's'}
                      </strong>{' '}
                      added since your last check-in.
                    </span>
                  ) : (
                    <span>
                      All current drops checked. New Luganda &amp; 2026 uploads auto-appear here.
                    </span>
                  )}
                  {!user?.emailVerified && user && (
                    <span className="block mt-1 text-[11px] text-[#FFCFD1]">
                      Verify your email above to sync Watchlist, Resume &amp; Requests across devices.
                    </span>
                  )}
                </div>

                {newSinceLastVisitMovies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('catalog');
                        setReleaseFilter((prev) => (prev === 'new' ? 'all' : 'new'));
                      }}
                      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                        releaseFilter === 'new'
                          ? 'bg-[#EE1119] text-white'
                          : 'bg-white text-[#1A1464] hover:bg-[#EE1119] hover:text-white'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {releaseFilter === 'new'
                          ? 'Showing New Drops'
                          : `See ${newSinceLastVisitMovies.length} New`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void markCatalogSeenNow(latestCatalogCreatedMs)}
                      className="inline-flex min-h-[38px] items-center rounded-xl border border-white/25 px-3 py-2 text-xs font-bold text-white/90 hover:border-white"
                    >
                      Mark Seen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {tonightsPick && (
              <div className="lg:col-span-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                      Tonight&apos;s Unwatched Pick
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenMovieDetail(tonightsPick.movieId)}
                      className="mt-1 text-left font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] line-clamp-1"
                    >
                      {tonightsPick.title}
                    </button>
                    <p className="mt-0.5 text-xs text-[#6B7188] dark:text-[#8E97B8] truncate">
                      {tonightsPick.genre} · {tonightsPick.releaseYear} · {tonightsPick.vjTranslator}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTonightPickOffset((prev) => prev + 1)}
                    aria-label="Pick another movie for tonight"
                    title="Shuffle another unwatched pick"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] shrink-0"
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Shuffle</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7F0] dark:border-[#242C54]">
                  <button
                    type="button"
                    onClick={() => void handleWatchMovieModal(tonightsPick)}
                    className="inline-flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14] whitespace-nowrap"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Watch Pick</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenMovieDetail(tonightsPick.movieId)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] whitespace-nowrap"
                  >
                    <span>Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleWatchlist(tonightsPick)}
                    aria-label={
                      isInWatchlist(tonightsPick.movieId)
                        ? `Remove ${tonightsPick.title} from watchlist`
                        : `Save ${tonightsPick.title} to watchlist`
                    }
                    className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      isInWatchlist(tonightsPick.movieId)
                        ? 'border-[#EE1119] bg-[#EE1119]/10 text-[#EE1119]'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]'
                    }`}
                  >
                    <Bookmark
                      className={`h-4 w-4 ${
                        isInWatchlist(tonightsPick.movieId) ? 'fill-current' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {engagementFeedback && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 px-4 py-3 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
            >
              <span>{engagementFeedback}</span>
              <button
                type="button"
                onClick={() => setEngagementFeedback(null)}
                aria-label="Dismiss notification"
                className="rounded p-1 hover:bg-black/10"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Interactive View Tabs + Language Scope */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
            <div
              role="tablist"
              aria-label="Movie hub sections"
              className="inline-flex flex-wrap gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1.5"
            >
              {(
                [
                  { id: 'catalog', label: `Available Movies (${movies.length})` },
                  { id: 'watchlist', label: `My Watchlist (${watchlist.length})` },
                  {
                    id: 'requests',
                    label: `Movie Requests (${movieRequests.filter((r) => r.status === 'open').length})`,
                  },
                  { id: 'offline', label: `Offline Vault (${savedMovies.length})` },
                  { id: 'roadmap', label: 'Specs & Roadmap' },
                ] as { id: LibraryViewTab; label: string }[]
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-white'
                        : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="movies-view-tab-pill"
                        aria-hidden="true"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F]"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'catalog' && (
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `All Audio (${movies.length})` },
                    { id: 'luganda', label: `Luganda Translated (${lugandaCount})` },
                    { id: 'english', label: `English & Classics (${englishCount})` },
                  ] as { id: LanguageFilterScope; label: string }[]
                ).map((langOpt) => {
                  const active = languageFilter === langOpt.id;
                  return (
                    <button
                      key={langOpt.id}
                      type="button"
                      onClick={() => setLanguageFilter(langOpt.id)}
                      className={`rounded-lg px-3.5 py-2 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'border-[#EE1119] bg-[#EE1119] text-white'
                          : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#4A4F63] dark:text-[#C2C9E0] hover:border-[#1A1464]/35'
                      }`}
                    >
                      {langOpt.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setReleaseFilter((prev) => (prev === '2026' ? 'all' : '2026'))
                  }
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                    releaseFilter === '2026'
                      ? 'border-[#1A1464] dark:border-[#9FA8FF] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                      : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]/50'
                  }`}
                >
                  2026 Only ({release2026Count})
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReleaseFilter((prev) => (prev === 'latest' ? 'all' : 'latest'))
                  }
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                    releaseFilter === 'latest'
                      ? 'border-[#1A1464] dark:border-[#9FA8FF] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                      : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]/50'
                  }`}
                >
                  2025–2026 Latest ({releaseLatestCount})
                </button>

                {newSinceLastVisitMovies.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setReleaseFilter((prev) => (prev === 'new' ? 'all' : 'new'))
                    }
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                      releaseFilter === 'new'
                        ? 'border-[#10B981] bg-[#10B981] text-white'
                        : 'border-[#10B981]/40 bg-[#ECFDF5] dark:bg-[#0D2A24] text-[#065F46] dark:text-[#A7F3D0] hover:border-[#10B981]'
                    }`}
                  >
                    New Drops ({newSinceLastVisitMovies.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search & Dynamic Genre Filter Strip */}
          {activeTab === 'catalog' && (
            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7188]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search movies by title, VJ translator, genre, or year"
                  placeholder="Search 2026 movies, VJ (Junior, Mark, Ice P, Jingo, Emmy, Mande)..."
                  className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188] focus:border-[#EE1119] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6B7188] hover:text-[#EE1119]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {availableGenres.map((genreName) => {
                  const selected = effectiveGenre === genreName;
                  return (
                    <button
                      key={genreName}
                      type="button"
                      onClick={() => setSelectedGenre(genreName)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                        selected
                          ? 'border-[#1A1464] dark:border-[#9FA8FF] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                          : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#4A4F63] dark:text-[#C2C9E0] hover:border-[#EE1119]/50'
                      }`}
                    >
                      {genreName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {storageError && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-4 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
            >
              {storageError}
            </div>
          )}

          {storageNotice && (
            <div
              role="status"
              className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 p-4 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{storageNotice}</span>
            </div>
          )}

          {/* Live Auto-Update Feed Strip */}
          {activeTab === 'catalog' && (
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                <Radio
                  className={`h-3.5 w-3.5 shrink-0 ${
                    syncingExternal ? 'text-[#EE1119] animate-pulse' : 'text-[#10B981]'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                  Live Auto-Update Feed:
                </span>
                <span>
                  {syncingExternal
                    ? 'Checking other movie sites for new uploads...'
                    : externalIdSet.size > 0
                      ? `${externalIdSet.size} newly uploaded external movie${
                          externalIdSet.size === 1 ? '' : 's'
                        } auto-added`
                      : 'Watching external sites every 10 min for new uploads'}
                </span>
                {lastExternalSyncMs && !syncingExternal && (
                  <span className="text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
                    · Checked {new Date(lastExternalSyncMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={syncingExternal}
                onClick={() => void refreshExternalFeed(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-1.5 text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60 shrink-0"
              >
                <RefreshCw
                  className={`h-3 w-3 ${syncingExternal ? 'animate-spin text-[#EE1119]' : ''}`}
                  aria-hidden="true"
                />
                <span>{syncingExternal ? 'Checking Sites...' : 'Check Other Sites Now'}</span>
              </button>
            </div>
          )}

          {/* Continue Watching Shelf */}
          {activeTab === 'catalog' && continueWatchingList.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                      Pick Up Where You Left Off
                    </p>
                    <h2 className="font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                      Continue Watching ({continueWatchingList.length})
                    </h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {continueWatchingList.map((item) => {
                  const catalogMatch = movies.find(
                    (m) => m.movieId === item.rawMovieId || safeFirestoreKey(m.movieId) === item.movieId
                  );
                  return (
                    <div
                      key={item.movieId}
                      className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38]"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                        <img
                          src={catalogMatch?.coverArtUrl || catalogMatch?.posterUrl || item.posterUrl}
                          alt={`${item.title} resume thumbnail`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => void clearWatchProgress(item.rawMovieId || item.movieId)}
                          aria-label={`Remove ${item.title} from Continue Watching`}
                          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-white/85 hover:bg-[#EE1119] hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <p className="text-[11px] font-bold text-white truncate">{item.title}</p>
                          <p className="text-[10px] font-semibold text-white/80 tabular-nums">
                            Stopped at {formatPlaybackTimestamp(item.positionSeconds)} · {item.progressPercent}%
                          </p>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                          <div
                            className="h-full bg-[#EE1119]"
                            style={{ width: `${Math.max(4, item.progressPercent)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center gap-2">
                        {catalogMatch ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleWatchMovieModal(catalogMatch, item.positionSeconds)
                            }
                            className="inline-flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#EE1119] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#D00D14]"
                          >
                            <Play className="h-3 w-3" aria-hidden="true" />
                            <span>Resume {formatPlaybackTimestamp(item.positionSeconds)}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenMovieDetail(item.rawMovieId || item.movieId)}
                            className="inline-flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#1A1464] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#EE1119]"
                          >
                            <span>Open Details</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured Movie Previews Spotlight Strip */}
          {activeTab === 'catalog' && activeSpotlightMovie && (
            <div className="mt-6 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                    Movie Previews Reel
                  </p>
                  <h2 className="mt-0.5 font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    Watch quick 30-second scene previews before downloading
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                    {(spotlightIndex % previewPool.length) + 1} / {previewPool.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSpotlightPlaying(false);
                      setSpotlightError(null);
                      setSpotlightIndex(
                        (prev) => (prev - 1 + previewPool.length) % previewPool.length
                      );
                    }}
                    aria-label="Previous movie preview"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpotlightPlaying(false);
                      setSpotlightError(null);
                      setSpotlightIndex((prev) => (prev + 1) % previewPool.length);
                    }}
                    aria-label="Next movie preview"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119]"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
                {/* Main Preview Stage */}
                <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#090D1F] text-white">
                  <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                    {spotlightPlaying ? (
                      <>
                        <MovieScenePreviewVideo
                          srcUrl={activeSpotlightMovie.downloadUrl || activeSpotlightMovie.videoUrl}
                          posterUrl={
                            activeSpotlightMovie.coverArtUrl || activeSpotlightMovie.posterUrl
                          }
                          title={activeSpotlightMovie.title}
                          muted={spotlightMuted}
                          maxSeconds={30}
                          onProgress={(_, remaining) => setSpotlightRemaining(remaining)}
                          onComplete={() => setSpotlightPlaying(false)}
                          onError={() => {
                            setSpotlightPlaying(false);
                            setSpotlightError(
                              'Inline preview could not stream from this mirror. Open Watch Full Movie or Download MP4 instead.'
                            );
                          }}
                          className="h-full w-full object-cover bg-black"
                        />
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-4 py-3 text-xs font-bold">
                          <span className="text-white tabular-nums">
                            Previewing Scene · {spotlightRemaining}s
                          </span>
                          <div className="pointer-events-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSpotlightMuted((m) => !m)}
                              aria-label={spotlightMuted ? 'Unmute preview' : 'Mute preview'}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#090D1F]/80 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:border-[#EE1119]"
                            >
                              {spotlightMuted ? (
                                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span>{spotlightMuted ? 'Muted' : 'Sound'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpotlightPlaying(false)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#EE1119] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#D00D14]"
                            >
                              <Square className="h-3 w-3" aria-hidden="true" />
                              <span>Stop</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {!failedImages[activeSpotlightMovie.movieId] ? (
                          <img
                            src={
                              activeSpotlightMovie.coverArtUrl || activeSpotlightMovie.posterUrl
                            }
                            alt={`${activeSpotlightMovie.title} preview poster`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({
                                ...prev,
                                [activeSpotlightMovie.movieId]: true,
                              }))
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1A1464] to-[#090D1F] p-6 text-center">
                            <Film className="h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                            <p className="mt-2 font-display text-base font-bold">
                              {activeSpotlightMovie.title}
                            </p>
                          </div>
                        )}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-[#090D1F]/90 via-[#090D1F]/30 to-transparent"
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                              {activeSpotlightMovie.genre} · {activeSpotlightMovie.releaseYear} ·{' '}
                              {activeSpotlightMovie.vjTranslator}
                            </p>
                            <h3 className="mt-0.5 font-display text-lg sm:text-xl font-extrabold text-white truncate">
                              {activeSpotlightMovie.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleStartSpotlightPreview(spotlightIndex % previewPool.length)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#D00D14] whitespace-nowrap shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Play 30s Preview</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#101530] px-4 py-3 text-xs">
                    <span className="text-white/75 line-clamp-1 max-w-md">
                      {spotlightError || activeSpotlightMovie.synopsis}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenMovieDetail(activeSpotlightMovie.movieId)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white hover:border-[#EE1119] whitespace-nowrap"
                      >
                        Movie Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleWatchMovieModal(activeSpotlightMovie)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EE1119] px-3 py-1.5 font-bold text-white hover:bg-[#D00D14] whitespace-nowrap"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                        <span>Watch Full Movie</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Preview Queue Selector */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
                  {previewPool.slice(0, 4).map((item, qIdx) => {
                    const isSelected = item.movieId === activeSpotlightMovie.movieId;
                    const itemCover = item.coverArtUrl || item.posterUrl;
                    return (
                      <button
                        key={item.movieId}
                        type="button"
                        onClick={() => handleStartSpotlightPreview(qIdx)}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#EE1119] bg-white dark:bg-[#141A38] shadow-sm'
                            : 'border-[#E5E7F0] dark:border-[#242C54] bg-white/70 dark:bg-[#141A38]/70 hover:border-[#1A1464]/40'
                        }`}
                      >
                        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#120D4A]">
                          {!failedImages[item.movieId] ? (
                            <img
                              src={itemCover}
                              alt={`${item.title} preview`}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  [item.movieId]: true,
                                }))
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#1A1464] text-white">
                              <Film className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <Play className="h-2.5 w-2.5 text-[#EE1119]" aria-hidden="true" />
                            Preview
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-[#EE1119] truncate">
                            {item.releaseYear} · {item.vjTranslator}
                          </p>
                          <p className="mt-0.5 font-display text-sm font-extrabold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#6B7188] dark:text-[#8E97B8] truncate">
                            {item.genre} · {item.durationLabel} · {item.fileSizeLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Structured Movie Grid */}
          {activeTab === 'catalog' && (
            <div className="mt-6">
              {moviesLoading && movies.length === 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="h-96 animate-pulse rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38]"
                    />
                  ))}
                </div>
              ) : filteredMovies.length === 0 ? (
                <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-8 sm:p-12 text-center">
                  <Clapperboard className="mx-auto h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                  <h2 className="mt-3 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    {movies.length === 0
                      ? 'Movies are loading into the library.'
                      : 'No movies matched that filter or search query.'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-[#4A4F63] dark:text-[#C2C9E0] leading-relaxed">
                    {movies.length === 0
                      ? 'Subscribe below so we send an instant email alert when new releases publish.'
                      : 'Clear your search query or switch back to All Audio and All Genres to browse all releases.'}
                  </p>
                  {movies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGenre('All');
                        setLanguageFilter('all');
                        setReleaseFilter('all');
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredMovies.map((movie, idx) => {
                    const isSaved = savedById.has(movie.movieId);
                    const isBookmarked = isInWatchlist(movie.movieId);
                    const movieProgress = getProgressForMovie(movie.movieId);
                    const hasResume =
                      Boolean(movieProgress) &&
                      !movieProgress?.completed &&
                      (movieProgress?.positionSeconds || 0) >= 5;
                    const isCompleted =
                      completedMovieIds.has(movie.movieId) ||
                      completedMovieIds.has(safeFirestoreKey(movie.movieId));
                    const isNewDrop = movie.createdAtMs > sessionSeenBaselineMs;
                    const activeProgress = downloadProgress[movie.movieId];
                    const imgFailed = Boolean(failedImages[movie.movieId]);
                    const coverArt = movie.coverArtUrl || movie.posterUrl;
                    const downloadHref = movie.downloadUrl || movie.videoUrl;
                    const isCardPreviewing = previewingCardId === movie.movieId;
                    const cardPreviewFailed = Boolean(previewFailedIds[movie.movieId]);

                    return (
                      <motion.div
                        key={movie.movieId}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 'some' }}
                        transition={{
                          duration: 0.36,
                          delay: (idx % 3) * 0.04,
                          ease: EASE_OUT_EXPO,
                        }}
                        className="h-full"
                      >
                        <InteractiveCard
                          hoverY={-5}
                          className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] shadow-sm transition-colors hover:border-[#1A1464]/35 dark:hover:border-white/25"
                        >
                          <div>
                            <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                              {isCardPreviewing ? (
                                <>
                                  <MovieScenePreviewVideo
                                    srcUrl={downloadHref}
                                    posterUrl={coverArt}
                                    title={movie.title}
                                    muted={cardPreviewMuted}
                                    maxSeconds={30}
                                    onProgress={(_, remaining) =>
                                      setCardPreviewRemaining(remaining)
                                    }
                                    onComplete={() => setPreviewingCardId(null)}
                                    onError={() => {
                                      setPreviewingCardId(null);
                                      setPreviewFailedIds((prev) => ({
                                        ...prev,
                                        [movie.movieId]: true,
                                      }));
                                    }}
                                    className="h-full w-full object-cover bg-black"
                                  />
                                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 py-2 text-[11px] font-bold text-white">
                                    <span className="tabular-nums">
                                      Preview · {cardPreviewRemaining}s
                                    </span>
                                    <div className="pointer-events-auto flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setCardPreviewMuted((m) => !m)}
                                        aria-label={
                                          cardPreviewMuted
                                            ? `Unmute preview for ${movie.title}`
                                            : `Mute preview for ${movie.title}`
                                        }
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 border border-white/20 text-white hover:border-[#EE1119]"
                                      >
                                        {cardPreviewMuted ? (
                                          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                                        ) : (
                                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewingCardId(null)}
                                        aria-label={`Stop preview for ${movie.title}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#EE1119] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#D00D14]"
                                      >
                                        <Square className="h-2.5 w-2.5" aria-hidden="true" />
                                        <span>Stop</span>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMovieDetail(movie.movieId)}
                                    aria-label={`View details for ${movie.title}`}
                                    className="block h-full w-full text-left"
                                  >
                                    {!imgFailed ? (
                                      <img
                                        src={coverArt}
                                        alt={`${movie.title} cover art`}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={() =>
                                          setFailedImages((prev) => ({
                                            ...prev,
                                            [movie.movieId]: true,
                                          }))
                                        }
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1A1464] to-[#090D1F] p-6 text-center text-white">
                                        <Film className="h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                                        <p className="mt-2 font-display text-sm font-bold line-clamp-2">
                                          {movie.title}
                                        </p>
                                        <p className="mt-1 text-[11px] font-semibold text-white/75">
                                          {movie.vjTranslator}
                                        </p>
                                      </div>
                                    )}
                                  </button>
                                  <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D1F]/80 via-transparent to-transparent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void toggleWatchlist(movie)}
                                    aria-label={
                                      isBookmarked
                                        ? `Remove ${movie.title} from watchlist`
                                        : `Save ${movie.title} to watchlist`
                                    }
                                    title={isBookmarked ? 'Saved in My Watchlist' : 'Add to My Watchlist'}
                                    className={`absolute top-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-sm transition-colors ${
                                      isBookmarked
                                        ? 'border-[#EE1119] bg-[#EE1119] text-white shadow-md'
                                        : 'border-white/25 bg-[#090D1F]/80 text-white hover:border-[#EE1119] hover:text-[#FF8A8E]'
                                    }`}
                                  >
                                    <Bookmark
                                      className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  {(externalIdSet.has(movie.movieId) || isNewDrop) && (
                                    <span className="absolute top-3 right-3 rounded-lg bg-[#090D1F]/85 border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0] backdrop-blur-sm">
                                      {isNewDrop ? 'New Drop' : 'Auto-Synced'}
                                    </span>
                                  )}
                                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleWatchMovieModal(movie)}
                                      aria-label={`Watch ${movie.title}`}
                                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#EE1119] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#D00D14] whitespace-nowrap"
                                    >
                                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span>
                                        {hasResume && movieProgress
                                          ? `Resume · ${formatPlaybackTimestamp(movieProgress.positionSeconds)}`
                                          : isSaved
                                            ? 'Watch Offline'
                                            : 'Watch Now'}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCardPreview(movie)}
                                      aria-label={`Preview ${movie.title}`}
                                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/25 bg-[#090D1F]/85 backdrop-blur-sm px-3 py-2 text-xs font-bold text-white hover:border-[#EE1119] hover:text-[#EE1119] whitespace-nowrap"
                                    >
                                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span>
                                        {cardPreviewFailed ? 'Unavailable' : 'Preview'}
                                      </span>
                                    </button>
                                  </div>
                                  {hasResume && movieProgress && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                                      <div
                                        className="h-full bg-[#EE1119]"
                                        style={{ width: `${Math.max(4, movieProgress.progressPercent)}%` }}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="p-5 sm:p-6">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                                {movie.genre} · {movie.releaseYear} · {movie.language}
                                {isCompleted ? ' · Watched' : ''}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenMovieDetail(movie.movieId)}
                                className="mt-1.5 text-left font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors line-clamp-2"
                              >
                                {movie.title}
                              </button>

                              {/* Structured Movie Schema Specification Rows */}
                              <dl className="mt-3 divide-y divide-[#E5E7F0] dark:divide-[#242C54] rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-1 text-[11px]">
                                <div className="flex items-center justify-between gap-3 py-1.5">
                                  <dt className="font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                                    Release Year
                                  </dt>
                                  <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                                    {movie.releaseYear}
                                  </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-1.5">
                                  <dt className="font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                                    Genre
                                  </dt>
                                  <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                                    {movie.genre}
                                  </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-1.5">
                                  <dt className="font-semibold text-[#6B7188] dark:text-[#8E97B8] shrink-0">
                                    Translator / Audio
                                  </dt>
                                  <dd className="min-w-0 font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate text-right">
                                    {movie.vjTranslator}
                                  </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-1.5">
                                  <dt className="font-semibold text-[#6B7188] dark:text-[#8E97B8] shrink-0">
                                    Quality &amp; Size
                                  </dt>
                                  <dd className="min-w-0 font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums truncate text-right">
                                    {movie.qualityLabel} · {movie.fileSizeLabel}
                                  </dd>
                                </div>
                              </dl>

                              <p className="mt-3 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-2">
                                {movie.synopsis}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenMovieDetail(movie.movieId)}
                                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#1A1464] dark:text-[#9FA8FF] hover:text-[#EE1119]"
                              >
                                <span>View Movie Details</span>
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-[#E5E7F0] dark:border-[#242C54] space-y-2.5">
                            {activeProgress && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                                  <span>Saving to browser local storage...</span>
                                  <span className="tabular-nums">
                                    {activeProgress.percent !== null
                                      ? `${activeProgress.percent}%`
                                      : formatBytes(activeProgress.loadedBytes)}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7F0] dark:bg-[#242C54]">
                                  <div
                                    className="h-full rounded-full bg-[#EE1119] transition-all duration-150"
                                    style={{
                                      width: `${
                                        activeProgress.percent !== null ? activeProgress.percent : 45
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {isSaved ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRemoveLocalMovie(movie.movieId, movie.title)
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#10B981]/40 bg-[#ECFDF5] dark:bg-[#0D2A24] px-3 py-2 text-xs font-bold text-[#065F46] dark:text-[#A7F3D0] hover:border-[#EE1119] hover:text-[#EE1119] whitespace-nowrap"
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Saved Offline · Remove</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    Boolean(activeProgress) || !isOfflineStorageSupported()
                                  }
                                  onClick={() => void handleSaveToLocalStorage(movie)}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-3 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] disabled:opacity-60 whitespace-nowrap"
                                >
                                  <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>
                                    {activeProgress ? 'Caching...' : 'Save to Local Storage'}
                                  </span>
                                </button>
                              )}

                              <a
                                href={downloadHref}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] whitespace-nowrap"
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Download MP4</span>
                              </a>
                            </div>
                          </div>
                        </InteractiveCard>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: Personal Watchlist */}
          {activeTab === 'watchlist' && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-5 sm:p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Personal Watch Queue
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    My Watchlist ({watchlist.length} Saved Title{watchlist.length === 1 ? '' : 's'})
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                    Bookmark Luganda and 2026 films you want to come back to later — synced to your verified account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2 text-xs font-bold text-white hover:bg-[#EE1119]"
                >
                  <span>Browse More Movies</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {watchlist.length === 0 ? (
                <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-8 sm:p-10 text-center">
                  <Bookmark className="mx-auto h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                  <p className="mt-3 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    Your watchlist is empty.
                  </p>
                  <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                    Tap the Bookmark icon on any movie card to queue it up for your next visit.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {watchlist.map((entry) => {
                    const liveMovie = watchlistedCatalogMovies.find(
                      (m) =>
                        m.movieId === entry.rawMovieId ||
                        safeFirestoreKey(m.movieId) === entry.movieId
                    );
                    const prog = getProgressForMovie(entry.rawMovieId || entry.movieId);
                    return (
                      <div
                        key={entry.movieId}
                        className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38]"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                          <img
                            src={liveMovie?.coverArtUrl || liveMovie?.posterUrl || entry.posterUrl}
                            alt={`${entry.title} cover art`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          {prog && !prog.completed && prog.positionSeconds >= 5 && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                              <div
                                className="h-full bg-[#EE1119]"
                                style={{ width: `${Math.max(4, prog.progressPercent)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                              {entry.genre} · {entry.releaseYear} · {entry.vjTranslator}
                            </p>
                            <h3 className="mt-1 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC] line-clamp-2">
                              {liveMovie?.title || entry.title}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E5E7F0] dark:border-[#242C54]">
                            {liveMovie && (
                              <button
                                type="button"
                                onClick={() => void handleWatchMovieModal(liveMovie)}
                                className="inline-flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#EE1119] px-3 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                              >
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>
                                  {prog && !prog.completed && prog.positionSeconds >= 5
                                    ? `Resume ${formatPlaybackTimestamp(prog.positionSeconds)}`
                                    : 'Watch Now'}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenMovieDetail(entry.rawMovieId || entry.movieId)}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void toggleWatchlist(
                                  liveMovie || {
                                    movieId: entry.rawMovieId || entry.movieId,
                                    title: entry.title,
                                    posterUrl: entry.posterUrl,
                                    coverArtUrl: entry.posterUrl,
                                    genre: entry.genre,
                                    releaseYear: entry.releaseYear,
                                    vjTranslator: entry.vjTranslator,
                                  }
                                )
                              }
                              aria-label={`Remove ${entry.title} from watchlist`}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] px-3 py-2 text-xs font-bold text-[#6B7188] hover:border-[#EE1119] hover:text-[#EE1119]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: Community Movie Requests & Upvoting Board */}
          {activeTab === 'requests' && (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Left: Submit Request Form */}
              <form
                onSubmit={(e) => void handleSubmitMovieRequest(e)}
                className="lg:col-span-5 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 space-y-4"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Request Next Upload
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    Ask for a Movie or Luganda VJ
                  </h2>
                  <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0] leading-relaxed">
                    Missing a 2026 release or a specific VJ translation? Post it here so others can upvote it and our admin prioritizes uploading it.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="req-movie-title"
                    className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Movie Title *
                  </label>
                  <input
                    id="req-movie-title"
                    type="text"
                    required
                    minLength={2}
                    maxLength={140}
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Captain America: Brave New World"
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white focus:border-[#EE1119] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="req-movie-vj"
                      className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Preferred VJ / Audio
                    </label>
                    <input
                      id="req-movie-vj"
                      type="text"
                      list="request-vj-list"
                      value={reqVj}
                      onChange={(e) => setReqVj(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3 py-2 text-xs text-[#1A1464] dark:text-white focus:border-[#EE1119] focus:outline-none"
                    />
                    <datalist id="request-vj-list">
                      <option value="VJ Junior (Luganda)" />
                      <option value="VJ Mark (Luganda)" />
                      <option value="VJ Ice P (Luganda)" />
                      <option value="VJ Jingo (Luganda)" />
                      <option value="VJ Emmy (Luganda)" />
                      <option value="Any Luganda VJ" />
                      <option value="Original English Audio" />
                    </datalist>
                  </div>

                  <div>
                    <label
                      htmlFor="req-movie-year"
                      className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      Release Year
                    </label>
                    <input
                      id="req-movie-year"
                      type="text"
                      maxLength={12}
                      value={reqYear}
                      onChange={(e) => setReqYear(e.target.value)}
                      placeholder="2026"
                      className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3 py-2 text-xs text-[#1A1464] dark:text-white focus:border-[#EE1119] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="req-movie-notes"
                    className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Notes (Optional)
                  </label>
                  <textarea
                    id="req-movie-notes"
                    rows={2}
                    maxLength={300}
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Preferred quality (480p Lite / 720p HD) or actor details..."
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] px-3.5 py-2 text-xs text-[#1A1464] dark:text-white focus:border-[#EE1119] focus:outline-none"
                  />
                </div>

                {reqNotice && (
                  <p
                    role="status"
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                      reqNotice.ok
                        ? 'border-[#10B981]/35 bg-[#ECFDF5] dark:bg-[#0D2A24] text-[#065F46] dark:text-[#A7F3D0]'
                        : 'border-[#EE1119]/35 bg-[#EE1119]/10 text-[#EE1119]'
                    }`}
                  >
                    {reqNotice.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={reqBusy}
                  className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  <span>{reqBusy ? 'Submitting Request...' : 'Submit Movie Request'}</span>
                </button>
              </form>

              {/* Right: Live Upvote Board */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                      Top Requested Movies ({movieRequests.length})
                    </h3>
                    <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                      Upvote the films you want uploaded next — fulfilled requests link straight to playback.
                    </p>
                  </div>
                </div>

                {requestsLoading ? (
                  <div className="space-y-3">
                    {[0, 1].map((n) => (
                      <div
                        key={n}
                        className="h-24 animate-pulse rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38]"
                      />
                    ))}
                  </div>
                ) : movieRequests.length === 0 ? (
                  <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-8 text-center">
                    <MessageSquarePlus
                      className="mx-auto h-9 w-9 text-[#EE1119]"
                      aria-hidden="true"
                    />
                    <p className="mt-3 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                      No movie requests yet — be the first!
                    </p>
                    <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                      Submit any Luganda VJ film or 2026 movie on the left and members can vote on it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movieRequests.map((req) => {
                      const hasVoted = votedRequestIds.has(req.requestId);
                      const isOwner = Boolean(user && user.uid === req.authorId);
                      const isFulfilled = req.status === 'fulfilled';
                      const fulfilledCatalogMatch = req.fulfilledMovieId
                        ? movies.find((m) => m.movieId === req.fulfilledMovieId)
                        : undefined;

                      return (
                        <div
                          key={req.requestId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-4 sm:p-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                              {req.vjPreference} · {req.releaseYear || 'Latest'} · By {req.authorName}
                              {isFulfilled ? ' · Fulfilled' : ''}
                            </p>
                            <h4 className="mt-1 font-display text-base sm:text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC] break-words">
                              {req.title}
                            </h4>
                            {req.notes && (
                              <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                                {req.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {isFulfilled && fulfilledCatalogMatch && (
                              <button
                                type="button"
                                onClick={() => void handleWatchMovieModal(fulfilledCatalogMatch)}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#10B981] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#059669]"
                              >
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Watch Now</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => void toggleRequestUpvote(req)}
                              aria-pressed={hasVoted}
                              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                                hasVoted
                                  ? 'border-[#EE1119] bg-[#EE1119] text-white'
                                  : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]'
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="tabular-nums">{req.upvoteCount}</span>
                            </button>

                            {isOwner && !isFulfilled && (
                              <button
                                type="button"
                                onClick={() => void deleteMovieRequest(req.requestId)}
                                aria-label={`Delete request for ${req.title}`}
                                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] px-3 py-2 text-xs font-bold text-[#6B7188] hover:border-[#EE1119] hover:text-[#EE1119]"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Saved Offline in Local Browser Storage */}
          {activeTab === 'offline' && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-5 sm:p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Browser IndexedDB Local Vault
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    Offline Library ({savedMovies.length} Saved Movies)
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                    Movies saved here remain stored locally in your browser so you can watch them even without an active internet connection.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                    Local Video Cache
                  </p>
                  <p className="font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                    {formatBytes(totalLocalBytes)}
                  </p>
                  {storageQuota && storageQuota.quotaBytes > 0 && (
                    <p className="text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
                      Browser quota: {formatBytes(storageQuota.quotaBytes)} available
                    </p>
                  )}
                </div>
              </div>

              {savedMovies.length === 0 ? (
                <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-8 text-center">
                  <HardDrive className="mx-auto h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                  <p className="mt-3 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    No movies saved in your local browser storage yet.
                  </p>
                  <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                    Open the Available Movies tab and click &ldquo;Save to Local Storage&rdquo; on any movie to cache it for offline viewing.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {savedMovies.map((saved) => (
                    <div
                      key={saved.movieId}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5"
                    >
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
                          Stored Offline · {formatBytes(saved.sizeBytes)} · {saved.qualityLabel}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenMovieDetail(saved.movieId)}
                          className="mt-1 text-left font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                        >
                          {saved.title}
                        </button>
                        <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                          {saved.genre || saved.category} · {saved.releaseYear} ·{' '}
                          {saved.language || 'Offline Copy'} ·{' '}
                          {saved.vjTranslator || saved.durationLabel}
                        </p>
                        <p className="mt-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-2">
                          {saved.synopsis}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E5E7F0] dark:border-[#242C54]">
                        <button
                          type="button"
                          onClick={() =>
                            void handleWatchMovieModal({
                              movieId: saved.movieId,
                              title: saved.title,
                              category: (saved.category as MovieCategory) || 'Indie & Regional',
                              genre: saved.genre || saved.category || 'Action',
                              language: saved.language || 'Luganda Translated',
                              vjTranslator: saved.vjTranslator || 'Offline Archive',
                              releaseYear: saved.releaseYear,
                              durationLabel: saved.durationLabel,
                              qualityLabel:
                                (saved.qualityLabel as MovieItem['qualityLabel']) || '480p Lite',
                              fileSizeLabel: saved.fileSizeLabel,
                              synopsis: saved.synopsis,
                              posterUrl: saved.posterUrl,
                              coverArtUrl: saved.coverArtUrl || saved.posterUrl,
                              videoUrl: saved.videoUrl,
                              downloadUrl: saved.downloadUrl || saved.videoUrl,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Play Offline</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenMovieDetail(saved.movieId)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                        >
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleExportSavedOfflineMovie(saved)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Export</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRemoveLocalMovie(saved.movieId, saved.title)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-bold text-[#6B7188] dark:text-[#8E97B8] hover:border-[#EE1119] hover:text-[#EE1119]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Technical Encoding Specs & Roadmap */}
          {activeTab === 'roadmap' && (
            <div className="mt-8 space-y-12">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
                <Reveal direction="right" distance={20} className="lg:col-span-6 flex">
                  <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#120D4A] text-white">
                    <div className="relative aspect-video w-full overflow-hidden bg-[#120D4A]">
                      <img
                        src="/src/assets/images/movies_cinema_hub_1795014042309.jpg"
                        alt="0xDEV digital screening room preview"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#090D1F]/90 via-[#090D1F]/35 to-transparent"
                      />
                      <div className="absolute bottom-4 left-5 right-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                          Encoding Architecture
                        </p>
                        <h3 className="mt-1 font-display text-xl font-extrabold text-white">
                          Built for fast streaming and low-data offline storage.
                        </h3>
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal direction="left" distance={20} className="lg:col-span-6 flex">
                  <div className="relative flex w-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-7">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                        Format Inspector
                      </p>
                      <h3 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        Select quality tier specs
                      </h3>

                      <div
                        role="tablist"
                        aria-label="Preview quality formats"
                        className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-1.5"
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
                              className={`relative rounded-lg px-2.5 py-2 text-xs font-bold transition-colors ${
                                active
                                  ? 'text-white'
                                  : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464]'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="movies-tier-pill"
                                  aria-hidden="true"
                                  transition={SPRING_SNAPPY}
                                  className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F]"
                                />
                              )}
                              <span className="relative z-10">{tier.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-4 space-y-3">
                        <div className="flex items-baseline justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-2">
                          <span className="text-xs font-bold uppercase text-[#6B7188] dark:text-[#8E97B8]">
                            Typical File Size
                          </span>
                          <span className="font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                            {activeTier.sizeRange}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                          {activeTier.bestFor}
                        </p>
                        <dl className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <dt className="inline-flex items-center gap-1.5 text-[#6B7188]">
                              <HardDrive className="h-3.5 w-3.5 text-[#EE1119]" />
                              <span>Codec</span>
                            </dt>
                            <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              {activeTier.codec}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="inline-flex items-center gap-1.5 text-[#6B7188]">
                              <Smartphone className="h-3.5 w-3.5 text-[#EE1119]" />
                              <span>Audio</span>
                            </dt>
                            <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              {activeTier.audio}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="inline-flex items-center gap-1.5 text-[#6B7188]">
                              <Subtitles className="h-3.5 w-3.5 text-[#EE1119]" />
                              <span>Subtitles</span>
                            </dt>
                            <dd className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              {activeTier.subtitles}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="inline-flex items-center gap-1.5 text-[#6B7188]">
                              <ShieldCheck className="h-3.5 w-3.5 text-[#EE1119]" />
                              <span>Integrity</span>
                            </dt>
                            <dd className="font-bold text-[#10B981]">{activeTier.checksum}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {UPCOMING_COLLECTIONS.map((shelf) => {
                  const Icon = shelf.icon;
                  return (
                    <div
                      key={shelf.id}
                      className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#101530] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#F4F6FC]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-bold uppercase text-[#6B7188] dark:text-[#8E97B8]">
                          {shelf.number} · {shelf.meta}
                        </span>
                      </div>
                      <h4 className="mt-4 font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        {shelf.title}
                      </h4>
                      <p className="mt-1.5 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                        {shelf.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Verified Firestore Email Subscription Box */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] border-t border-[#E5E7F0] dark:border-[#242C54] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-7 sm:p-10 shadow-sm">
              <div
                aria-hidden="true"
                className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span>Verified Movie Upload Alerts</span>
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                Get emailed whenever our admin uploads a new movie.
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#4A4F63] dark:text-[#C2C9E0] max-w-2xl">
                Subscribed members receive an instant release email and dashboard notification as soon as a new film is published for streaming or local browser download.
              </p>

              {!user ? (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onRequestAuth?.()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#D00D14]"
                  >
                    <span>Sign In to Subscribe for Movie Emails</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                    Uses your verified 0xDEV account email so alerts never bounce.
                  </p>
                </div>
              ) : !user.emailVerified ? (
                <div className="mt-6 rounded-xl border border-[#EE1119]/35 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-4 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                  Please verify your email address ({user.email}) using the verification bar at the top of the page before subscribing to release emails.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Subscriber Address
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {user.email}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      disabled={subBusy}
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_SNAPPY}
                      onClick={() => void handleToggleSubscription()}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-colors disabled:opacity-60 ${
                        isSubscribed
                          ? 'border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119]'
                          : 'bg-[#EE1119] text-white hover:bg-[#D00D14]'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <BellOff className="h-4 w-4" aria-hidden="true" />
                          <span>{subBusy ? 'Updating...' : 'Unsubscribe Alerts'}</span>
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" aria-hidden="true" />
                          <span>{subBusy ? 'Subscribing...' : 'Subscribe for Movie Emails'}</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {subError && (
                    <p className="text-xs font-semibold text-[#EE1119]">{subError}</p>
                  )}

                  <AnimatePresence>
                    {(justSubscribed || isSubscribed) && (
                      <motion.div
                        role="status"
                        aria-live="polite"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                        className="flex items-center gap-3 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 px-4 py-3 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3.5 w-3.5"
                            fill="none"
                            aria-hidden="true"
                          >
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
                          You are subscribed! <strong>{user.email}</strong> will receive email &amp;
                          dashboard alerts whenever our admin uploads a new movie.
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>
        </>
      )}

      {/* Shared Interactive Theater Video Player Modal */}
      <AnimatePresence>
        {activePlayer && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="movie-player-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D1F]/85 backdrop-blur-sm p-4"
            onClick={closePlayer}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#242C54] bg-[#101530] text-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#242C54] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#EE1119]">
                    {activePlayer.isOfflineBlob
                      ? 'Playing From Local Browser Storage (Offline)'
                      : 'Streaming Online'}
                    {' · '}
                    {activePlayer.meta}
                  </p>
                  <h3
                    id="movie-player-title"
                    className="mt-0.5 font-display text-lg font-extrabold text-white truncate"
                  >
                    {activePlayer.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closePlayer}
                  aria-label="Close movie player"
                  className="rounded-lg border border-white/15 p-2 text-white/80 hover:border-[#EE1119] hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="bg-black">
                <video
                  ref={modalVideoRef}
                  src={activePlayer.srcUrl}
                  poster={
                    activePlayer.posterUrl.startsWith('https://') ||
                    activePlayer.posterUrl.startsWith('/src/assets/images/')
                      ? activePlayer.posterUrl
                      : undefined
                  }
                  controls
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    const seekTo = activePlayer.initialSeekSeconds || 0;
                    if (
                      seekTo >= 5 &&
                      modalSeekAppliedRef.current !== activePlayer.movieId &&
                      Number.isFinite(video.duration) &&
                      seekTo < video.duration - 5
                    ) {
                      modalSeekAppliedRef.current = activePlayer.movieId;
                      video.currentTime = seekTo;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    const movieObj = movies.find((m) => m.movieId === activePlayer.movieId);
                    void recordPlaybackProgress(
                      movieObj || {
                        movieId: activePlayer.movieId,
                        title: activePlayer.title,
                        posterUrl: activePlayer.posterUrl,
                        coverArtUrl: activePlayer.posterUrl,
                      },
                      v.currentTime,
                      v.duration,
                      false
                    );
                  }}
                  onPause={(e) => {
                    const v = e.currentTarget;
                    const movieObj = movies.find((m) => m.movieId === activePlayer.movieId);
                    void recordPlaybackProgress(
                      movieObj || {
                        movieId: activePlayer.movieId,
                        title: activePlayer.title,
                        posterUrl: activePlayer.posterUrl,
                        coverArtUrl: activePlayer.posterUrl,
                      },
                      v.currentTime,
                      v.duration,
                      true
                    );
                  }}
                  onEnded={(e) => {
                    const v = e.currentTarget;
                    const movieObj = movies.find((m) => m.movieId === activePlayer.movieId);
                    void recordPlaybackProgress(
                      movieObj || {
                        movieId: activePlayer.movieId,
                        title: activePlayer.title,
                        posterUrl: activePlayer.posterUrl,
                        coverArtUrl: activePlayer.posterUrl,
                      },
                      v.duration || v.currentTime,
                      v.duration || 1,
                      true
                    );
                  }}
                  onError={() =>
                    setPlayerError(
                      'This video file could not be streamed directly in the browser player. Try Download MP4 to play it in your system media player.'
                    )
                  }
                  className="aspect-video w-full"
                />
              </div>

              <div className="px-5 py-4 space-y-4">
                {playerError && (
                  <p className="rounded-lg border border-[#EE1119]/40 bg-[#EE1119]/15 px-3 py-2 text-xs font-semibold text-white">
                    {playerError}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  {activePlayer.synopsis}
                </p>

                {upNextForActivePlayer.length > 0 && (
                  <div className="border-t border-[#242C54] pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EE1119] mb-2.5">
                      Up Next — Keep Watching
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {upNextForActivePlayer.map((nextMovie) => (
                        <button
                          key={nextMovie.movieId}
                          type="button"
                          onClick={() => void handleWatchMovieModal(nextMovie)}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141A38] p-2.5 text-left hover:border-[#EE1119] transition-colors"
                        >
                          <img
                            src={nextMovie.coverArtUrl || nextMovie.posterUrl}
                            alt={`${nextMovie.title} thumbnail`}
                            referrerPolicy="no-referrer"
                            className="h-12 w-16 shrink-0 rounded-lg object-cover bg-black"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-[#FF8A8E] truncate">
                              {nextMovie.genre} · {nextMovie.releaseYear}
                            </p>
                            <p className="text-xs font-bold text-white truncate">
                              {nextMovie.title}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
