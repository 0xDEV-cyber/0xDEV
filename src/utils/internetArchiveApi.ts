import {
  inferCategoryFallbackGenre,
  inferTranslatorFromText,
  MovieCategory,
  MovieGenre,
  MovieQualityLabel,
} from '../data/movieSchema';

export type ArchiveSearchScope =
  | 'luganda_2026'
  | 'latest_2026'
  | 'luganda'
  | 'all'
  | 'feature_films'
  | 'computerchronicles'
  | 'opensource_movies';

export type ArchiveSortMode = 'latest' | 'downloads';

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
  genre: MovieGenre | string;
  language: string;
  vjTranslator: string;
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
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function formatDurationSeconds(rawLength: unknown): string {
  const str = String(rawLength || '').trim();
  if (!str) return '1h 15m';

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

function inferCategory(
  collections: unknown,
  title: string,
  durationLabel: string,
  language: string
): MovieCategory {
  const joined = (Array.isArray(collections) ? collections.join(' ') : String(collections || '')).toLowerCase();
  const titleLower = title.toLowerCase();
  if (language === 'Luganda Translated') {
    return 'Indie & Regional';
  }
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

function inferGenreFromMetadata(
  rawText: string,
  category: MovieCategory
): MovieGenre {
  const lower = rawText.toLowerCase();
  const rules: [RegExp, MovieGenre][] = [
    [/horror|ghost|haunted|curse|evil|demon|zombie|vampire/i, 'Horror'],
    [/sci-fi|scifi|science fiction|space|cyber|spider-man|alien|robot/i, 'Sci-Fi'],
    [/crime|murder|heist|detective|mafia|gangster|cartel|assassin/i, 'Crime'],
    [/thriller|suspense|mystery|spy|revenge|vendetta/i, 'Thriller'],
    [/romance|love|romeo|juliet|admirer|wedding/i, 'Romance'],
    [/animation|animated|cartoon|blender|pinocchio/i, 'Animation'],
    [/comedy|funny|laugh|parody/i, 'Comedy'],
    [/documentary|chronicles|history|interview|behind the scenes/i, 'Documentary'],
    [/adventure|kingdom|fantasy|journey|expedition|treasure/i, 'Adventure'],
    [/action|kungfu|kung fu|martial|combat|war|undisputed|ninja|commando|red sonja/i, 'Action'],
  ];

  for (const [pattern, genre] of rules) {
    if (pattern.test(lower)) {
      return genre;
    }
  }
  return inferCategoryFallbackGenre(category);
}

function isUnwantedArchiveNoise(title: string, identifier: string): boolean {
  const combined = `${title} ${identifier}`.toLowerCase();
  return (
    combined.includes('quran') ||
    combined.includes('القران') ||
    combined.includes('مصحف') ||
    combined.includes('mtv ') ||
    combined.includes('xvideos') ||
    combined.includes('pornhub') ||
    combined.includes('hentai') ||
    combined.includes('boku no pico') ||
    combined.includes('capcut template') ||
    combined.includes('cyberleek') ||
    identifier.toLowerCase().startsWith('goodman') ||
    identifier.toLowerCase().startsWith('soop-') ||
    identifier.toLowerCase().startsWith('chzzk-')
  );
}

export async function searchInternetArchiveMovies(
  queryText: string,
  collectionScope: ArchiveSearchScope = 'luganda_2026',
  sortMode?: ArchiveSortMode
): Promise<ArchiveSearchCandidate[]> {
  const trimmed = queryText.trim();
  const qParts = ['mediatype:movies', 'format:MPEG4'];

  const lugandaClauses =
    '("luganda" OR "vj junior" OR "vj jingo" OR "vj emmy" OR "vj ice" OR "vj mark" OR "vj mande" OR "vj saul" OR "wakaliwood" OR "enjogerere" OR "midcrushmovies")';

  if (collectionScope === 'luganda_2026') {
    qParts.push(lugandaClauses);
    qParts.push('(2026 OR year:2026 OR year:2025 OR publicdate:[2025-09-01 TO 2026-12-31])');
    qParts.push('NOT MTV');
    qParts.push('NOT quran');
  } else if (collectionScope === 'latest_2026') {
    qParts.push('(collection:(opensource_movies OR feature_films OR computerchronicles) OR "2026 movie" OR "full movie")');
    qParts.push('(year:2026 OR year:2025 OR publicdate:[2025-09-01 TO 2026-12-31])');
    qParts.push('NOT MTV');
    qParts.push('NOT quran');
    qParts.push('NOT xvideos');
    qParts.push('NOT trailer');
  } else if (collectionScope === 'luganda') {
    qParts.push(lugandaClauses);
    qParts.push('NOT MTV');
    qParts.push('NOT quran');
  } else if (collectionScope === 'all') {
    qParts.push('collection:(feature_films OR opensource_movies OR computerchronicles OR classic_tv)');
  } else {
    qParts.push(`collection:${collectionScope}`);
  }

  if (trimmed) {
    const safeTerms = trimmed.replace(/[()":]/g, ' ').trim();
    if (safeTerms) {
      qParts.push(`(${safeTerms})`);
    }
  }

  const effectiveSort: ArchiveSortMode =
    sortMode ||
    (collectionScope === 'luganda_2026' || collectionScope === 'latest_2026'
      ? 'latest'
      : 'downloads');

  const params = new URLSearchParams({
    q: qParts.join(' AND '),
    rows: '28',
    page: '1',
    output: 'json',
  });
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'year');
  params.append('fl[]', 'publicdate');
  params.append('fl[]', 'description');
  params.append('fl[]', 'downloads');
  params.append('fl[]', 'collection');
  params.append('sort[]', effectiveSort === 'latest' ? 'publicdate desc' : 'downloads desc');

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
        publicdate?: string;
        description?: string | string[];
        downloads?: number;
        collection?: string | string[];
      }>;
    };
  };

  const docs = json.response?.docs || [];
  return docs
    .filter((d) => {
      if (!d.identifier) return false;
      const title = stripHtmlAndTruncate(d.title || d.identifier, 140);
      return !isUnwantedArchiveNoise(title, String(d.identifier));
    })
    .slice(0, 15)
    .map((d) => {
      const id = String(d.identifier);
      const rawYear = Array.isArray(d.year) ? d.year[0] : d.year;
      const explicitYear = String(rawYear || '').match(/\d{4}/)?.[0];
      const titleYear = stripHtmlAndTruncate(d.title || id, 140).match(/\b(202[0-9]|201[0-9])\b/)?.[0];
      const pubYear = String(d.publicdate || '').match(/\d{4}/)?.[0];
      const normalizedYear = explicitYear || titleYear || pubYear || '2026';
      const title = stripHtmlAndTruncate(d.title || id, 140);
      const translatorInfo = inferTranslatorFromText(`${title} ${id}`);
      const defaultCollection = Array.isArray(d.collection)
        ? String(d.collection[0] || 'Internet Archive')
        : String(d.collection || 'Internet Archive');

      return {
        identifier: id,
        title,
        year: normalizedYear,
        synopsis:
          stripHtmlAndTruncate(
            d.description || 'Public domain or Luganda-translated film hosted on Internet Archive.',
            300
          ) || 'Public domain or Luganda-translated film hosted on Internet Archive.',
        downloads: Number(d.downloads || 0),
        posterUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        collectionHint:
          translatorInfo.language === 'Luganda Translated'
            ? `${translatorInfo.vjTranslator} · Luganda`
            : defaultCollection,
      };
    });
}

