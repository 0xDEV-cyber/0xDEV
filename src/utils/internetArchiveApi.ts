import { MovieCategory, MovieQualityLabel } from '../hooks/useMovies';

export interface ArchiveSearchCandidate {
  identifier: string;
  title: string;
  year: string;
  synopsis: string;
  downloads: number;
  posterUrl: string;
  collectionHint: string;
}

export interface ResolvedArchiveMovieDraft {
  identifier: string;
  title: string;
  category: MovieCategory;
  releaseYear: string;
  durationLabel: string;
  qualityLabel: MovieQualityLabel;
  fileSizeLabel: string;
  synopsis: string;
  posterUrl: string;
  videoUrl: string;
}

function stripHtmlAndTruncate(raw: unknown, maxLen: number): string {
  const str = Array.isArray(raw) ? raw.join(' ') : String(raw || '');
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function formatDurationSeconds(rawLength: unknown): string {
  const str = String(rawLength || '').trim();
  if (!str) return '1h 15m';

  // Handle "HH:MM:SS" or "MM:SS" strings sometimes returned by Archive.org
  if (str.includes(':')) {
    const parts = str.split(':').map((n) => Number(n));
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      const totalMin = parts[0] * 60 + parts[1];
      if (totalMin >= 60) {
        return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
      }
      return `${Math.max(1, totalMin)}m`;
    }
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      return `${Math.max(1, parts[0])}m`;
    }
  }

  const seconds = Number(str);
  if (!Number.isFinite(seconds) || seconds <= 0) return '1h 15m';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatFileSize(rawBytes: unknown): string {
  const bytes = Number(rawBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return '250 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.max(1, Math.round(mb))} MB`;
}

function inferCategory(collections: unknown, title: string, durationLabel: string): MovieCategory {
  const joined = (Array.isArray(collections) ? collections.join(' ') : String(collections || '')).toLowerCase();
  const titleLower = title.toLowerCase();
  if (
    joined.includes('computerchronicles') ||
    joined.includes('tech') ||
    titleLower.includes('computer') ||
    titleLower.includes('macintosh') ||
    titleLower.includes('software') ||
    titleLower.includes('hypercard')
  ) {
    return 'Tech Documentaries';
  }
  if (
    joined.includes('animation') ||
    joined.includes('short') ||
    (!durationLabel.includes('h') && parseInt(durationLabel, 10) <= 35)
  ) {
    return 'Short Films';
  }
  if (joined.includes('indie') || joined.includes('opensource_movies')) {
    return 'Indie & Regional';
  }
  return 'Open Classics';
}

export async function searchInternetArchiveMovies(
  queryText: string,
  collectionScope: 'all' | 'feature_films' | 'computerchronicles' | 'opensource_movies' = 'all'
): Promise<ArchiveSearchCandidate[]> {
  const trimmed = queryText.trim();
  const collectionClause =
    collectionScope === 'all'
      ? 'collection:(feature_films OR opensource_movies OR computerchronicles OR classic_tv)'
      : `collection:${collectionScope}`;

  const qParts = ['mediatype:movies', 'format:MPEG4', collectionClause];
  if (trimmed) {
    const safeTerms = trimmed.replace(/[()":]/g, ' ').trim();
    if (safeTerms) {
      qParts.push(`(${safeTerms})`);
    }
  }

  const params = new URLSearchParams({
    q: qParts.join(' AND '),
    rows: '12',
    page: '1',
    output: 'json',
  });
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'year');
  params.append('fl[]', 'description');
  params.append('fl[]', 'downloads');
  params.append('fl[]', 'collection');
  params.append('sort[]', 'downloads desc');

  const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Internet Archive search returned HTTP ${res.status}.`);
  }

  const json = (await res.json()) as {
    response?: {
      docs?: Array<{
        identifier?: string;
        title?: string | string[];
        year?: string | number | string[];
        description?: string | string[];
        downloads?: number;
        collection?: string | string[];
      }>;
    };
  };

  const docs = json.response?.docs || [];
  return docs
    .filter((d) => Boolean(d.identifier))
    .map((d) => {
      const id = String(d.identifier);
      const rawYear = Array.isArray(d.year) ? d.year[0] : d.year;
      const yearStr = String(rawYear || 'Classic').slice(0, 12);
      const normalizedYear = yearStr.length >= 4 ? yearStr : 'Public Domain';
      return {
        identifier: id,
        title: stripHtmlAndTruncate(d.title || id, 140),
        year: normalizedYear,
        synopsis:
          stripHtmlAndTruncate(
            d.description || 'Public domain film hosted on Internet Archive for free viewing.',
            300
          ) || 'Public domain film hosted on Internet Archive for free viewing.',
        downloads: Number(d.downloads || 0),
        posterUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        collectionHint: Array.isArray(d.collection)
          ? String(d.collection[0] || 'Internet Archive')
          : String(d.collection || 'Internet Archive'),
      };
    });
}

export async function fetchInternetArchiveMovieDraft(
  identifierInput: string
): Promise<ResolvedArchiveMovieDraft> {
  // Support pasting either raw identifier OR full archive.org/details/<id> URL
  let identifier = identifierInput.trim();
  const detailsMatch = identifier.match(/archive\.org\/(?:details|download)\/([^/?#]+)/i);
  if (detailsMatch?.[1]) {
    identifier = detailsMatch[1];
  }
  identifier = decodeURIComponent(identifier).trim();

  if (!identifier) {
    throw new Error('Please provide a valid Internet Archive item identifier.');
  }

  const res = await fetch(
    `https://archive.org/metadata/${encodeURIComponent(identifier)}`
  );
  if (!res.ok) {
    throw new Error(`Unable to load Internet Archive metadata (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    metadata?: {
      title?: string | string[];
      year?: string | number | string[];
      date?: string | string[];
      description?: string | string[];
      collection?: string | string[];
    };
    files?: Array<{
      name?: string;
      format?: string;
      size?: string | number;
      length?: string | number;
      height?: string | number;
    }>;
  };

  const mp4Files = (data.files || []).filter(
    (f) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.mp4')
  );

  if (mp4Files.length === 0) {
    throw new Error(
      `No MP4 video file was found inside Internet Archive item "${identifier}". Try another search result.`
    );
  }

  // Prefer lightweight 512Kb MPEG4 or standard MPEG4 under 600 MB so local storage caching stays smooth
  const sortedByPreference = [...mp4Files].sort((a, b) => {
    const a512 = a.format === '512Kb MPEG4' ? 0 : a.format === 'MPEG4' ? 1 : 2;
    const b512 = b.format === '512Kb MPEG4' ? 0 : b.format === 'MPEG4' ? 1 : 2;
    if (a512 !== b512) return a512 - b512;
    return Number(a.size || 0) - Number(b.size || 0);
  });

  const chosen = sortedByPreference[0];
  const fileName = String(chosen.name);
  const videoUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${fileName
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  const rawTitle = stripHtmlAndTruncate(data.metadata?.title || identifier, 140) || identifier;
  const rawYearCandidate = Array.isArray(data.metadata?.year)
    ? data.metadata?.year[0]
    : data.metadata?.year ||
      (Array.isArray(data.metadata?.date) ? data.metadata?.date[0] : data.metadata?.date);
  const yearMatch = String(rawYearCandidate || '').match(/\d{4}/);
  const releaseYear = yearMatch ? yearMatch[0] : '2024';

  const durationLabel = formatDurationSeconds(chosen.length);
  const fileSizeLabel = formatFileSize(chosen.size);
  const height = Number(chosen.height || 0);
  const qualityLabel: MovieQualityLabel =
    height >= 1000
      ? '1080p Full HD'
      : height >= 680 || chosen.format === 'MPEG4'
        ? '720p HD'
        : '480p Lite';

  let synopsis = stripHtmlAndTruncate(data.metadata?.description || '', 780);
  if (synopsis.length < 12) {
    synopsis = `${rawTitle} (${releaseYear}) is a free, open-access film archived on Internet Archive and available on 0xDEV for online streaming or offline local browser storage.`;
  }

  const category = inferCategory(data.metadata?.collection, rawTitle, durationLabel);

  return {
    identifier,
    title: rawTitle,
    category,
    releaseYear,
    durationLabel,
    qualityLabel,
    fileSizeLabel,
    synopsis,
    posterUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    videoUrl,
  };
}
