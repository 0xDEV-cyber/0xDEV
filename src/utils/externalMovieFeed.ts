import { User } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  inferCategoryFallbackGenre,
  inferTranslatorFromText,
  MOVIE_FIELD_LIMITS,
  MovieItem,
  normalizeMovieRecord,
  validateMovieSchemaPayload,
} from '../data/movieSchema';
import { db } from '../firebase';
import { buildMovieReleaseEmailHtml } from './brandedEmailTemplates';
import {
  ArchiveSearchScope,
  cleanArchiveMovieTitle,
  extractArchiveIdentifier,
  fetchInternetArchiveMovieDraft,
  isRealMovieTitle,
  searchCustomArchiveSource,
  searchInternetArchiveMovies,
} from './internetArchiveApi';

export type ExternalFeedKind =
  | 'archive_query'
  | 'archive_uploader'
  | 'archive_collection'
  | 'peertube'
  | 'rss';

export interface ExternalFeedSource {
  id: string;
  label: string;
  kind: ExternalFeedKind;
  urlOrQuery: string;
  enabled: boolean;
  builtIn?: boolean;
}

export interface AutoSyncSettings {
  autoSyncToFirestore: boolean;
  autoNotifySubscribers: boolean;
  pollIntervalMinutes: number;
}

export interface DiscoveredExternalMovie extends MovieItem {
  sourceLabel: string;
  sourceUrl: string;
  archiveIdentifier?: string;
  discoveredAtMs: number;
}

export interface ExternalFeedDiscoveryResult {
  movies: DiscoveredExternalMovie[];
  checkedAtMs: number;
  fromCache: boolean;
  sourceErrors: string[];
}

export interface AutoFirestoreSyncResult {
  syncedCount: number;
  syncedMovies: DiscoveredExternalMovie[];
  notifiedCount: number;
  emailSentCount: number;
  checkedAtMs: number;
  message: string;
}

const SOURCES_STORAGE_KEY = '0xdev_external_feed_sources_v1';
const SETTINGS_STORAGE_KEY = '0xdev_external_sync_settings_v1';
const FEED_CACHE_STORAGE_KEY = '0xdev_external_movie_feed_cache_v2';
const LEGACY_FEED_CACHE_KEY = '0xdev_external_movie_feed_cache_v1';
const DEFAULT_FALLBACK_POSTER = '/src/assets/images/movies_cinema_hub_1795014042309.jpg';

export const EXTERNAL_FEED_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESOLVED_ITEM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours per resolved item

export const DEFAULT_EXTERNAL_SOURCES: ExternalFeedSource[] = [
  {
    id: 'ia-luganda-2026',
    label: 'Internet Archive · 2026 & Latest Luganda (VJ)',
    kind: 'archive_query',
    urlOrQuery: 'luganda_2026',
    enabled: true,
    builtIn: true,
  },
  {
    id: 'ia-open-2026',
    label: 'Internet Archive · 2026 & Latest Open Cinema',
    kind: 'archive_query',
    urlOrQuery: 'latest_2026',
    enabled: true,
    builtIn: true,
  },
];

export const DEFAULT_AUTO_SYNC_SETTINGS: AutoSyncSettings = {
  autoSyncToFirestore: true,
  autoNotifySubscribers: true,
  pollIntervalMinutes: 10,
};

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode storage errors
  }
}

export function getExternalFeedSources(): ExternalFeedSource[] {
  const saved = readStorageJson<ExternalFeedSource[] | null>(SOURCES_STORAGE_KEY, null);
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_EXTERNAL_SOURCES;
  }
  const byId = new Map(saved.map((s) => [s.id, s]));
  const merged: ExternalFeedSource[] = DEFAULT_EXTERNAL_SOURCES.map((def) => {
    const existing = byId.get(def.id);
    return existing ? { ...def, enabled: existing.enabled } : def;
  });
  saved.forEach((s) => {
    if (!s.builtIn && s.id && s.urlOrQuery) {
      merged.push(s);
    }
  });
  return merged;
}

export function saveExternalFeedSources(sources: ExternalFeedSource[]): void {
  writeStorageJson(SOURCES_STORAGE_KEY, sources);
}

