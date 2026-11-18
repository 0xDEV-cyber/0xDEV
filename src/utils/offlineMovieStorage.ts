import { MovieItem } from '../hooks/useMovies';

const DB_NAME = '0xdev_offline_movies';
const DB_VERSION = 1;
const STORE_NAME = 'movies';
const PROXY_CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB per range chunk

export interface SavedOfflineMovieMeta {
  movieId: string;
  title: string;
  category: string;
  releaseYear: string;
  durationLabel: string;
  qualityLabel: string;
  fileSizeLabel: string;
  synopsis: string;
  posterUrl: string;
  videoUrl: string;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
}

interface SavedOfflineMovieRecord extends SavedOfflineMovieMeta {
  videoBlob: Blob;
}

export interface DownloadProgressInfo {
  loadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
}

export class OfflineStorageCorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineStorageCorsError';
  }
}

export function isOfflineStorageSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function isInternetArchiveUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && (host === 'archive.org' || host.endsWith('.archive.org'));
  } catch {
    return false;
  }
}

function openMoviesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isOfflineStorageSupported()) {
      reject(new Error('IndexedDB local storage is unavailable in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'movieId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Unable to open browser offline movie storage.'));
  });
}

export async function getSavedMovies(): Promise<SavedOfflineMovieMeta[]> {
  if (!isOfflineStorageSupported()) return [];

  const db = await openMoviesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const rows = (req.result as SavedOfflineMovieRecord[]) || [];
      const summaries: SavedOfflineMovieMeta[] = rows
        .map(({ videoBlob: _blob, ...meta }) => meta)
        .sort((a, b) => b.savedAt - a.savedAt);
      resolve(summaries);
    };
    req.onerror = () => reject(req.error || new Error('Unable to read saved offline movies.'));
    tx.oncomplete = () => db.close();
  });
}

export async function getSavedMovieBlobUrl(movieId: string): Promise<string | null> {
  if (!isOfflineStorageSupported()) return null;

  const db = await openMoviesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(movieId);

    req.onsuccess = () => {
      const record = req.result as SavedOfflineMovieRecord | undefined;
      if (!record || !(record.videoBlob instanceof Blob)) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(record.videoBlob));
    };
    req.onerror = () => reject(req.error || new Error('Unable to load movie from local storage.'));
    tx.oncomplete = () => db.close();
  });
}

export async function removeSavedMovie(movieId: string): Promise<void> {
  if (!isOfflineStorageSupported()) return;

  const db = await openMoviesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(movieId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Unable to remove local movie copy.'));
    tx.oncomplete = () => db.close();
  });
}

async function fetchViaArchiveChunkProxy(
  videoUrl: string,
  onProgress?: (progress: DownloadProgressInfo) => void
): Promise<{ blob: Blob; contentType: string }> {
  const probeUrl = `/.netlify/functions/archive-video-chunk?mode=head&url=${encodeURIComponent(
    videoUrl
  )}`;
  const probeRes = await fetch(probeUrl);
  const probeCt = probeRes.headers.get('content-type') || '';

  if (!probeRes.ok || !probeCt.includes('application/json')) {
    throw new OfflineStorageCorsError(
      'Local storage chunked caching runs on the live Netlify deployment (https://0x4dev.netlify.app). Use Download MP4 here to save the movie directly to your device.'
    );
  }

  const probeData = (await probeRes.json()) as {
    ok?: boolean;
    totalBytes?: number | null;
    contentType?: string;
    supportsRange?: boolean;
    error?: string;
  };

  if (!probeData.ok || !probeData.totalBytes || !probeData.supportsRange) {
    throw new OfflineStorageCorsError(
      probeData.error ||
        'This video source does not support chunked range caching. Use Download MP4 to save the file directly.'
    );
  }

  const totalBytes = probeData.totalBytes;
  const contentType = probeData.contentType || 'video/mp4';
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (loadedBytes < totalBytes) {
    const start = loadedBytes;
    const end = Math.min(totalBytes - 1, start + PROXY_CHUNK_SIZE - 1);
    const chunkUrl = `/.netlify/functions/archive-video-chunk?url=${encodeURIComponent(
      videoUrl
    )}&start=${start}&end=${end}`;

    const chunkRes = await fetch(chunkUrl);
    if (!chunkRes.ok) {
      throw new Error(`Chunk download failed at byte ${start} (HTTP ${chunkRes.status}).`);
    }

    const buf = new Uint8Array(await chunkRes.arrayBuffer());
    if (buf.byteLength === 0) break;

    chunks.push(buf);
    loadedBytes += buf.byteLength;
    const percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
    onProgress?.({ loadedBytes, totalBytes, percent });
  }

  if (loadedBytes === 0) {
    throw new Error('Downloaded video file was empty.');
  }

  return {
    blob: new Blob(chunks as BlobPart[], { type: contentType }),
    contentType,
  };
}

