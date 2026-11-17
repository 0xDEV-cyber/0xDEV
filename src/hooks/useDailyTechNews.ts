import { useCallback, useEffect, useState } from 'react';
import { BlogArticle, BlogCategory, BlogSection } from '../data/blogData';

export interface DailyWireHeadline {
  id: string;
  title: string;
  url: string;
  discussionUrl: string;
  author: string;
  points: number;
  commentsCount: number;
  domain: string;
  publishedAt: string;
}

export interface LiveNewsArticle extends BlogArticle {
  isLiveNews: true;
  externalId: number;
  externalUrl: string;
  sourceName: string;
  reactionsCount: number;
}

interface CachedDailyFeed {
  dateKey: string;
  fetchedAtIso: string;
  liveArticles: LiveNewsArticle[];
  headlines: DailyWireHeadline[];
}

const STORAGE_KEY = 'oxdev_daily_tech_wire_v1';

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Today';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'news.ycombinator.com';
  }
}

function mapTagsToCategory(tags: string[]): BlogCategory {
  const joined = tags.join(' ').toLowerCase();
  if (/(security|cyber|auth|zero|crypto|privacy|iam)/.test(joined)) return 'Security';
  if (/(fintech|payment|bank|ledger|finance|stripe|billing)/.test(joined)) {
    return 'Fintech Systems';
  }
  if (/(mobile|flutter|android|ios|reactnative|sqlite|offline)/.test(joined)) {
    return 'Mobile & Offline';
  }
  if (/(devops|cloud|aws|docker|kubernetes|terraform|linux|ci|cd)/.test(joined)) {
    return 'Cloud & DevOps';
  }
  return 'Architecture';
}

const FALLBACK_COVERS: Record<BlogCategory, string> = {
  'Fintech Systems': '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
  'Cloud & DevOps': '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
  'Mobile & Offline': '/src/assets/images/blog_offline_sync_1794909287812.jpg',
  Security: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
  Architecture: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
};

