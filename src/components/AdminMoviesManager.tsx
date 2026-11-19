import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  Check,
  Clapperboard,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Globe,
  Info,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import {
  MOVIE_CATEGORIES,
  MOVIE_FIELD_LIMITS,
  MOVIE_GENRES,
  MOVIE_QUALITY_OPTIONS,
  validateMovieSchemaPayload,
} from '../data/movieSchema';
import { VERIFIED_ARCHIVE_MOVIES } from '../data/moviesData';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  MovieCategory,
  MovieItem,
  MovieQualityLabel,
  useMovies,
} from '../hooks/useMovies';
import { buildMovieReleaseEmailHtml } from '../utils/brandedEmailTemplates';
import {
  ArchiveSearchCandidate,
  ArchiveSearchScope,
  ArchiveSortMode,
  fetchInternetArchiveMovieDraft,
  searchInternetArchiveMovies,
} from '../utils/internetArchiveApi';

const POSTER_PRESETS = [
  {
    label: '0xDEV Cinema Screening Room (16:9)',
    value: '/src/assets/images/movies_cinema_hub_1795014042309.jpg',
  },
  {
    label: '0xDEV Documentary Camera Studio (4:3)',
    value: '/src/assets/images/documentary_film_archive_1795014043378.jpg',
  },
];

interface MovieSubscriberRecord {
  subscriberId: string;
  subscriberUid: string;
  email: string;
  subscriberName: string;
  active: boolean;
  createdAtMs: number;
}

interface DispatchSummary {
  movieTitle: string;
  activeCount: number;
  inAppSentCount: number;
  emailMode: 'resend_sent' | 'resend_unconfigured' | 'preview_fallback' | 'no_subscribers';
  emailSentCount: number;
  emailFailedCount: number;
  detailMessage: string;
  mailtoHref?: string;
  emailHtml?: string;
}

