export type MovieCategory =
  | 'Open Classics'
  | 'Indie & Regional'
  | 'Tech Documentaries'
  | 'Short Films';

export type MovieQualityLabel = '480p Lite' | '720p HD' | '1080p Full HD';

export type MovieGenre =
  | 'Action'
  | 'Adventure'
  | 'Animation'
  | 'Comedy'
  | 'Crime'
  | 'Documentary'
  | 'Horror'
  | 'Romance'
  | 'Sci-Fi'
  | 'Thriller';

export const MOVIE_CATEGORIES: MovieCategory[] = [
  'Open Classics',
  'Indie & Regional',
  'Tech Documentaries',
  'Short Films',
];

export const MOVIE_QUALITY_OPTIONS: MovieQualityLabel[] = [
  '480p Lite',
  '720p HD',
  '1080p Full HD',
];

export const MOVIE_GENRES: MovieGenre[] = [
  'Action',
  'Thriller',
  'Adventure',
  'Horror',
  'Crime',
  'Sci-Fi',
  'Romance',
  'Animation',
  'Comedy',
  'Documentary',
];

/**
 * Core structured schema for downloadable & streamable movies.
 */
export interface MovieSchema {
  movieId: string;
  title: string;
  releaseYear: string;
  genre: MovieGenre | string;
  coverArtUrl: string;
  downloadUrl: string;
}

/**
 * Full persisted catalog record synced with firebase-blueprint.json (/movies/{movieId}).
 */
export interface MovieItem extends MovieSchema {
  category: MovieCategory;
  language: string;
  vjTranslator: string;
  durationLabel: string;
  qualityLabel: MovieQualityLabel;
  fileSizeLabel: string;
  synopsis: string;
  posterUrl: string;
  videoUrl: string;
  published: boolean;
  createdAtMs: number;
}

export const MOVIE_FIELD_LIMITS = {
  titleMin: 2,
  titleMax: 140,
  genreMin: 2,
  genreMax: 60,
  languageMax: 60,
  vjTranslatorMax: 80,
  releaseYearMin: 4,
  releaseYearMax: 12,
  durationMin: 2,
  durationMax: 30,
  fileSizeMin: 2,
  fileSizeMax: 30,
  synopsisMin: 10,
  synopsisMax: 800,
  coverArtMin: 4,
  coverArtMax: 500,
  downloadMin: 8,
  downloadMax: 1000,
} as const;

export const COVER_ART_URL_PATTERN = /^(https:\/\/.*|\/src\/assets\/images\/.*)$/;
export const DOWNLOAD_URL_PATTERN = /^https:\/\/.*/;

export function inferCategoryFallbackGenre(category: MovieCategory): MovieGenre {
  switch (category) {
    case 'Tech Documentaries':
      return 'Documentary';
    case 'Short Films':
      return 'Animation';
    case 'Indie & Regional':
      return 'Action';
    case 'Open Classics':
    default:
      return 'Adventure';
  }
}

export function inferTranslatorFromText(rawText: string): {
  language: string;
  vjTranslator: string;
} {
  const lower = rawText.toLowerCase();
  const vjMatches: [RegExp, string][] = [
    [/vj\s*junior|vj\s*juniour/i, 'VJ Junior'],
    [/vj\s*mark/i, 'VJ Mark'],
    [/vj\s*ice\s*p|icep/i, 'VJ Ice P'],
    [/vj\s*jingo|vj\s*jinggo/i, 'VJ Jingo'],
    [/vj\s*emmy|vj\s*emmie/i, 'VJ Emmy'],
    [/vj\s*mande/i, 'VJ Mande'],
    [/vj\s*saul/i, 'VJ Saul'],
    [/vj\s*ulio/i, 'VJ Ulio'],
    [/vj\s*neil/i, 'VJ Neil'],
  ];

  for (const [regex, label] of vjMatches) {
    if (regex.test(lower)) {
      return {
        language: 'Luganda Translated',
        vjTranslator: label,
      };
    }
  }

  if (lower.includes('luganda') || lower.includes('enjogerere') || lower.includes('wakaliwood')) {
    return {
      language: 'Luganda Translated',
      vjTranslator: lower.includes('wakaliwood') ? 'VJ Emmie · Wakaliwood' : 'Luganda VJ',
    };
  }

  return {
    language: 'English',
    vjTranslator: 'Original Audio',
  };
}

function isValidStrictHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function validateMovieSchemaPayload(input: {
  title: string;
  releaseYear: string;
  genre: string;
  coverArtUrl: string;
  downloadUrl: string;
  durationLabel: string;
  fileSizeLabel: string;
  synopsis: string;
}): string | null {
  if (input.title.trim().length < MOVIE_FIELD_LIMITS.titleMin) {
    return 'Movie title must be at least 2 characters.';
  }
  if (input.releaseYear.trim().length < MOVIE_FIELD_LIMITS.releaseYearMin) {
    return 'Release year must be at least 4 characters (e.g. 2022).';
  }
  if (input.genre.trim().length < MOVIE_FIELD_LIMITS.genreMin) {
    return 'Movie genre must be at least 2 characters.';
  }
  if (
    input.durationLabel.trim().length < MOVIE_FIELD_LIMITS.durationMin ||
    input.fileSizeLabel.trim().length < MOVIE_FIELD_LIMITS.fileSizeMin
  ) {
    return 'Please enter runtime duration (e.g. 1h 32m) and approximate download file size (e.g. 312 MB).';
  }
  if (input.synopsis.trim().length < MOVIE_FIELD_LIMITS.synopsisMin) {
    return 'Synopsis must be at least 10 characters.';
  }
  const cleanDownload = input.downloadUrl.trim();
  if (
    !DOWNLOAD_URL_PATTERN.test(cleanDownload) ||
    cleanDownload.length < MOVIE_FIELD_LIMITS.downloadMin ||
    !isValidStrictHttpsUrl(cleanDownload)
  ) {
    return 'Download link must be a valid direct https:// MP4 or WebM URL.';
  }
  const cleanCover = input.coverArtUrl.trim();
  const isPresetCover = cleanCover.startsWith('/src/assets/images/');
  if (
    !COVER_ART_URL_PATTERN.test(cleanCover) ||
    cleanCover.length < MOVIE_FIELD_LIMITS.coverArtMin ||
    (!isPresetCover && !isValidStrictHttpsUrl(cleanCover))
  ) {
    return 'Cover art URL must be a preset or valid https:// image URL.';
  }
  return null;
}

export function normalizeMovieRecord(raw: Partial<MovieItem> & { movieId: string }): MovieItem {
  const category = MOVIE_CATEGORIES.includes(raw.category as MovieCategory)
    ? (raw.category as MovieCategory)
    : 'Indie & Regional';
  const qualityLabel = MOVIE_QUALITY_OPTIONS.includes(raw.qualityLabel as MovieQualityLabel)
    ? (raw.qualityLabel as MovieQualityLabel)
    : '480p Lite';
  const coverArtUrl = (raw.coverArtUrl || raw.posterUrl || '/src/assets/images/movies_cinema_hub_1795014042309.jpg').slice(
    0,
    MOVIE_FIELD_LIMITS.coverArtMax
  );
  const downloadUrl = (raw.downloadUrl || raw.videoUrl || '').slice(
    0,
    MOVIE_FIELD_LIMITS.downloadMax
  );
  const inferredMeta = inferTranslatorFromText(`${raw.title || ''} ${raw.synopsis || ''} ${raw.vjTranslator || ''}`);
  const language = (raw.language || inferredMeta.language).slice(0, MOVIE_FIELD_LIMITS.languageMax);
  const vjTranslator = (raw.vjTranslator || inferredMeta.vjTranslator).slice(
    0,
    MOVIE_FIELD_LIMITS.vjTranslatorMax
  );
  const genre = (raw.genre || inferCategoryFallbackGenre(category)).slice(
    0,
    MOVIE_FIELD_LIMITS.genreMax
  );

  return {
    movieId: raw.movieId,
    title: (raw.title || 'Untitled Film').slice(0, MOVIE_FIELD_LIMITS.titleMax),
    releaseYear: (raw.releaseYear || '2024').slice(0, MOVIE_FIELD_LIMITS.releaseYearMax),
    genre,
    coverArtUrl,
    downloadUrl,
    category,
    language,
    vjTranslator,
    durationLabel: (raw.durationLabel || '1h 30m').slice(0, MOVIE_FIELD_LIMITS.durationMax),
    qualityLabel,
    fileSizeLabel: (raw.fileSizeLabel || '350 MB').slice(0, MOVIE_FIELD_LIMITS.fileSizeMax),
    synopsis: (raw.synopsis || '').slice(0, MOVIE_FIELD_LIMITS.synopsisMax),
    posterUrl: coverArtUrl,
    videoUrl: downloadUrl,
    published: Boolean(raw.published ?? true),
    createdAtMs: typeof raw.createdAtMs === 'number' ? raw.createdAtMs : Date.now(),
  };
}