function parseMarkdownToSections(markdown: string): {
  sections: BlogSection[];
  codeExample?: { filename: string; language: string; code: string };
} {
  const codeBlockMatch = markdown.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
  const codeExample = codeBlockMatch
    ? {
        filename: `dispatch/snippet.${(codeBlockMatch[1] || 'txt').toLowerCase()}`,
        language: (codeBlockMatch[1] || 'text').toLowerCase(),
        code: codeBlockMatch[2].trim().slice(0, 3500),
      }
    : undefined;

  // Strip fenced code blocks and markdown syntax for clean editorial prose
  const cleanText = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();

  const lines = cleanText.split('\n');
  const sections: BlogSection[] = [];
  let currentHeading = 'Technical Overview';
  let currentParagraphs: string[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    const joined = buffer
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (joined.length > 25 && !joined.startsWith('---')) {
      currentParagraphs.push(joined);
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#')) {
      flushParagraph();
      if (currentParagraphs.length > 0) {
        sections.push({
          id: `sec-${sections.length + 1}`,
          heading: currentHeading,
          paragraphs: currentParagraphs.slice(0, 6),
        });
      }
      currentHeading = line.replace(/^#+\s*/, '').slice(0, 120) || 'Engineering Notes';
      currentParagraphs = [];
    } else if (line === '') {
      flushParagraph();
    } else {
      const cleanedLine = line.replace(/^[-*>]\s+/, '');
      buffer.push(cleanedLine);
    }
  }
  flushParagraph();
  if (currentParagraphs.length > 0) {
    sections.push({
      id: `sec-${sections.length + 1}`,
      heading: currentHeading,
      paragraphs: currentParagraphs.slice(0, 6),
    });
  }

  return {
    sections: sections.slice(0, 6),
    codeExample,
  };
}

export async function fetchLiveDevArticleDetail(
  articleId: number
): Promise<{
  sections: BlogSection[];
  codeExample?: { filename: string; language: string; code: string };
} | null> {
  try {
    const res = await fetch(`https://dev.to/api/articles/${articleId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { body_markdown?: string };
    if (!data.body_markdown) return null;
    return parseMarkdownToSections(data.body_markdown);
  } catch {
    return null;
  }
}

export function extractExternalDevIdFromSlug(slug: string): number | null {
  const match = slug.match(/^news-dev-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export async function fetchLiveDevArticleById(articleId: number): Promise<LiveNewsArticle | null> {
  try {
    const res = await fetch(`https://dev.to/api/articles/${articleId}`);
    if (!res.ok) return null;
    const raw = (await res.json()) as {
      id: number;
      title: string;
      description?: string;
      url: string;
      published_at: string;
      reading_time_minutes?: number;
      cover_image?: string | null;
      tag_list?: string[] | string;
      public_reactions_count?: number;
      user?: { name?: string };
      body_markdown?: string;
    };

    const tags = Array.isArray(raw.tag_list)
      ? raw.tag_list
      : String(raw.tag_list || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
    const category = mapTagsToCategory(tags);
    const parsed = raw.body_markdown
      ? parseMarkdownToSections(raw.body_markdown)
      : {
          sections: [
            {
              id: 'overview',
              heading: 'Daily Engineering Dispatch',
              paragraphs: [raw.description || raw.title],
            },
          ],
        };

    return {
      id: `news-dev-${raw.id}`,
      slug: `news-dev-${raw.id}`,
      title: raw.title,
      excerpt: raw.description || 'Daily technical dispatch curated for software engineers.',
      category,
      authorName: raw.user?.name || 'Engineering Contributor',
      authorRole: 'DEV Community · Daily Wire',
      publishedDate: formatShortDate(raw.published_at),
      readTimeMinutes: Math.max(2, Number(raw.reading_time_minutes || 4)),
      featured: false,
      coverImage: raw.cover_image || FALLBACK_COVERS[category],
      stackTags: tags.length > 0 ? tags.slice(0, 4) : [category],
      keyTakeaways: [
        `Curated from the daily ${category.toLowerCase()} engineering wire.`,
        'Original source link and author attribution preserved below.',
      ],
      sections:
        parsed.sections.length > 0
          ? parsed.sections
          : [
              {
                id: 'summary',
                heading: 'Article Summary',
                paragraphs: [raw.description || raw.title],
              },
            ],
      codeExample: parsed.codeExample,
      isLiveNews: true,
      externalId: raw.id,
      externalUrl: raw.url,
      sourceName: 'DEV Community',
      reactionsCount: Number(raw.public_reactions_count || 0),
    };
  } catch {
    return null;
  }
}

export function useDailyTechNews() {
  const todayKey = getTodayDateKey();

  const [liveArticles, setLiveArticles] = useState<LiveNewsArticle[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CachedDailyFeed;
      return parsed.dateKey === todayKey && Array.isArray(parsed.liveArticles)
        ? parsed.liveArticles
        : [];
    } catch {
      return [];
    }
  });

  const [headlines, setHeadlines] = useState<DailyWireHeadline[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CachedDailyFeed;
      return parsed.dateKey === todayKey && Array.isArray(parsed.headlines)
        ? parsed.headlines
        : [];
    } catch {
      return [];
    }
  });

  const [lastUpdatedIso, setLastUpdatedIso] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedDailyFeed;
      return parsed.dateKey === todayKey ? parsed.fetchedAtIso : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyFeed = useCallback(async (force = false) => {
    const activeDateKey = getTodayDateKey();

    if (!force) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as CachedDailyFeed;
          if (
            cached.dateKey === activeDateKey &&
            (cached.liveArticles.length > 0 || cached.headlines.length > 0)
          ) {
            setLiveArticles(cached.liveArticles);
            setHeadlines(cached.headlines);
            setLastUpdatedIso(cached.fetchedAtIso);
            return;
          }
        }
      } catch {
        // Ignore corrupt cache
      }
    }

    setLoading(true);
    setError(null);

    try {
      const [archRes, devopsRes, secRes, tsRes, hnRes] = await Promise.allSettled([
        fetch('https://dev.to/api/articles?tag=architecture&top=3&per_page=4'),
        fetch('https://dev.to/api/articles?tag=devops&top=3&per_page=4'),
        fetch('https://dev.to/api/articles?tag=security&top=3&per_page=4'),
        fetch('https://dev.to/api/articles?tag=typescript&top=3&per_page=4'),
        fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8'),
      ]);

      const rawDevArticles: Array<{
        id: number;
        title: string;
        description?: string;
        url: string;
        published_at: string;
        reading_time_minutes?: number;
        cover_image?: string | null;
        tag_list?: string[];
        public_reactions_count?: number;
        user?: { name?: string };
      }> = [];

      for (const result of [archRes, devopsRes, secRes, tsRes]) {
        if (result.status === 'fulfilled' && result.value.ok) {
          const items = await result.value.json();
          if (Array.isArray(items)) {
            rawDevArticles.push(...items);
          }
        }
      }

      const seenIds = new Set<number>();
      const mappedArticles: LiveNewsArticle[] = [];

      for (const item of rawDevArticles) {
        if (!item?.id || seenIds.has(item.id) || !item.title) continue;
        seenIds.add(item.id);
        const tags = Array.isArray(item.tag_list) ? item.tag_list : [];
        const category = mapTagsToCategory(tags);
        const description = (item.description || '').trim();

        mappedArticles.push({
          id: `news-dev-${item.id}`,
          slug: `news-dev-${item.id}`,
          title: item.title,
          excerpt:
            description ||
            `Daily engineering dispatch in ${category} sourced from the developer community.`,
          category,
          authorName: item.user?.name || 'Engineering Contributor',
          authorRole: 'DEV Community · Daily Wire',
          publishedDate: formatShortDate(item.published_at),
          readTimeMinutes: Math.max(2, Number(item.reading_time_minutes || 4)),
          featured: false,
          coverImage: item.cover_image || FALLBACK_COVERS[category],
          stackTags: tags.length > 0 ? tags.slice(0, 4) : [category],
          keyTakeaways: [
            `Auto-synced daily from the ${category} engineering feed.`,
            'Full text loads dynamically inside the 0xDEV reader view.',
          ],
          sections: [
            {
              id: 'overview',
              heading: 'Dispatch Overview',
              paragraphs: [
                description || item.title,
                'Loading full technical breakdown from the original dispatch...',
              ],
            },
          ],
          isLiveNews: true,
          externalId: item.id,
          externalUrl: item.url,
          sourceName: 'DEV Community',
          reactionsCount: Number(item.public_reactions_count || 0),
        });
      }

      mappedArticles.sort((a, b) => b.reactionsCount - a.reactionsCount);
      const topArticles = mappedArticles.slice(0, 9);

      let mappedHeadlines: DailyWireHeadline[] = [];
      if (hnRes.status === 'fulfilled' && hnRes.value.ok) {
        const hnData = (await hnRes.value.json()) as {
          hits?: Array<{
            objectID: string;
            title?: string;
            url?: string;
            author?: string;
            points?: number;
            num_comments?: number;
            created_at?: string;
          }>;
        };
        if (Array.isArray(hnData.hits)) {
          mappedHeadlines = hnData.hits
            .filter((h) => Boolean(h.title))
            .slice(0, 8)
            .map((h) => {
              const targetUrl =
                h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
              return {
                id: h.objectID,
                title: h.title || 'Engineering News Item',
                url: targetUrl,
                discussionUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
                author: h.author || 'contributor',
                points: Number(h.points || 0),
                commentsCount: Number(h.num_comments || 0),
                domain: extractDomain(targetUrl),
                publishedAt: formatShortDate(h.created_at || new Date().toISOString()),
              };
            });
        }
      }

      if (topArticles.length === 0 && mappedHeadlines.length === 0) {
        setError('Live news sources are temporarily unreachable. Showing 0xDEV flagship briefs.');
      } else {
        const fetchedAtIso = new Date().toISOString();
        setLiveArticles(topArticles);
        setHeadlines(mappedHeadlines);
        setLastUpdatedIso(fetchedAtIso);

        try {
          const payload: CachedDailyFeed = {
            dateKey: activeDateKey,
            fetchedAtIso,
            liveArticles: topArticles,
            headlines: mappedHeadlines,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Ignore storage quota errors
        }
      }
    } catch {
      setError('Unable to sync daily tech news right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDailyFeed(false);
  }, [fetchDailyFeed]);

  // Automatically check on focus/visibility if UTC calendar day rolled over
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          void fetchDailyFeed(false);
          return;
        }
        const cached = JSON.parse(raw) as CachedDailyFeed;
        if (cached.dateKey !== getTodayDateKey()) {
          void fetchDailyFeed(true);
        }
      } catch {
        void fetchDailyFeed(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchDailyFeed]);

  return {
    liveArticles,
    headlines,
    loading,
    error,
    lastUpdatedIso,
    todayDateKey: todayKey,
    refreshFeed: () => fetchDailyFeed(true),
  };
}