export function getAutoSyncSettings(): AutoSyncSettings {
  const saved = readStorageJson<Partial<AutoSyncSettings> | null>(SETTINGS_STORAGE_KEY, null);
  return {
    autoSyncToFirestore:
      typeof saved?.autoSyncToFirestore === 'boolean'
        ? saved.autoSyncToFirestore
        : DEFAULT_AUTO_SYNC_SETTINGS.autoSyncToFirestore,
    autoNotifySubscribers:
      typeof saved?.autoNotifySubscribers === 'boolean'
        ? saved.autoNotifySubscribers
        : DEFAULT_AUTO_SYNC_SETTINGS.autoNotifySubscribers,
    pollIntervalMinutes:
      typeof saved?.pollIntervalMinutes === 'number' && saved.pollIntervalMinutes >= 5
        ? saved.pollIntervalMinutes
        : DEFAULT_AUTO_SYNC_SETTINGS.pollIntervalMinutes,
  };
}

export function saveAutoSyncSettings(settings: AutoSyncSettings): void {
  writeStorageJson(SETTINGS_STORAGE_KEY, settings);
}

export function parseCustomExternalSourceInput(
  rawUrlOrQuery: string,
  customLabel?: string
): ExternalFeedSource {
  const input = rawUrlOrQuery.trim();
  if (!input) {
    throw new Error('Enter an Archive.org URL, PeerTube site, or RSS/JSON feed URL.');
  }

  let label = (customLabel || '').trim();

  // Archive.org uploader (@username) or collection (/details/<name>)
  const iaUploaderMatch = input.match(/archive\.org\/details\/@([^/?#]+)/i);
  if (iaUploaderMatch?.[1]) {
    const username = decodeURIComponent(iaUploaderMatch[1]).replace(/[^a-zA-Z0-9._-]/g, '');
    return {
      id: `src-ia-user-${username.toLowerCase()}`,
      label: label || `Archive.org Uploader (@${username})`,
      kind: 'archive_uploader',
      urlOrQuery: `uploader:${username} OR creator:${username}`,
      enabled: true,
    };
  }

  const iaDetailsMatch = input.match(/archive\.org\/details\/([^/?#]+)/i);
  if (iaDetailsMatch?.[1]) {
    const col = decodeURIComponent(iaDetailsMatch[1]).replace(/[^a-zA-Z0-9._-]/g, '');
    return {
      id: `src-ia-col-${col.toLowerCase()}`,
      label: label || `Archive.org Collection (${col})`,
      kind: 'archive_collection',
      urlOrQuery: `collection:${col}`,
      enabled: true,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    // Treat plain keywords as an Internet Archive live query
    const slug = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    return {
      id: `src-ia-kw-${slug || Date.now()}`,
      label: label || `Archive.org Watch: ${input}`,
      kind: 'archive_collection',
      urlOrQuery: input,
      enabled: true,
    };
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('External site feed URLs must use https://.');
  }

  const lowerHref = parsedUrl.href.toLowerCase();
  const isRssLike =
    lowerHref.endsWith('.xml') ||
    lowerHref.endsWith('.rss') ||
    lowerHref.includes('/rss') ||
    lowerHref.includes('/feed') ||
    lowerHref.endsWith('.atom');

  if (!label) {
    label = `${parsedUrl.hostname.replace(/^www\./, '')}`;
  }

  if (!isRssLike && (lowerHref.includes('/api/v1/videos') || parsedUrl.pathname === '/' || parsedUrl.pathname === '')) {
    return {
      id: `src-pt-${makeSafeIdFragment(parsedUrl.hostname)}-${Date.now().toString(36)}`,
      label: `${label} (Video Feed)`,
      kind: 'peertube',
      urlOrQuery: parsedUrl.origin,
      enabled: true,
    };
  }

  return {
    id: `src-rss-${makeSafeIdFragment(parsedUrl.hostname)}-${Date.now().toString(36)}`,
    label,
    kind: 'rss',
    urlOrQuery: parsedUrl.href,
    enabled: true,
  };
}

function makeSafeIdFragment(input: string): string {
  const cleaned = String(input || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return cleaned || `item-${Date.now()}`;
}

function hashShort(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeTitleMatchKey(title: string, year?: string): string {
  const cleanTitle = String(title || '')
    .toLowerCase()
    .replace(/\[.*?\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return year ? `${cleanTitle}::${year.trim()}` : cleanTitle;
}

export function getCatalogDedupeKeys(movies: MovieItem[]): {
  movieIds: Set<string>;
  archiveIds: Set<string>;
  titleKeys: Set<string>;
  videoUrls: Set<string>;
} {
  const movieIds = new Set<string>();
  const archiveIds = new Set<string>();
  const titleKeys = new Set<string>();
  const videoUrls = new Set<string>();

  for (const m of movies) {
    movieIds.add(m.movieId);
    const dl = m.downloadUrl || m.videoUrl;
    if (dl) {
      videoUrls.add(dl);
      const iaId = extractArchiveIdentifier(dl);
      if (iaId) archiveIds.add(iaId);
    }
    if (m.posterUrl) {
      const iaPosterId = extractArchiveIdentifier(m.posterUrl);
      if (iaPosterId) archiveIds.add(iaPosterId);
    }
    titleKeys.add(normalizeTitleMatchKey(m.title));
  }

  return { movieIds, archiveIds, titleKeys, videoUrls };
}

export function mergeCatalogWithExternalMovies(
  baseMovies: MovieItem[],
  externalMovies: DiscoveredExternalMovie[]
): {
  merged: MovieItem[];
  externalIdSet: Set<string>;
} {
  const dedupe = getCatalogDedupeKeys(baseMovies);
  const newExternal: DiscoveredExternalMovie[] = [];
  const externalIdSet = new Set<string>();

  for (const ext of externalMovies) {
    const extArchiveId =
      ext.archiveIdentifier?.toLowerCase() ||
      extractArchiveIdentifier(ext.downloadUrl || ext.videoUrl);
    const titleKey = normalizeTitleMatchKey(ext.title);

    if (
      dedupe.movieIds.has(ext.movieId) ||
      (extArchiveId && dedupe.archiveIds.has(extArchiveId)) ||
      dedupe.videoUrls.has(ext.downloadUrl || ext.videoUrl) ||
      dedupe.titleKeys.has(titleKey)
    ) {
      continue;
    }

    dedupe.movieIds.add(ext.movieId);
    if (extArchiveId) dedupe.archiveIds.add(extArchiveId);
    dedupe.titleKeys.add(titleKey);
    dedupe.videoUrls.add(ext.downloadUrl || ext.videoUrl);
    externalIdSet.add(ext.movieId);
    newExternal.push(ext);
  }

  // Place brand-new auto-discovered external releases right alongside top recent releases
  return {
    merged: [...newExternal, ...baseMovies],
    externalIdSet,
  };
}

interface FeedCachePayload {
  lastCheckedMs: number;
  movies: DiscoveredExternalMovie[];
  resolvedByKey: Record<string, { item: DiscoveredExternalMovie; cachedAtMs: number }>;
  sourceErrors: string[];
}

function formatDurationCompact(secondsInput: number): string {
  if (!Number.isFinite(secondsInput) || secondsInput <= 0) return '1h 20m';
  const totalMin = Math.max(1, Math.round(secondsInput / 60));
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

function formatSizeCompact(bytesInput: number): string {
  if (!Number.isFinite(bytesInput) || bytesInput <= 0) return '380 MB';
  const mb = bytesInput / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(mb))} MB`;
}

function sanitizeDiscoveredMovie(raw: DiscoveredExternalMovie): DiscoveredExternalMovie | null {
  const safeId = makeSafeIdFragment(raw.movieId);
  const synopsisClean =
    (raw.synopsis || '').trim().length >= MOVIE_FIELD_LIMITS.synopsisMin
      ? raw.synopsis.trim().slice(0, MOVIE_FIELD_LIMITS.synopsisMax)
      : `${raw.title} (${raw.releaseYear}) automatically discovered from ${raw.sourceLabel} for streaming and offline storage.`.slice(
          0,
          MOVIE_FIELD_LIMITS.synopsisMax
        );

  const poster =
    raw.coverArtUrl && raw.coverArtUrl.length <= MOVIE_FIELD_LIMITS.coverArtMax
      ? raw.coverArtUrl
      : DEFAULT_FALLBACK_POSTER;
  const video = (raw.downloadUrl || raw.videoUrl || '').slice(0, MOVIE_FIELD_LIMITS.downloadMax);

  const normalized = normalizeMovieRecord({
    ...raw,
    movieId: safeId,
    synopsis: synopsisClean,
    coverArtUrl: poster,
    posterUrl: poster,
    downloadUrl: video,
    videoUrl: video,
    published: true,
  });

  const validationError = validateMovieSchemaPayload({
    title: normalized.title,
    releaseYear: normalized.releaseYear,
    genre: normalized.genre,
    coverArtUrl: normalized.coverArtUrl,
    downloadUrl: normalized.downloadUrl,
    durationLabel: normalized.durationLabel,
    fileSizeLabel: normalized.fileSizeLabel,
    synopsis: normalized.synopsis,
  });

  if (validationError) {
    return null;
  }

  return {
    ...normalized,
    sourceLabel: raw.sourceLabel,
    sourceUrl: raw.sourceUrl,
    archiveIdentifier: raw.archiveIdentifier,
    discoveredAtMs: raw.discoveredAtMs,
  };
}

async function fetchExternalRssOrPeerTubeSources(
  sources: ExternalFeedSource[]
): Promise<{ items: DiscoveredExternalMovie[]; errors: string[] }> {
  if (sources.length === 0) return { items: [], errors: [] };
  const items: DiscoveredExternalMovie[] = [];
  const errors: string[] = [];

  // 1. Try Netlify CORS-free aggregator first
  let usedFunction = false;
  try {
    const fnRes = await fetch('/.netlify/functions/external-movie-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: sources.map((s) => ({
          label: s.label,
          kind: s.kind,
          url: s.urlOrQuery,
        })),
      }),
      signal: AbortSignal.timeout(9000),
    });
    const ct = (fnRes.headers.get('content-type') || '').toLowerCase();
    if (fnRes.ok && ct.includes('application/json')) {
      usedFunction = true;
      const json = (await fnRes.json()) as {
        results?: Array<{
          label?: string;
          url?: string;
          error?: string;
          items?: Array<{
            externalId: string;
            title: string;
            synopsis: string;
            releaseYear: string;
            posterUrl: string;
            videoUrl: string;
            fileSizeBytes: number;
            durationSeconds: number;
            sourceLabel: string;
            sourceUrl: string;
          }>;
        }>;
      };

      for (const feedResult of json.results || []) {
        if (feedResult.error) {
          errors.push(`${feedResult.label || 'Feed'}: ${feedResult.error}`);
        }
        for (const rawEntry of feedResult.items || []) {
          const cleanTitle = cleanArchiveMovieTitle(rawEntry.title);
          if (!isRealMovieTitle(cleanTitle, rawEntry.externalId || '')) continue;
          const translator = inferTranslatorFromText(`${rawEntry.title} ${rawEntry.synopsis}`);
          const category =
            translator.language === 'Luganda Translated' ? 'Indie & Regional' : 'Open Classics';
          const discovered = sanitizeDiscoveredMovie({
            movieId: `EXT-FEED-${hashShort(rawEntry.externalId || rawEntry.videoUrl)}`,
            title: cleanTitle,
            category,
            genre: inferCategoryFallbackGenre(category),
            language: translator.language,
            vjTranslator: translator.vjTranslator,
            releaseYear: rawEntry.releaseYear || '2026',
            durationLabel: formatDurationCompact(rawEntry.durationSeconds),
            qualityLabel: '720p HD',
            fileSizeLabel: formatSizeCompact(rawEntry.fileSizeBytes),
            synopsis: rawEntry.synopsis,
            posterUrl: rawEntry.posterUrl || DEFAULT_FALLBACK_POSTER,
            coverArtUrl: rawEntry.posterUrl || DEFAULT_FALLBACK_POSTER,
            videoUrl: rawEntry.videoUrl,
            downloadUrl: rawEntry.videoUrl,
            published: true,
            createdAtMs: Date.now(),
            sourceLabel: rawEntry.sourceLabel || 'External Site Feed',
            sourceUrl: rawEntry.sourceUrl || '',
            discoveredAtMs: Date.now(),
          });
          if (discovered) items.push(discovered);
        }
      }
    }
  } catch {
    // Fallback below if preview dev server does not run Netlify functions
  }

  if (usedFunction) {
    return { items, errors };
  }

  // 2. Direct browser fallback for CORS-enabled PeerTube APIs when in local preview
  const peerTubeSources = sources.filter((s) => s.kind === 'peertube');
  await Promise.allSettled(
    peerTubeSources.map(async (src) => {
      try {
        const base = src.urlOrQuery.replace(/\/+$/, '');
        const apiUrl = base.includes('/api/v1/videos')
          ? base
          : `${base}/api/v1/videos?sort=-publishedAt&count=10&isLive=false&nsfw=false`;
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(6500) });
        if (!res.ok) {
          errors.push(`${src.label}: HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as {
          data?: Array<{
            uuid?: string;
            shortUUID?: string;
            name?: string;
            description?: string;
            thumbnailPath?: string;
            duration?: number;
            publishedAt?: string;
            files?: Array<{ fileDownloadUrl?: string; fileUrl?: string; size?: number }>;
          }>;
        };
        const origin = new URL(apiUrl).origin;
        for (const entry of json.data || []) {
          const mp4 = entry.files?.find((f) =>
            String(f.fileDownloadUrl || f.fileUrl || '').toLowerCase().includes('.mp4')
          );
          const videoUrl = mp4?.fileDownloadUrl || mp4?.fileUrl || '';
          if (!videoUrl || !entry.name) continue;

          const poster = entry.thumbnailPath
            ? entry.thumbnailPath.startsWith('http')
              ? entry.thumbnailPath
              : `${origin}${entry.thumbnailPath}`
            : DEFAULT_FALLBACK_POSTER;
          const yearMatch = `${entry.name} ${entry.publishedAt || ''}`.match(/\b(202[0-9]|201[0-9])\b/);
          const translator = inferTranslatorFromText(`${entry.name} ${entry.description || ''}`);
          const category =
            translator.language === 'Luganda Translated' ? 'Indie & Regional' : 'Open Classics';

          const cleanTitle = cleanArchiveMovieTitle(entry.name);
          if (!isRealMovieTitle(cleanTitle, entry.uuid || '')) continue;

          const cleanItem = sanitizeDiscoveredMovie({
            movieId: `EXT-PT-${hashShort(entry.uuid || entry.shortUUID || videoUrl)}`,
            title: cleanTitle,
            category,
            genre: inferCategoryFallbackGenre(category),
            language: translator.language,
            vjTranslator: translator.vjTranslator,
            releaseYear: yearMatch?.[1] || '2026',
            durationLabel: formatDurationCompact(Number(entry.duration || 0)),
            qualityLabel: '720p HD',
            fileSizeLabel: formatSizeCompact(Number(mp4?.size || 0)),
            synopsis:
              entry.description ||
              `${cleanTitle} automatically discovered from ${src.label}.`,
            posterUrl: poster,
            coverArtUrl: poster,
            videoUrl,
            downloadUrl: videoUrl,
            published: true,
            createdAtMs: Date.now(),
            sourceLabel: src.label,
            sourceUrl: src.urlOrQuery,
            discoveredAtMs: Date.now(),
          });
          if (cleanItem) items.push(cleanItem);
        }
      } catch {
        errors.push(`${src.label}: CORS or network unavailable in preview mode.`);
      }
    })
  );

  return { items, errors };
}

export function getCachedExternalFeedSnapshot(): ExternalFeedDiscoveryResult | null {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LEGACY_FEED_CACHE_KEY);
    } catch {
      // Ignore storage error
    }
  }
  const cached = readStorageJson<FeedCachePayload | null>(FEED_CACHE_STORAGE_KEY, null);
  if (!cached || !Array.isArray(cached.movies)) return null;
  const cleanMovies = cached.movies.filter((m) =>
    isRealMovieTitle(m.title, m.archiveIdentifier || m.movieId)
  );
  return {
    movies: cleanMovies,
    checkedAtMs: cached.lastCheckedMs || Date.now(),
    fromCache: true,
    sourceErrors: cached.sourceErrors || [],
  };
}

/**
 * Queries all enabled external sites (Internet Archive 2026 Luganda & Open Cinema + custom feeds),
 * resolves verified MP4 streams & cover art, deduplicates against existing known catalog items,
 * and caches results cleanly.
 */
export async function discoverLatestExternalMovies(options?: {
  forceRefresh?: boolean;
  existingMovies?: MovieItem[];
}): Promise<ExternalFeedDiscoveryResult> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const existingDedupe = getCatalogDedupeKeys(options?.existingMovies || []);

  const cache = readStorageJson<FeedCachePayload>(FEED_CACHE_STORAGE_KEY, {
    lastCheckedMs: 0,
    movies: [],
    resolvedByKey: {},
    sourceErrors: [],
  });

  const now = Date.now();
  if (
    !forceRefresh &&
    cache.lastCheckedMs > 0 &&
    now - cache.lastCheckedMs < EXTERNAL_FEED_TTL_MS &&
    cache.movies.length > 0
  ) {
    return {
      movies: cache.movies,
      checkedAtMs: cache.lastCheckedMs,
      fromCache: true,
      sourceErrors: cache.sourceErrors || [],
    };
  }

  const enabledSources = getExternalFeedSources().filter((s) => s.enabled);
  const archiveSources = enabledSources.filter(
    (s) =>
      s.kind === 'archive_query' ||
      s.kind === 'archive_uploader' ||
      s.kind === 'archive_collection'
  );
  const webFeedSources = enabledSources.filter(
    (s) => s.kind === 'peertube' || s.kind === 'rss'
  );

  const sourceErrors: string[] = [];
  const nextResolvedByKey: Record<string, { item: DiscoveredExternalMovie; cachedAtMs: number }> = {};
  for (const [k, v] of Object.entries(cache.resolvedByKey || {})) {
    if (now - v.cachedAtMs < RESOLVED_ITEM_TTL_MS) {
      nextResolvedByKey[k] = v;
    }
  }

  // 1. Search Archive.org sources in parallel
  const candidateQueue: Array<{ identifier: string; sourceLabel: string; sourceUrl: string }> = [];
  const seenCandidateIds = new Set<string>();

  await Promise.allSettled(
    archiveSources.map(async (src) => {
      try {
        const candidates =
          src.kind === 'archive_query'
            ? await searchInternetArchiveMovies('', src.urlOrQuery as ArchiveSearchScope, 'latest')
            : await searchCustomArchiveSource(src.urlOrQuery);

        for (const cand of candidates) {
          const lowerId = cand.identifier.toLowerCase();
          if (seenCandidateIds.has(lowerId)) continue;
          seenCandidateIds.add(lowerId);
          candidateQueue.push({
            identifier: cand.identifier,
            sourceLabel: src.label,
            sourceUrl: `https://archive.org/details/${encodeURIComponent(cand.identifier)}`,
          });
        }
      } catch (err) {
        sourceErrors.push(
          `${src.label}: ${err instanceof Error ? err.message : 'Unable to reach Internet Archive.'}`
        );
      }
    })
  );

  const discoveredList: DiscoveredExternalMovie[] = [];

  // Use cached resolved drafts first when valid, queue uncached brand-new candidates for MP4 resolution
  const uncachedCandidates: typeof candidateQueue = [];
  for (const cand of candidateQueue) {
    const lowerId = cand.identifier.toLowerCase();
    if (existingDedupe.archiveIds.has(lowerId)) continue;

    const cachedEntry = nextResolvedByKey[`ia:${lowerId}`];
    if (cachedEntry) {
      discoveredList.push(cachedEntry.item);
    } else {
      uncachedCandidates.push(cand);
    }
  }

  // Resolve up to 10 newest uncached Archive items per cycle so mobile connections stay fast
  const batchToResolve = uncachedCandidates.slice(0, 10);
  const resolvedDrafts = await Promise.allSettled(
    batchToResolve.map(async (cand) => {
      const draft = await fetchInternetArchiveMovieDraft(cand.identifier);
      if (!isRealMovieTitle(draft.title, cand.identifier)) {
        return null;
      }
      // Enforce full-feature movie minimum runtime (>= 30m) and size (>= 70 MB) to drop clips/trailers
      if (
        (draft.durationSeconds > 0 && draft.durationSeconds < 1800) ||
        (draft.fileSizeBytes > 0 && draft.fileSizeBytes < 70 * 1024 * 1024)
      ) {
        return null;
      }

      const movieId = `EXT-IA-${makeSafeIdFragment(cand.identifier)}`;
      const safeMovie = sanitizeDiscoveredMovie({
        movieId,
        title: draft.title,
        category: draft.category,
        genre: draft.genre,
        language: draft.language,
        vjTranslator: draft.vjTranslator,
        releaseYear: draft.releaseYear,
        durationLabel: draft.durationLabel,
        qualityLabel: draft.qualityLabel,
        fileSizeLabel: draft.fileSizeLabel,
        synopsis: draft.synopsis,
        posterUrl: draft.posterUrl,
        coverArtUrl: draft.posterUrl,
        videoUrl: draft.videoUrl,
        downloadUrl: draft.videoUrl,
        published: true,
        createdAtMs: Date.now(),
        sourceLabel: cand.sourceLabel,
        sourceUrl: cand.sourceUrl,
        archiveIdentifier: cand.identifier.toLowerCase(),
        discoveredAtMs: Date.now(),
      });

      if (safeMovie) {
        nextResolvedByKey[`ia:${cand.identifier.toLowerCase()}`] = {
          item: safeMovie,
          cachedAtMs: Date.now(),
        };
      }
      return safeMovie;
    })
  );

  for (const res of resolvedDrafts) {
    if (res.status === 'fulfilled' && res.value) {
      discoveredList.push(res.value);
    }
  }

  // 2. Query external PeerTube / RSS / MRSS / Atom sites
  if (webFeedSources.length > 0) {
    const webResult = await fetchExternalRssOrPeerTubeSources(webFeedSources);
    sourceErrors.push(...webResult.errors);
    for (const webMovie of webResult.items) {
      discoveredList.push(webMovie);
    }
  }

  // Deduplicate final discovered list
  const dedupedFinal: DiscoveredExternalMovie[] = [];
  const finalSeenTitles = new Set<string>();
  const finalSeenIds = new Set<string>();

  for (const m of discoveredList) {
    const tKey = normalizeTitleMatchKey(m.title);
    if (finalSeenIds.has(m.movieId) || finalSeenTitles.has(tKey)) continue;
    finalSeenIds.add(m.movieId);
    finalSeenTitles.add(tKey);
    dedupedFinal.push(m);
  }

  // Preserve valid cached entries even if network temporarily dropped
  const finalMovies =
    dedupedFinal.length > 0 || sourceErrors.length === 0 ? dedupedFinal : cache.movies;

  writeStorageJson<FeedCachePayload>(FEED_CACHE_STORAGE_KEY, {
    lastCheckedMs: now,
    movies: finalMovies,
    resolvedByKey: nextResolvedByKey,
    sourceErrors,
  });

  return {
    movies: finalMovies,
    checkedAtMs: now,
    fromCache: false,
    sourceErrors,
  };
}

/**
 * Persists newly discovered external movies directly into Firestore `/movies/{movieId}`
 * using strictly validated fields matching firestore.rules, and optionally sends one batch alert
 * to active subscribers.
 */
export async function syncDiscoveredMoviesToFirestore(params: {
  discoveredMovies: DiscoveredExternalMovie[];
  existingFirestoreMovies: MovieItem[];
  adminUser: User;
  activeSubscribers?: Array<{ subscriberUid: string; email: string; subscriberName: string }>;
  notifySubscribers?: boolean;
}): Promise<AutoFirestoreSyncResult> {
  const {
    discoveredMovies,
    existingFirestoreMovies,
    adminUser,
    activeSubscribers = [],
    notifySubscribers = false,
  } = params;

  const dedupe = getCatalogDedupeKeys(existingFirestoreMovies);
  const toPublish: DiscoveredExternalMovie[] = [];

  for (const candidate of discoveredMovies) {
    const iaId =
      candidate.archiveIdentifier?.toLowerCase() ||
      extractArchiveIdentifier(candidate.downloadUrl || candidate.videoUrl);
    const titleKey = normalizeTitleMatchKey(candidate.title);

    if (
      dedupe.movieIds.has(candidate.movieId) ||
      (iaId && dedupe.archiveIds.has(iaId)) ||
      dedupe.videoUrls.has(candidate.downloadUrl || candidate.videoUrl) ||
      dedupe.titleKeys.has(titleKey)
    ) {
      continue;
    }

    const sanitized = sanitizeDiscoveredMovie(candidate);
    if (!sanitized) continue;

    dedupe.movieIds.add(sanitized.movieId);
    if (iaId) dedupe.archiveIds.add(iaId);
    dedupe.titleKeys.add(titleKey);
    dedupe.videoUrls.add(sanitized.downloadUrl);
    toPublish.push(sanitized);

    if (toPublish.length >= 12) break;
  }

  const now = Date.now();
  if (toPublish.length === 0) {
    return {
      syncedCount: 0,
      syncedMovies: [],
      notifiedCount: 0,
      emailSentCount: 0,
      checkedAtMs: now,
      message: 'All discovered external movies are already synced in Firestore.',
    };
  }

  for (let i = 0; i < toPublish.length; i += 400) {
    const chunk = toPublish.slice(i, i + 400);
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

  let notifiedCount = 0;
  let emailSentCount = 0;

  // Send ONE consolidated notification + email digest for the auto-synced batch
  if (notifySubscribers && activeSubscribers.length > 0) {
    const leadMovie = toPublish[0];
    const headlineTitle =
      toPublish.length === 1
        ? `New Movie Auto-Added: ${leadMovie.title}`
        : `${toPublish.length} New Movies Auto-Added (${leadMovie.title} + more)`;
    const titlesSummary = toPublish
      .slice(0, 4)
      .map((m) => `${m.title} (${m.releaseYear} · ${m.vjTranslator})`)
      .join(', ');
    const notifBody =
      `Fresh external uploads were automatically synced to /movies for streaming and local storage download: ${titlesSummary}.`.slice(
        0,
        2000
      );
    const senderEmail = (adminUser.email || 'arigyewisdom7@gmail.com').slice(0, 200);

    for (let i = 0; i < activeSubscribers.length; i += 400) {
      const chunk = activeSubscribers.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((sub, idx) => {
        const notificationId = `AUTONTF-${Date.now()}-${i + idx}-${Math.floor(100 + Math.random() * 900)}`;
        batch.set(doc(db, 'notifications', notificationId), {
          notificationId,
          recipientId: sub.subscriberUid,
          senderEmail,
          type: 'admin_message',
          title: headlineTitle.slice(0, 140),
          body: notifBody,
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
        notifiedCount += chunk.length;
      } catch {
        // Non-fatal if notification batch fails
      }
    }

    try {
      const idToken = await adminUser.getIdToken();
      const baseOrigin =
        typeof window !== 'undefined' && window.location.origin.startsWith('https://')
          ? window.location.origin
          : 'https://0x4dev.netlify.app';
      const emailHtml = buildMovieReleaseEmailHtml({
        movieTitle:
          toPublish.length === 1
            ? leadMovie.title
            : `${leadMovie.title} & ${toPublish.length - 1} New Auto-Synced Releases`,
        category: leadMovie.category,
        releaseYear: leadMovie.releaseYear,
        durationLabel: leadMovie.durationLabel,
        qualityLabel: leadMovie.qualityLabel,
        fileSizeLabel: leadMovie.fileSizeLabel,
        synopsis: notifBody,
        moviesPageUrl: `${baseOrigin}/movies/${leadMovie.movieId}`,
      });

      const res = await fetch('/.netlify/functions/send-movie-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          movie: leadMovie,
          subscribers: activeSubscribers.map((s) => ({
            email: s.email,
            name: s.subscriberName,
          })),
          subject: headlineTitle.slice(0, 140),
          html: emailHtml,
          text: `${notifBody}\n\nWatch or download offline at ${baseOrigin}/movies`,
        }),
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const result = (await res.json()) as { sentCount?: number };
        emailSentCount = Number(result.sentCount || 0);
      }
    } catch {
      // Ignore if running in local preview without email function
    }
  }

  return {
    syncedCount: toPublish.length,
    syncedMovies: toPublish,
    notifiedCount,
    emailSentCount,
    checkedAtMs: now,
    message: `Auto-published ${toPublish.length} newly uploaded external movie${
      toPublish.length === 1 ? '' : 's'
    } to Firestore.`,
  };
}