export async function fetchInternetArchiveMovieDraft(
  identifierInput: string
): Promise<ResolvedArchiveMovieDraft> {
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
      publicdate?: string | string[];
      description?: string | string[];
      subject?: string | string[];
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
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')}`;

  const rawTitle = stripHtmlAndTruncate(data.metadata?.title || identifier, 140) || identifier;
  const rawYearCandidate = Array.isArray(data.metadata?.year)
    ? data.metadata?.year[0]
    : data.metadata?.year ||
      (Array.isArray(data.metadata?.date) ? data.metadata?.date[0] : data.metadata?.date) ||
      (Array.isArray(data.metadata?.publicdate)
        ? data.metadata?.publicdate[0]
        : data.metadata?.publicdate);
  const yearMatch = String(rawYearCandidate || '').match(/\d{4}/);
  const titleYearMatch = rawTitle.match(/\b(202[0-9]|201[0-9])\b/);
  const releaseYear = yearMatch?.[0] || titleYearMatch?.[0] || '2026';

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

  const subjectText = Array.isArray(data.metadata?.subject)
    ? data.metadata?.subject.join(' ')
    : String(data.metadata?.subject || '');
  const translatorInfo = inferTranslatorFromText(`${rawTitle} ${identifier} ${synopsis} ${subjectText}`);
  const category = inferCategory(
    data.metadata?.collection,
    rawTitle,
    durationLabel,
    translatorInfo.language
  );
  const genre = inferGenreFromMetadata(`${rawTitle} ${synopsis} ${subjectText}`, category);

  return {
    identifier,
    title: rawTitle,
    category,
    genre,
    language: translatorInfo.language,
    vjTranslator: translatorInfo.vjTranslator,
    releaseYear,
    durationLabel,
    qualityLabel,
    fileSizeLabel,
    synopsis,
    posterUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    videoUrl,
  };
}