export const AdminMoviesManager: React.FC = () => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';

  const { movies } = useMovies(isPrimaryAdmin);
  const [subscribers, setSubscribers] = useState<MovieSubscriberRecord[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showArchiveImporter, setShowArchiveImporter] = useState(true);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [showLiveGuide, setShowLiveGuide] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MovieCategory>('Indie & Regional');
  const [genre, setGenre] = useState<string>('Action');
  const [language, setLanguage] = useState<string>('Luganda Translated');
  const [vjTranslator, setVjTranslator] = useState<string>('VJ Junior');
  const [releaseYear, setReleaseYear] = useState('2026');
  const [durationLabel, setDurationLabel] = useState('1h 28m');
  const [qualityLabel, setQualityLabel] = useState<MovieQualityLabel>('480p Lite');
  const [fileSizeLabel, setFileSizeLabel] = useState('340 MB');
  const [synopsis, setSynopsis] = useState('');
  const [posterPreset, setPosterPreset] = useState<string>(POSTER_PRESETS[0].value);
  const [customPosterUrl, setCustomPosterUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);

  const [saving, setSaving] = useState(false);
  const [syncingStarter, setSyncingStarter] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dispatchSummary, setDispatchSummary] = useState<DispatchSummary | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedCors, setCopiedCors] = useState(false);
  const [previewVideoError, setPreviewVideoError] = useState<string | null>(null);

  // Internet Archive Search & Auto-Import state
  const [archiveQuery, setArchiveQuery] = useState('');
  const [archiveCollection, setArchiveCollection] = useState<ArchiveSearchScope>('luganda_2026');
  const [archiveSort, setArchiveSort] = useState<ArchiveSortMode>('latest');
  const [archiveCandidates, setArchiveCandidates] = useState<ArchiveSearchCandidate[]>([]);
  const [archiveSearching, setArchiveSearching] = useState(false);
  const [hasSearchedArchive, setHasSearchedArchive] = useState(false);
  const [archiveImportingId, setArchiveImportingId] = useState<string | null>(null);
  const [archiveDirectInput, setArchiveDirectInput] = useState('');
  const [importingDirect, setImportingDirect] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isPrimaryAdmin) {
      setSubscribers([]);
      setSubsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'movieSubscribers'),
      (snapshot) => {
        const list: MovieSubscriberRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              subscriberId: String(data.subscriberId || d.id),
              subscriberUid: String(data.subscriberUid || d.id),
              email: String(data.email || ''),
              subscriberName: String(data.subscriberName || 'Movie Subscriber'),
              active: Boolean(data.active),
              createdAtMs:
                data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setSubscribers(list);
        setSubsLoading(false);
      },
      (err) => {
        setSubsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'movieSubscribers');
      }
    );

    return () => unsubscribe();
  }, [isPrimaryAdmin]);

  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => s.active && s.email),
    [subscribers]
  );

  const missingStarterMovies = useMemo(() => {
    const existingIds = new Set(movies.map((m) => m.movieId));
    return VERIFIED_ARCHIVE_MOVIES.filter((starter) => !existingIds.has(starter.movieId));
  }, [movies]);

  if (!isPrimaryAdmin || !user) return null;

  const dispatchNotificationsForMovie = async (moviePayload: {
    movieId: string;
    title: string;
    category: MovieCategory;
    releaseYear: string;
    durationLabel: string;
    qualityLabel: MovieQualityLabel;
    fileSizeLabel: string;
    synopsis: string;
  }): Promise<DispatchSummary> => {
    const activeCount = activeSubscribers.length;
    const baseOrigin =
      typeof window !== 'undefined' && window.location.origin.startsWith('https://')
        ? window.location.origin
        : 'https://0x4dev.netlify.app';
    const moviesPageUrl = `${baseOrigin}/movies/${moviePayload.movieId}`;

    const emailHtml = buildMovieReleaseEmailHtml({
      movieTitle: moviePayload.title,
      category: moviePayload.category,
      releaseYear: moviePayload.releaseYear,
      durationLabel: moviePayload.durationLabel,
      qualityLabel: moviePayload.qualityLabel,
      fileSizeLabel: moviePayload.fileSizeLabel,
      synopsis: moviePayload.synopsis,
      moviesPageUrl,
    });

    if (activeCount === 0) {
      return {
        movieTitle: moviePayload.title,
        activeCount: 0,
        inAppSentCount: 0,
        emailMode: 'no_subscribers',
        emailSentCount: 0,
        emailFailedCount: 0,
        detailMessage:
          'Movie saved, and no active movie subscribers are registered yet. Visitors can subscribe directly on /movies.',
        emailHtml,
      };
    }

    // 1. Write persistent Firestore in-app notifications for every active subscribed user
    let inAppSentCount = 0;
    const senderEmail = (user.email || 'arigyewisdom7@gmail.com').slice(0, 200);
    const notifTitle = `New Movie Uploaded: ${moviePayload.title}`.slice(0, 140);
    const notifBody =
      `${moviePayload.title} (${moviePayload.category} · ${moviePayload.qualityLabel} · ${moviePayload.fileSizeLabel}) is now live on /movies for streaming or offline local storage download.`.slice(
        0,
        2000
      );

    for (let i = 0; i < activeSubscribers.length; i += 400) {
      const chunk = activeSubscribers.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((sub, idx) => {
        const notificationId = `MOVNTF-${Date.now()}-${i + idx}-${Math.floor(100 + Math.random() * 900)}`;
        batch.set(doc(db, 'notifications', notificationId), {
          notificationId,
          recipientId: sub.subscriberUid,
          senderEmail,
          type: 'admin_message',
          title: notifTitle,
          body: notifBody,
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
        inAppSentCount += chunk.length;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'notifications');
      }
    }

    const bccEmails = activeSubscribers.map((s) => s.email).join(',');
    const subject = `New Movie Uploaded on 0xDEV: ${moviePayload.title}`;
    const plainText = [
      `New Movie Uploaded on 0xDEV: ${moviePayload.title}`,
      `${moviePayload.category} · ${moviePayload.releaseYear} · ${moviePayload.durationLabel} · ${moviePayload.qualityLabel} · ${moviePayload.fileSizeLabel}`,
      '',
      moviePayload.synopsis,
      '',
      `Watch online or download to local storage: ${moviesPageUrl}`,
    ].join('\n');
    const mailtoHref = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainText)}`;

    // 2. Call Netlify serverless email function (/.netlify/functions/send-movie-email)
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/send-movie-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          movie: moviePayload,
          subscribers: activeSubscribers.map((s) => ({
            email: s.email,
            name: s.subscriberName,
          })),
          subject,
          html: emailHtml,
          text: plainText,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          movieTitle: moviePayload.title,
          activeCount,
          inAppSentCount,
          emailMode: 'preview_fallback',
          emailSentCount: 0,
          emailFailedCount: 0,
          detailMessage: `Delivered ${inAppSentCount} in-app notifications. Automated email dispatch activates once deployed to Netlify with BREVO_API_KEY or RESEND_API_KEY configured. Use the email app or HTML fallback below right now.`,
          mailtoHref,
          emailHtml,
        };
      }

      const result = (await response.json()) as {
        ok?: boolean;
        configured?: boolean;
        provider?: string;
        sentCount?: number;
        failedCount?: number;
        reason?: string;
        error?: string;
        errors?: string[];
      };

      if (!response.ok) {
        return {
          movieTitle: moviePayload.title,
          activeCount,
          inAppSentCount,
          emailMode: 'preview_fallback',
          emailSentCount: 0,
          emailFailedCount: activeCount,
          detailMessage: `Delivered ${inAppSentCount} in-app notifications, but automated email authentication/delivery returned HTTP ${response.status}: ${
            result.error || result.reason || 'Unexpected server response.'
          } You can still send via your email app below.`,
          mailtoHref,
          emailHtml,
        };
      }

      if (result.configured === false) {
        return {
          movieTitle: moviePayload.title,
          activeCount,
          inAppSentCount,
          emailMode: 'resend_unconfigured',
          emailSentCount: 0,
          emailFailedCount: 0,
          detailMessage:
            result.reason ||
            `Delivered ${inAppSentCount} in-app notifications. Add BREVO_API_KEY or RESEND_API_KEY in Netlify Environment variables to automate direct inbox delivery, or send manually below.`,
          mailtoHref,
          emailHtml,
        };
      }

      const providerLabel = result.provider === 'brevo' ? 'Brevo' : 'Resend';
      const sentCount = result.sentCount || 0;
      const failedCount = result.failedCount || 0;
      const firstErr = result.errors?.[0] ? ` (${result.errors[0]})` : '';
      return {
        movieTitle: moviePayload.title,
        activeCount,
        inAppSentCount,
        emailMode: sentCount > 0 ? 'resend_sent' : 'preview_fallback',
        emailSentCount: sentCount,
        emailFailedCount: failedCount,
        detailMessage:
          sentCount > 0
            ? `Dispatched ${sentCount} release emails via ${providerLabel} and ${inAppSentCount} dashboard notifications.`
            : `Delivered ${inAppSentCount} in-app notifications, but ${providerLabel} returned 0 sent (${failedCount} failed)${firstErr}. Use the email app fallback below.`,
        mailtoHref,
        emailHtml,
      };
    } catch {
      return {
        movieTitle: moviePayload.title,
        activeCount,
        inAppSentCount,
        emailMode: 'preview_fallback',
        emailSentCount: 0,
        emailFailedCount: 0,
        detailMessage: `Delivered ${inAppSentCount} in-app notifications. Netlify Email Function is unavailable in local preview mode; use your email client or HTML template below.`,
        mailtoHref,
        emailHtml,
      };
    }
  };

  const resetForm = () => {
    setEditingMovieId(null);
    setTitle('');
    setCategory('Indie & Regional');
    setGenre('Action');
    setLanguage('Luganda Translated');
    setVjTranslator('VJ Junior');
    setReleaseYear('2026');
    setDurationLabel('1h 28m');
    setQualityLabel('480p Lite');
    setFileSizeLabel('340 MB');
    setSynopsis('');
    setPosterPreset(POSTER_PRESETS[0].value);
    setCustomPosterUrl('');
    setVideoUrl('');
    setPreviewVideoError(null);
    setPublishNow(true);
    setNotifyOnPublish(true);
  };

  const handleStartEditMovie = (movie: MovieItem) => {
    setError(null);
    setFeedback(null);
    setEditingMovieId(movie.movieId);
    setTitle(movie.title);
    setCategory(movie.category);
    setGenre(movie.genre || 'Action');
    setLanguage(movie.language || 'Luganda Translated');
    setVjTranslator(movie.vjTranslator || 'Original Audio');
    setReleaseYear(movie.releaseYear);
    setDurationLabel(movie.durationLabel);
    setQualityLabel(movie.qualityLabel);
    setFileSizeLabel(movie.fileSizeLabel);
    setSynopsis(movie.synopsis);
    const coverArt = movie.coverArtUrl || movie.posterUrl;
    const isPreset = POSTER_PRESETS.some((p) => p.value === coverArt);
    if (isPreset) {
      setPosterPreset(coverArt);
      setCustomPosterUrl('');
    } else {
      setPosterPreset(POSTER_PRESETS[0].value);
      setCustomPosterUrl(coverArt);
    }
    setVideoUrl(movie.downloadUrl || movie.videoUrl);
    setPublishNow(movie.published);
    setNotifyOnPublish(false);
    setShowForm(true);
  };

  const handleUploadMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setDispatchSummary(null);

    const cleanTitle = title.trim().slice(0, MOVIE_FIELD_LIMITS.titleMax);
    const cleanGenre = (genre.trim() || 'Action').slice(0, MOVIE_FIELD_LIMITS.genreMax);
    const cleanLanguage = (language.trim() || 'Luganda Translated').slice(
      0,
      MOVIE_FIELD_LIMITS.languageMax
    );
    const cleanTranslator = (vjTranslator.trim() || 'Original Audio').slice(
      0,
      MOVIE_FIELD_LIMITS.vjTranslatorMax
    );
    const cleanYear = releaseYear.trim().slice(0, MOVIE_FIELD_LIMITS.releaseYearMax);
    const cleanDuration = durationLabel.trim().slice(0, MOVIE_FIELD_LIMITS.durationMax);
    const cleanSize = fileSizeLabel.trim().slice(0, MOVIE_FIELD_LIMITS.fileSizeMax);
    const cleanSynopsis = synopsis.trim().slice(0, MOVIE_FIELD_LIMITS.synopsisMax);
    const cleanDownloadUrl = videoUrl.trim().slice(0, MOVIE_FIELD_LIMITS.downloadMax);
    const cleanCoverArtUrl = (customPosterUrl.trim() || posterPreset).slice(
      0,
      MOVIE_FIELD_LIMITS.coverArtMax
    );

    const validationError = validateMovieSchemaPayload({
      title: cleanTitle,
      releaseYear: cleanYear,
      genre: cleanGenre,
      coverArtUrl: cleanCoverArtUrl,
      downloadUrl: cleanDownloadUrl,
      durationLabel: cleanDuration,
      fileSizeLabel: cleanSize,
      synopsis: cleanSynopsis,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const isEditing = Boolean(editingMovieId);
    const movieId =
      editingMovieId || `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    setSaving(true);

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'movies', movieId), {
          title: cleanTitle,
          category,
          genre: cleanGenre,
          language: cleanLanguage,
          vjTranslator: cleanTranslator,
          releaseYear: cleanYear,
          durationLabel: cleanDuration,
          qualityLabel,
          fileSizeLabel: cleanSize,
          synopsis: cleanSynopsis,
          posterUrl: cleanCoverArtUrl,
          coverArtUrl: cleanCoverArtUrl,
          videoUrl: cleanDownloadUrl,
          downloadUrl: cleanDownloadUrl,
          published: publishNow,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'movies', movieId), {
          movieId,
          title: cleanTitle,
          category,
          genre: cleanGenre,
          language: cleanLanguage,
          vjTranslator: cleanTranslator,
          releaseYear: cleanYear,
          durationLabel: cleanDuration,
          qualityLabel,
          fileSizeLabel: cleanSize,
          synopsis: cleanSynopsis,
          posterUrl: cleanCoverArtUrl,
          coverArtUrl: cleanCoverArtUrl,
          videoUrl: cleanDownloadUrl,
          downloadUrl: cleanDownloadUrl,
          published: publishNow,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (publishNow && notifyOnPublish) {
        try {
          const summary = await dispatchNotificationsForMovie({
            movieId,
            title: cleanTitle,
            category,
            releaseYear: cleanYear,
            durationLabel: cleanDuration,
            qualityLabel,
            fileSizeLabel: cleanSize,
            synopsis: cleanSynopsis,
          });
          setDispatchSummary(summary);
        } catch {
          setError(
            `"${cleanTitle}" was saved, but subscriber alerts encountered a delivery error. Click Notify on the card below to retry.`
          );
        }
      }

      resetForm();
      setShowForm(false);
      setFeedback(
        isEditing
          ? `Updated "${cleanTitle}" details.`
          : publishNow
            ? `"${cleanTitle}" is now live on /movies/${movieId} for viewing and offline local storage downloads.`
            : `"${cleanTitle}" saved as an unpublished admin draft.`
      );
    } catch (err) {
      setError('Unable to save movie to database right now. Please verify all fields.');
      handleFirestoreError(
        err,
        isEditing ? OperationType.UPDATE : OperationType.CREATE,
        `movies/${movieId}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (movie: MovieItem) => {
    try {
      await updateDoc(doc(db, 'movies', movie.movieId), {
        published: !movie.published,
        updatedAt: serverTimestamp(),
      });
      setFeedback(
        !movie.published
          ? `"${movie.title}" is now published publicly on /movies.`
          : `"${movie.title}" moved to draft status.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `movies/${movie.movieId}`);
    }
  };

  const handleNotifyExisting = async (movie: MovieItem) => {
    setNotifyingId(movie.movieId);
    setError(null);
    try {
      const summary = await dispatchNotificationsForMovie(movie);
      setDispatchSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send movie notifications.');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleDeleteMovie = async (movie: MovieItem) => {
    try {
      await deleteDoc(doc(db, 'movies', movie.movieId));
      setFeedback(`Removed "${movie.title}" from the catalog.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `movies/${movie.movieId}`);
    }
  };

  const handleCopyEmailHtml = async (html: string) => {
    try {
      await navigator.clipboard.writeText(html);
      setCopiedHtml(true);
      window.setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const applyResolvedArchiveDraft = (
    draft: Awaited<ReturnType<typeof fetchInternetArchiveMovieDraft>>
  ) => {
    setEditingMovieId(null);
    setTitle(draft.title);
    setCategory(draft.category);
    setGenre(draft.genre);
    setLanguage(draft.language);
    setVjTranslator(draft.vjTranslator);
    setReleaseYear(draft.releaseYear);
    setDurationLabel(draft.durationLabel);
    setQualityLabel(draft.qualityLabel);
    setFileSizeLabel(draft.fileSizeLabel);
    setSynopsis(draft.synopsis);
    setPosterPreset(POSTER_PRESETS[0].value);
    setCustomPosterUrl(draft.posterUrl);
    setVideoUrl(draft.videoUrl);
    setPublishNow(true);
    setNotifyOnPublish(true);
    setShowForm(true);
    setFeedback(
      `Auto-filled "${draft.title}" (${draft.genre} · ${draft.language} · ${draft.fileSizeLabel}) from Internet Archive. Review details below and click Save Movie Release to publish.`
    );
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const runArchiveSearch = async (
    queryOverride: string,
    scopeOverride: ArchiveSearchScope,
    sortOverride: ArchiveSortMode
  ) => {
    setError(null);
    setArchiveSearching(true);
    setHasSearchedArchive(true);
    try {
      const results = await searchInternetArchiveMovies(queryOverride, scopeOverride, sortOverride);
      setArchiveCandidates(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to search Internet Archive right now.'
      );
    } finally {
      setArchiveSearching(false);
    }
  };

  const handleSearchArchive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await runArchiveSearch(archiveQuery, archiveCollection, archiveSort);
  };

  const handleImportCandidate = async (candidate: ArchiveSearchCandidate) => {
    setError(null);
    setFeedback(null);
    setArchiveImportingId(candidate.identifier);
    try {
      const draft = await fetchInternetArchiveMovieDraft(candidate.identifier);
      applyResolvedArchiveDraft(draft);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not resolve an MP4 stream from "${candidate.title}".`
      );
    } finally {
      setArchiveImportingId(null);
    }
  };

  const handleDirectArchiveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    if (!archiveDirectInput.trim()) {
      setError('Paste an Internet Archive item URL or identifier first.');
      return;
    }
    setImportingDirect(true);
    try {
      const draft = await fetchInternetArchiveMovieDraft(archiveDirectInput);
      applyResolvedArchiveDraft(draft);
      setArchiveDirectInput('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load MP4 metadata from that Internet Archive item.'
      );
    } finally {
      setImportingDirect(false);
    }
  };

  const handleSyncStarterCatalog = async () => {
    if (missingStarterMovies.length === 0) return;
    setError(null);
    setFeedback(null);
    setSyncingStarter(true);
    try {
      for (let i = 0; i < missingStarterMovies.length; i += 400) {
        const chunk = missingStarterMovies.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          batch.set(doc(db, 'movies', item.movieId), {
            movieId: item.movieId,
            title: item.title,
            category: item.category,
            genre: item.genre,
            language: item.language,
            vjTranslator: item.vjTranslator,
            releaseYear: item.releaseYear,
            durationLabel: item.durationLabel,
            qualityLabel: item.qualityLabel,
            fileSizeLabel: item.fileSizeLabel,
            synopsis: item.synopsis,
            posterUrl: item.coverArtUrl,
            coverArtUrl: item.coverArtUrl,
            videoUrl: item.downloadUrl,
            downloadUrl: item.downloadUrl,
            published: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      setFeedback(
        `Synced ${missingStarterMovies.length} verified Luganda & public archive movies into your Firestore catalog.`
      );
    } catch (err) {
      setError('Failed to sync starter Archive catalog to database.');
      handleFirestoreError(err, OperationType.WRITE, 'movies');
    } finally {
      setSyncingStarter(false);
    }
  };

  return (
    <section
      aria-labelledby="admin-movies-heading"
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119] flex items-center gap-1.5">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
            <span>Admin Movies &amp; Internet Archive CMS</span>
          </p>
          <h2
            id="admin-movies-heading"
            className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
          >
            Movie Catalog Publisher ({movies.length} Managed Titles)
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
            Import public-domain films or your own archive.org uploads in one click, cache full MP4s into visitors&apos; local browser storage, and email active subscribers automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowArchiveImporter((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors ${
              showArchiveImporter
                ? 'border-[#EE1119] bg-[#EE1119]/10 text-[#EE1119]'
                : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>{showArchiveImporter ? 'Hide Archive.org Importer' : 'Import from Archive.org'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLiveGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3.5 py-2.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
          >
            <Info className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>{showLiveGuide ? 'Hide Guide' : 'Upload Guide'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
          >
            <Plus className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>{showForm ? 'Close Movie Form' : 'Add Movie Manually'}</span>
          </button>
        </div>
      </div>

      {/* Live Subscriber Stats Strip */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8] flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>Active Email Subscribers</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
            {subsLoading ? '...' : activeSubscribers.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8] flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>Public Catalog Status</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
            {movies.filter((m) => m.published).length} Firestore + {VERIFIED_ARCHIVE_MOVIES.length} Live
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8] flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
            <span>Hosting &amp; Offline Sync</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
            Archive.org Proxy + Brevo / Resend Email
          </p>
        </div>
      </div>

      {/* Internet Archive 1-Click Search & Import Studio */}
      {showArchiveImporter && (
        <div className="mt-5 rounded-xl border border-[#1A1464]/15 dark:border-[#3A437A] bg-[#F6F7FB] dark:bg-[#101530] p-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#EE1119] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Internet Archive 1-Click Auto-Importer</span>
              </p>
              <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                Search open-access films or paste any <code className="font-mono">archive.org/details/...</code> upload link to automatically pull the poster, synopsis, runtime, file size, and MP4 URL.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {missingStarterMovies.length > 0 && (
                <button
                  type="button"
                  disabled={syncingStarter}
                  onClick={() => void handleSyncStarterCatalog()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] disabled:opacity-60"
                >
                  {syncingStarter ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Database className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                  )}
                  <span>
                    {syncingStarter
                      ? 'Syncing...'
                      : `Sync ${missingStarterMovies.length} Starter Films to DB`}
                  </span>
                </button>
              )}

              <a
                href="https://archive.org/upload/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
              >
                <UploadCloud className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span>Upload Your Own on Archive.org</span>
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Direct Paste Archive.org URL or ID */}
          <form
            onSubmit={handleDirectArchiveImport}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <label htmlFor="ia-direct-import" className="sr-only">
              Paste Internet Archive details URL or item identifier
            </label>
            <input
              id="ia-direct-import"
              type="text"
              value={archiveDirectInput}
              onChange={(e) => setArchiveDirectInput(e.target.value)}
              placeholder="Paste https://archive.org/details/your-upload or item ID (e.g. BigBuckBunny_328)"
              className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-mono text-[#1A1464] dark:text-white"
            />
            <button
              type="submit"
              disabled={importingDirect}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60 shrink-0"
            >
              {importingDirect ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{importingDirect ? 'Resolving MP4...' : 'Auto-Fill MP4'}</span>
            </button>
          </form>

          {/* Quick 2026 & Latest Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7F0] dark:border-[#242C54]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8] mr-1">
              Quick Target:
            </span>
            {(
              [
                { label: '2026 Luganda Movies', query: '', scope: 'luganda_2026', sort: 'latest' },
                { label: 'VJ Junior 2026', query: 'VJ Junior', scope: 'luganda_2026', sort: 'latest' },
                { label: 'VJ Ice P 2026', query: 'VJ Ice P', scope: 'luganda_2026', sort: 'latest' },
                { label: 'VJ Emmy 2026', query: 'VJ Emmy', scope: 'luganda_2026', sort: 'latest' },
                { label: 'VJ Mande 2026', query: 'VJ Mande', scope: 'luganda_2026', sort: 'latest' },
                { label: '2026 Open Films', query: '', scope: 'latest_2026', sort: 'latest' },
              ] as {
                label: string;
                query: string;
                scope: ArchiveSearchScope;
                sort: ArchiveSortMode;
              }[]
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={archiveSearching}
                onClick={() => {
                  setArchiveQuery(preset.query);
                  setArchiveCollection(preset.scope);
                  setArchiveSort(preset.sort);
                  void runArchiveSearch(preset.query, preset.scope, preset.sort);
                }}
                className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search Public Archive Catalog */}
          <form
            onSubmit={handleSearchArchive}
            className="grid grid-cols-1 gap-2 sm:grid-cols-12"
          >
            <div className="sm:col-span-5 relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7188]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={archiveQuery}
                onChange={(e) => setArchiveQuery(e.target.value)}
                aria-label="Search Internet Archive movies"
                placeholder="Search 2026 releases, VJ Junior, VJ Mark, Ice P, Action..."
                className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] pl-9 pr-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={archiveCollection}
                onChange={(e) => setArchiveCollection(e.target.value as ArchiveSearchScope)}
                aria-label="Filter Internet Archive collection"
                className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                <option value="luganda_2026">2026 &amp; Latest Luganda (VJ)</option>
                <option value="latest_2026">2026 &amp; Latest Open Movies</option>
                <option value="luganda">All Luganda Translated (VJ)</option>
                <option value="all">All Free Movie Collections</option>
                <option value="feature_films">Feature Films (Public Domain)</option>
                <option value="opensource_movies">Open Source &amp; Indie Movies</option>
                <option value="computerchronicles">Tech &amp; Computer History</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={archiveSort}
                onChange={(e) => setArchiveSort(e.target.value as ArchiveSortMode)}
                aria-label="Sort Internet Archive search results"
                className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                <option value="latest">Latest First</option>
                <option value="downloads">Most Downloaded</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={archiveSearching}
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] disabled:opacity-60"
            >
              {archiveSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{archiveSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </form>

          {hasSearchedArchive && (
            <div className="space-y-3">
              {archiveCandidates.length === 0 && !archiveSearching ? (
                <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  No MP4 candidates matched that query. Try broader keywords like &ldquo;classic&rdquo;, &ldquo;space&rdquo;, or leave the search blank to browse top-downloaded films.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {archiveCandidates.map((candidate) => (
                    <div
                      key={candidate.identifier}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3"
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#1A1464] flex items-center justify-center">
                          <Film className="h-5 w-5 text-white/40" aria-hidden="true" />
                          <img
                            src={candidate.posterUrl}
                            alt={candidate.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-[#EE1119] truncate">
                            {candidate.year} · {candidate.collectionHint}
                          </p>
                          <p className="mt-0.5 text-xs font-extrabold text-[#1A1464] dark:text-[#F4F6FC] line-clamp-2">
                            {candidate.title}
                          </p>
                          <p className="mt-1 text-[11px] text-[#6B7188] dark:text-[#8E97B8] line-clamp-2">
                            {candidate.synopsis}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-[#E5E7F0] dark:border-[#242C54] pt-2">
                        <a
                          href={`https://archive.org/details/${encodeURIComponent(candidate.identifier)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white inline-flex items-center gap-1"
                        >
                          <span>Source</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>

                        <button
                          type="button"
                          disabled={archiveImportingId === candidate.identifier}
                          onClick={() => void handleImportCandidate(candidate)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#EE1119] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
                        >
                          {archiveImportingId === candidate.identifier ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          )}
                          <span>
                            {archiveImportingId === candidate.identifier
                              ? 'Loading MP4...'
                              : 'Load Into Form'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline Upload & Deployment Guide */}
      {showLiveGuide && (
        <div className="mt-5 rounded-xl border border-[#1A1464]/20 dark:border-[#3A437A] bg-[#F6F7FB] dark:bg-[#101530] p-5 text-xs sm:text-sm space-y-3 text-[#4A4F63] dark:text-[#C2C9E0]">
          <p className="font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC] flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
            <span>How Movie Hosting, Offline Caching &amp; Emails Work with Internet Archive</span>
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Free Unlimited Storage via Archive.org:</strong> Six curated public-domain &amp; Creative Commons films are already live on <code className="font-mono text-xs">/movies</code>. To add more, use the <strong>Search</strong> box above to import thousands of public films automatically, or upload your own <code className="font-mono text-xs">.mp4</code> on{' '}
              <a
                href="https://archive.org/upload/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#EE1119] underline"
              >
                archive.org/upload
              </a>{' '}
              and paste its link into <strong>Auto-Fill MP4</strong>.
            </li>
            <li>
              <strong>Automatic Local Storage Caching on Netlify:</strong> Internet Archive media CDN nodes strip CORS headers on redirects. Our Netlify function at <code className="font-mono text-xs">/.netlify/functions/archive-video-chunk</code> automatically bridges 3 MB byte-range chunks so visitors can save full MP4 copies inside browser IndexedDB once deployed to <code className="font-mono text-xs">https://0x4dev.netlify.app</code>.
            </li>
            <li>
              <strong>Automated Subscriber Emails (Brevo Free Tier):</strong> In your Netlify project settings under <strong>Environment variables</strong>, add <code className="font-mono text-xs">BREVO_API_KEY</code> (free 300 emails/day, no custom domain needed) and redeploy. Publishing a movie will immediately email every active subscriber on <code className="font-mono text-xs">/movies</code>.
            </li>
          </ol>
          <div className="pt-1">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(
                      [
                        {
                          AllowedOrigins: ['https://0x4dev.netlify.app', '*'],
                          AllowedMethods: ['GET', 'HEAD'],
                          AllowedHeaders: ['*'],
                          MaxAgeSeconds: 3600,
                        },
                      ],
                      null,
                      2
                    )
                  );
                  setCopiedCors(true);
                  window.setTimeout(() => setCopiedCors(false), 3000);
                } catch {
                  // Ignore clipboard failure
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
            >
              {copiedCors ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                  <span>Copied Optional R2 CORS JSON</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                  <span>Copy Optional R2 CORS Policy JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 p-3.5 text-xs font-semibold text-[#065F46] dark:text-[#A7F3D0]"
        >
          {feedback}
        </div>
      )}

      {dispatchSummary && (
        <div className="mt-4 rounded-xl border border-[#1A1464]/20 dark:border-[#3A437A] bg-[#F6F7FB] dark:bg-[#101530] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
              Subscriber Notification Summary · {dispatchSummary.movieTitle}
            </p>
            <span className="text-xs font-bold text-[#10B981]">
              {dispatchSummary.inAppSentCount} In-App · {dispatchSummary.emailSentCount} Sent Emails
            </span>
          </div>
          <p className="text-xs text-[#4A4F63] dark:text-[#C2C9E0] leading-relaxed">
            {dispatchSummary.detailMessage}
          </p>
          {(dispatchSummary.mailtoHref || dispatchSummary.emailHtml) && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {dispatchSummary.mailtoHref && dispatchSummary.activeCount > 0 && (
                <a
                  href={dispatchSummary.mailtoHref}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#EE1119] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Email App (BCC {dispatchSummary.activeCount} Subscribers)</span>
                </a>
              )}
              {dispatchSummary.emailHtml && (
                <button
                  type="button"
                  onClick={() => void handleCopyEmailHtml(dispatchSummary.emailHtml!)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                      <span>Copied Branded HTML</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>Copy Release Email HTML</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleUploadMovie}
          className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="movie-cms-title"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Movie Title *
              </label>
              <input
                id="movie-cms-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Builders of East Africa: Open Infrastructure"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-sm text-[#1A1464] dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="movie-cms-category"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Category *
              </label>
              <select
                id="movie-cms-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MovieCategory)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                {MOVIE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="movie-cms-genre"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Genre *
              </label>
              <select
                id="movie-cms-genre"
                value={genre || 'Action'}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                {genre &&
                  !MOVIE_GENRES.includes(genre as (typeof MOVIE_GENRES)[number]) && (
                    <option value={genre}>{genre}</option>
                  )}
                {MOVIE_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="movie-cms-language"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Audio Language
              </label>
              <input
                id="movie-cms-language"
                type="text"
                list="movie-language-options"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Luganda Translated"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
              <datalist id="movie-language-options">
                <option value="Luganda Translated" />
                <option value="English" />
                <option value="Luganda & English" />
              </datalist>
            </div>

            <div>
              <label
                htmlFor="movie-cms-translator"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                VJ / Narrator
              </label>
              <input
                id="movie-cms-translator"
                type="text"
                list="movie-translator-options"
                value={vjTranslator}
                onChange={(e) => setVjTranslator(e.target.value)}
                placeholder="VJ Junior"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
              <datalist id="movie-translator-options">
                <option value="VJ Junior" />
                <option value="VJ Mark" />
                <option value="VJ Ice P" />
                <option value="VJ Jingo" />
                <option value="VJ Emmy" />
                <option value="VJ Saul" />
                <option value="Original Audio" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label
                htmlFor="movie-cms-year"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Release Year *
              </label>
              <input
                id="movie-cms-year"
                type="text"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2024"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="movie-cms-duration"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Duration *
              </label>
              <input
                id="movie-cms-duration"
                type="text"
                value={durationLabel}
                onChange={(e) => setDurationLabel(e.target.value)}
                placeholder="1h 28m"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="movie-cms-quality"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Quality *
              </label>
              <select
                id="movie-cms-quality"
                value={qualityLabel}
                onChange={(e) => setQualityLabel(e.target.value as MovieQualityLabel)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                {MOVIE_QUALITY_OPTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="movie-cms-size"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Download Size *
              </label>
              <input
                id="movie-cms-size"
                type="text"
                value={fileSizeLabel}
                onChange={(e) => setFileSizeLabel(e.target.value)}
                placeholder="340 MB"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="movie-cms-video"
              className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
            >
              Direct HTTPS Video File URL (MP4 / WebM) *
            </label>
            <input
              id="movie-cms-video"
              type="url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setPreviewVideoError(null);
              }}
              placeholder="https://cdn.example.com/movies/film-720p.mp4"
              className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-mono text-[#1A1464] dark:text-white"
            />
            <p className="mt-1 text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
              Must start with https://. Any <code className="font-mono">archive.org/download/...</code> MP4 URL automatically works for both streaming and local IndexedDB offline storage on Netlify via our chunk proxy.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="movie-cms-poster-preset"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Poster Image Preset
              </label>
              <select
                id="movie-cms-poster-preset"
                value={posterPreset}
                onChange={(e) => setPosterPreset(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              >
                {POSTER_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="movie-cms-poster-custom"
                className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Or Custom HTTPS Poster URL (Optional)
              </label>
              <input
                id="movie-cms-poster-custom"
                type="url"
                value={customPosterUrl}
                onChange={(e) => setCustomPosterUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="movie-cms-synopsis"
              className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]"
            >
              Movie Synopsis *
            </label>
            <textarea
              id="movie-cms-synopsis"
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Write a concise description of the film, filmmakers, or documentary focus (10+ chars)..."
              className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs text-[#1A1464] dark:text-white"
            />
          </div>

          {videoUrl.trim().startsWith('https://') && (
            <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                Live Video Source Check
              </p>
              <video
                src={videoUrl.trim()}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={() => setPreviewVideoError(null)}
                onError={() =>
                  setPreviewVideoError(
                    'Preview player could not load metadata for this URL yet. Double-check the direct .mp4 link before saving.'
                  )
                }
                className="aspect-video w-full max-w-md rounded-lg bg-black"
              />
              {previewVideoError && (
                <p className="text-xs font-semibold text-[#EE1119]">{previewVideoError}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-[#E5E7F0] dark:border-[#242C54] pt-4">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                  className="h-4 w-4 accent-[#EE1119]"
                />
                <span>Publish immediately on /movies</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnPublish}
                  disabled={!publishNow}
                  onChange={(e) => setNotifyOnPublish(e.target.checked)}
                  className="h-4 w-4 accent-[#EE1119]"
                />
                <span>
                  Email &amp; alert {activeSubscribers.length} subscribed users
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
            >
              <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {saving
                  ? 'Saving Release...'
                  : editingMovieId
                    ? 'Update Movie Details'
                    : 'Save Movie Release'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Uploaded Movies Management List */}
      <div className="mt-6 space-y-4">
        {movies.length === 0 ? (
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
            No custom Firestore movies synced yet ({VERIFIED_ARCHIVE_MOVIES.length} curated Luganda &amp; classic Archive.org films are already live on /movies). Click &ldquo;Sync {missingStarterMovies.length} Starter Films to DB&rdquo; or search Archive.org above to manage and email subscribers.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {movies.map((movie) => (
              <div
                key={movie.movieId}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#EE1119]">
                    {movie.genre} · {movie.releaseYear} · {movie.language} · {movie.vjTranslator}
                  </p>
                  <p className="mt-0.5 font-display text-sm font-extrabold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                    {movie.title}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8] line-clamp-2">
                    {movie.synopsis}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7F0] dark:border-[#242C54]">
                  <span
                    className={`text-[11px] font-bold ${
                      movie.published ? 'text-[#10B981]' : 'text-[#6B7188] dark:text-[#8E97B8]'
                    }`}
                  >
                    {movie.published ? 'Published on /movies' : 'Draft (Hidden)'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {movie.published && (
                      <button
                        type="button"
                        disabled={notifyingId === movie.movieId}
                        onClick={() => void handleNotifyExisting(movie)}
                        title="Send email & dashboard alert to active subscribers"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60"
                      >
                        <Send className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {notifyingId === movie.movieId ? 'Sending...' : 'Notify'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEditMovie(movie)}
                      aria-label={`Edit ${movie.title}`}
                      title="Edit Movie"
                      className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-1.5 text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleTogglePublished(movie)}
                      aria-label={
                        movie.published ? `Unpublish ${movie.title}` : `Publish ${movie.title}`
                      }
                      title={movie.published ? 'Move to Draft' : 'Publish Movie'}
                      className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-1.5 text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119]"
                    >
                      {movie.published ? (
                        <Eye className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteMovie(movie)}
                      aria-label={`Delete ${movie.title}`}
                      className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-1.5 text-[#6B7188] dark:text-[#8E97B8] hover:border-[#EE1119] hover:text-[#EE1119]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscriber Directory Preview */}
      {activeSubscribers.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
            Active Release Email List ({activeSubscribers.length})
          </p>
          <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8] break-words">
            {activeSubscribers.map((s) => `${s.subscriberName} <${s.email}>`).join(' · ')}
          </p>
        </div>
      )}
    </section>
  );
};
