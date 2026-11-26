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
  durationSeconds: number;
  fileSizeBytes: number;
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

function parseDurationToSeconds(rawLength: unknown): number {
  const str = String(rawLength || '').trim();
  if (!str) return 0;

  if (str.includes(':')) {
    const parts = str.split(':').map((n) => Number(n));
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      return parts[0] * 60 + parts[1];
    }
  }

  const seconds = Number(str);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
}

function formatDurationSeconds(rawLength: unknown): string {
  const seconds = parseDurationToSeconds(rawLength);
  if (seconds <= 0) return '1h 15m';
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

export function extractArchiveIdentifier(urlOrId: string): string | null {
  const trimmed = String(urlOrId || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/archive\.org\/(?:details|download|services\/img)\/([^/?#]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).toLowerCase();
    } catch {
      return match[1].toLowerCase();
    }
  }
  return null;
}

export function cleanArchiveMovieTitle(rawTitle: string): string {
  let cleaned = String(rawTitle || '')
    // Remove enclosed pictographs, UI emojis (🆕 U+1F195), & symbols
    .replace(/[\u{1F100}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, ' ')
    .replace(/\.ia\.mp4$/i, '')
    .replace(/\.mp4$/i, '')
    .replace(/\[www\.[^\]]+\]/gi, ' ')
    .replace(/\bwww\.[a-z0-9.-]+\.[a-z]{2,}\b/gi, ' ')
    .replace(/[_]+/g, ' ')
    // Separate stuck "1Midcrushmovies" -> "1 Midcrushmovies"
    .replace(/(\d)(midcrush[a-z]*)/gi, '$1 $2')
    .replace(/\b(by\s+)?(midcrushmoviies|midcrushmovies|midcrush|myvj|geekjuicemedia|munowatch|kindlysubscribe)\b/gi, ' ')
    .replace(/^FILM\s+/i, '')
    .replace(/^MOVIE\s+/i, '')
    // Strip trailing/embedded uploader/VJ attribution tags (translator shown in dedicated badge)
    .replace(/\b(by|translated\s+by)?\s*vj\s+(junior|juniour|mark|ice\s*p|icep|jingo|jinggo|emmy|emmie|mande|saul|ulio|neil|ivo|banks)\b.*$/i, '')
    .replace(/\s+(by\s+)?\b(jr|icep|emmy)\b(\s+by)?\s*$/i, '')
    .replace(/\s+\b(vj|by)\s*$/i, '')
    .replace(/#\s*(action|horror|thriller|comedy|romance|sci-fi|scifi|luganda)\b/gi, ' ')
    .replace(/\(\s*(720\s*p|1080\s*p|480\s*p|360\s*p)(\s+(hd|h\s*264))?\s*\)/gi, ' ')
    .replace(/\(\s*(19\d{2}|20[0-2]\d)\s*\)\s*$/g, '')
    .replace(/\b(luganda\s+translated\s+movies?|film\s+enjogerere|enjogerere|dubbed\s*&\s*subtitled|full\s+movie|new\s+movie)\b/gi, ' ')
    .replace(/\s+\bmovie\b\s*$/i, '')
    .replace(/\bpart\s+(\d+)\b/gi, '(Part $1)')
    .replace(/\s*[-–:|]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Fix common misspelling from Archive upload ("Memaid" -> "Mermaid")
  cleaned = cleaned.replace(/\bmemaid\b/i, 'Mermaid');

  // If raw title is shouted ALL CAPS, convert nicely to Title Case while preserving Roman numerals
  const letters = cleaned.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) {
    const romanSet = new Set(['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
    const smallWords = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'by', 'or', 'vs']);
    cleaned = cleaned
      .split(' ')
      .map((word, idx) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        if (romanSet.has(cleanWord.toUpperCase())) return word.toUpperCase();
        const lower = word.toLowerCase();
        if (idx > 0 && smallWords.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }

  return (cleaned || String(rawTitle || 'Untitled Film')).slice(0, 140);
}

export function isRealMovieTitle(title: string, identifier = ''): boolean {
  const cleanTitle = String(title || '').trim();
  const combined = `${cleanTitle} ${identifier}`.toLowerCase();

  if (cleanTitle.length < 2 || /^untitled(\s+film)?$/i.test(cleanTitle)) {
    return false;
  }

  // Must contain readable Latin letters (reject raw non-Latin livestream spam)
  if (!/[a-zA-Z]{2,}/.test(cleanTitle)) {
    return false;
  }

  // Reject coded media filenames, UUIDs, episode dumps, and collection playlists
  const badPatterns: RegExp[] = [
    /\bmc[-_\s]*media[-_\s]*file/i,
    /\bmedia[-_\s]*file[-_\s]*\d/i,
    /^(file|video|vid|clip|mov|dsc|img|upload)[-_\s]*\d+/i,
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i,
    /^\d{4}[.\-_]\d{2}[.\-_]\d{2}\b/,
    /^e0*\d+[_\s-]/i,
    /\bs\s*0?\d+\s*[exd]\s*0?\d+\b/i,
    /\b\d+\s+episodes\b/i,
    /^he[-\s]man[-\s]\d{2}\b/i,
    /\b(all movies|movies collection|ugandan movies|all episodes)\b/i,
    /^vj\s+[a-z]+\s+(ugandan\s+)?movies$/i,
    /directo\s*-\s*clip/i,
    /\bstreamed live\b/i,
    /\bmirrativ\b/i,
    /\byoutube\b/i,
    /\bmatch card\b/i,
    /\bmain theme\b/i,
    /\bexplainer\b/i,
    /\bpodcast\b/i,
    /\bgameplay\b/i,
    /\bpeak cinema\b/i,
    /\b(official\s+)?trailers?\b/i,
    /\bteasers?\b/i,
  ];

  if (badPatterns.some((rx) => rx.test(combined))) {
    return false;
  }

  return true;
}

function isUnwantedArchiveNoise(title: string, identifier: string): boolean {
  const combined = `${title} ${identifier}`.toLowerCase();
  if (
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
    identifier.toLowerCase().startsWith('chzzk-') ||
    identifier.toLowerCase().startsWith('mirrativ-') ||
    identifier.toLowerCase().startsWith('youtube-') ||
    identifier.toLowerCase().startsWith('salseo_')
  ) {
    return true;
  }

  return !isRealMovieTitle(cleanArchiveMovieTitle(title), identifier);
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
    qParts.push('NOT "mc-media-file"');
    qParts.push('NOT "All movies collection"');
    qParts.push('NOT MTV');
    qParts.push('NOT quran');
    qParts.push('NOT trailers');
    qParts.push('NOT trailer');
    qParts.push('NOT teaser');
  } else if (collectionScope === 'latest_2026') {
    qParts.push('collection:(feature_films OR computerchronicles)');
    qParts.push('NOT "All episodes"');
    qParts.push('NOT MTV');
    qParts.push('NOT quran');
    qParts.push('NOT xvideos');
    qParts.push('NOT trailers');
    qParts.push('NOT trailer');
    qParts.push('NOT teaser');
  } else if (collectionScope === 'luganda') {
    qParts.push(lugandaClauses);
    qParts.push('NOT "mc-media-file"');
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
      const rawTitle = stripHtmlAndTruncate(d.title || d.identifier, 140);
      const id = String(d.identifier);
      if (isUnwantedArchiveNoise(rawTitle, id)) return false;
      return isRealMovieTitle(cleanArchiveMovieTitle(rawTitle), id);
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
        title: cleanArchiveMovieTitle(title),
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

export async function searchCustomArchiveSource(
  filterClause: string
): Promise<ArchiveSearchCandidate[]> {
  const cleanClause = filterClause.trim();
  if (!cleanClause) return [];

  const qParts = [
    'mediatype:movies',
    'format:MPEG4',
    `(${cleanClause})`,
    'NOT MTV',
    'NOT quran',
    'NOT xvideos',
  ];

  const params = new URLSearchParams({
    q: qParts.join(' AND '),
    rows: '20',
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
  params.append('sort[]', 'publicdate desc');

  const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Internet Archive feed returned HTTP ${res.status}.`);
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

  return (json.response?.docs || [])
    .filter((d) => {
      if (!d.identifier) return false;
      const rawTitle = stripHtmlAndTruncate(d.title || d.identifier, 140);
      const id = String(d.identifier);
      if (isUnwantedArchiveNoise(rawTitle, id)) return false;
      return isRealMovieTitle(cleanArchiveMovieTitle(rawTitle), id);
    })
    .slice(0, 12)
    .map((d) => {
      const id = String(d.identifier);
      const rawYear = Array.isArray(d.year) ? d.year[0] : d.year;
      const explicitYear = String(rawYear || '').match(/\d{4}/)?.[0];
      const title = cleanArchiveMovieTitle(stripHtmlAndTruncate(d.title || id, 140));
      const titleYear = title.match(/\b(202[0-9]|201[0-9])\b/)?.[0];
      const pubYear = String(d.publicdate || '').match(/\d{4}/)?.[0];
      const normalizedYear = explicitYear || titleYear || pubYear || '2026';
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
    `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
    { signal: AbortSignal.timeout(10000) }
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

  const rawUnfilteredTitle =
    stripHtmlAndTruncate(data.metadata?.title || identifier, 140) || identifier;
  const rawTitle = cleanArchiveMovieTitle(rawUnfilteredTitle);
  const rawYearCandidate = Array.isArray(data.metadata?.year)
    ? data.metadata?.year[0]
    : data.metadata?.year ||
      (Array.isArray(data.metadata?.date) ? data.metadata?.date[0] : data.metadata?.date) ||
      (Array.isArray(data.metadata?.publicdate)
        ? data.metadata?.publicdate[0]
        : data.metadata?.publicdate);
  const yearMatch = String(rawYearCandidate || '').match(/\d{4}/);
  const titleYearMatch = rawUnfilteredTitle.match(/\b(202[0-9]|201[0-9])\b/);
  const releaseYear = yearMatch?.[0] || titleYearMatch?.[0] || '2026';

  const durationSeconds = parseDurationToSeconds(chosen.length);
  const durationLabel = formatDurationSeconds(chosen.length);
  const fileSizeBytes = Number(chosen.size || 0);
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
  const translatorInfo = inferTranslatorFromText(
    `${rawUnfilteredTitle} ${identifier} ${synopsis} ${subjectText}`
  );
  const category = inferCategory(
    data.metadata?.collection,
    rawTitle,
    durationLabel,
    translatorInfo.language
  );
  const genre = inferGenreFromMetadata(`${rawUnfilteredTitle} ${synopsis} ${subjectText}`, category);

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
    durationSeconds,
    fileSizeBytes: Number.isFinite(fileSizeBytes) ? fileSizeBytes : 0,
  };
}