export async function saveMovieToLocalStorage(
  movie: MovieItem,
  onProgress?: (progress: DownloadProgressInfo) => void
): Promise<SavedOfflineMovieMeta> {
  if (!isOfflineStorageSupported()) {
    throw new Error('This browser does not support IndexedDB local video storage.');
  }
  if (!movie.videoUrl || !movie.videoUrl.startsWith('https://')) {
    throw new Error('Movie does not have a valid HTTPS video file URL.');
  }

  let videoBlob: Blob | null = null;
  let contentType = 'video/mp4';

  // 1. Try direct CORS fetch first (fastest when CDN/R2 allows CORS directly)
  let corsBlocked = false;
  try {
    const response = await fetch(movie.videoUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Video download failed (HTTP ${response.status}).`);
    }

    contentType = response.headers.get('content-type') || 'video/mp4';
    const lengthHeader = response.headers.get('content-length');
    const totalBytes = lengthHeader ? Number(lengthHeader) : null;

    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.byteLength;
          const percent =
            totalBytes && totalBytes > 0
              ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
              : null;
          onProgress?.({ loadedBytes, totalBytes, percent });
        }
      }

      videoBlob = new Blob(chunks as BlobPart[], { type: contentType });
    } else {
      videoBlob = await response.blob();
      onProgress?.({
        loadedBytes: videoBlob.size,
        totalBytes: videoBlob.size,
        percent: 100,
      });
    }
  } catch (err) {
    if (err instanceof TypeError) {
      corsBlocked = true;
    } else {
      throw err;
    }
  }

  // 2. Fallback to chunked CORS proxy for Internet Archive MP4 URLs
  if (corsBlocked || !videoBlob) {
    if (isInternetArchiveUrl(movie.videoUrl)) {
      const proxied = await fetchViaArchiveChunkProxy(movie.videoUrl, onProgress);
      videoBlob = proxied.blob;
      contentType = proxied.contentType;
    } else {
      throw new OfflineStorageCorsError(
        'This remote video server restricts direct browser caching (CORS). Use Download MP4 to save the file directly to your device Downloads folder.'
      );
    }
  }

  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('Downloaded video file was empty.');
  }

  const record: SavedOfflineMovieRecord = {
    movieId: movie.movieId,
    title: movie.title,
    category: movie.category,
    releaseYear: movie.releaseYear,
    durationLabel: movie.durationLabel,
    qualityLabel: movie.qualityLabel,
    fileSizeLabel: movie.fileSizeLabel,
    synopsis: movie.synopsis,
    posterUrl: movie.posterUrl,
    videoUrl: movie.videoUrl,
    mimeType: videoBlob.type || contentType,
    sizeBytes: videoBlob.size,
    savedAt: Date.now(),
    videoBlob,
  };

  const db = await openMoviesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error || new Error('Browser storage quota exceeded while saving movie.'));
    tx.oncomplete = () => db.close();
  });

  const { videoBlob: _ignored, ...meta } = record;
  return meta;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 100 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export async function estimateBrowserStorageQuota(): Promise<{
  usageBytes: number;
  quotaBytes: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usageBytes: estimate.usage || 0,
      quotaBytes: estimate.quota || 0,
    };
  } catch {
    return null;
  }
}
