import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Copy,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  Terminal,
  User,
} from 'lucide-react';
import { BLOG_CATEGORIES, BlogArticle, BlogCategory } from '../data/blogData';
import { PageRoute } from '../data/siteData';
import { useBlogPosts } from '../hooks/useBlogPosts';
import {
  extractExternalDevIdFromSlug,
  fetchLiveDevArticleById,
  fetchLiveDevArticleDetail,
  LiveNewsArticle,
  useDailyTechNews,
} from '../hooks/useDailyTechNews';
import { EASE_OUT_EXPO, Reveal } from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface BlogPageProps {
  selectedSlug: string | null;
  onSelectArticle: (slug: string | null) => void;
  onNavigate: (page: PageRoute) => void;
}

type FeedScope = 'all' | 'originals' | 'daily-wire';

function isLiveNewsArticle(article: BlogArticle): article is LiveNewsArticle {
  return Boolean((article as LiveNewsArticle).isLiveNews);
}

const ArticleCoverVisual: React.FC<{
  src: string;
  alt: string;
  category: string;
  aspectClass?: string;
}> = ({ src, alt, category, aspectClass = 'aspect-[16/9]' }) => {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  return (
    <div
      className={`relative w-full overflow-hidden border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] ${aspectClass}`}
    >
      {!errored ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F6F7FB] dark:bg-[#101530] p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A1464] dark:bg-[#232B6E] text-white">
            <Terminal className="h-5 w-5 text-[#EE1119]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#1A1464] dark:text-[#F4F6FC]">
            0xDEV // {category}
          </p>
        </div>
      )}
    </div>
  );
};

const ArticleDetailView: React.FC<{
  article: BlogArticle;
  relatedArticles: BlogArticle[];
  onBack: () => void;
  onSelectArticle: (slug: string) => void;
  onNavigate: (page: PageRoute) => void;
}> = ({ article, relatedArticles, onBack, onSelectArticle, onNavigate }) => {
  const [readProgress, setReadProgress] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hydratedSections, setHydratedSections] = useState(article.sections);
  const [hydratedCode, setHydratedCode] = useState(article.codeExample);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const liveMeta = isLiveNewsArticle(article) ? article : null;

  useEffect(() => {
    document.title = `${article.title} — 0xDEV Blog`;
  }, [article.title]);

  useEffect(() => {
    setHydratedSections(article.sections);
    setHydratedCode(article.codeExample);

    if (!liveMeta) return;
    let cancelled = false;
    setLoadingDetail(true);
    void fetchLiveDevArticleDetail(liveMeta.externalId).then((detail) => {
      if (cancelled) return;
      if (detail) {
        if (detail.sections.length > 0) setHydratedSections(detail.sections);
        if (detail.codeExample) setHydratedCode(detail.codeExample);
      }
      setLoadingDetail(false);
    });
    return () => {
      cancelled = true;
    };
  }, [article, liveMeta]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setReadProgress(0);
        return;
      }
      setReadProgress(Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, [article.slug]);

  const handleCopyCode = async () => {
    if (!hydratedCode) return;
    try {
      await navigator.clipboard.writeText(hydratedCode.code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleShareLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <>
      {/* Fixed Article Reading Depth Bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none print:hidden"
      >
        <div
          className="h-full bg-[#EE1119] transition-[width] duration-100"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Editorial Article Header */}
      <section className="relative overflow-hidden border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] pt-10 pb-14 sm:pt-14 sm:pb-16 transition-colors">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-full w-64 translate-x-24 -skew-x-12 bg-white/70 dark:bg-[#141A38]/80 hidden lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-56 h-full w-1.5 -skew-x-12 bg-[#EE1119]/80 hidden lg:block"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>All Engineering Insights</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {liveMeta && (
                <a
                  href={liveMeta.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]"
                >
                  <span>Original on {liveMeta.sourceName}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={() => void handleShareLink()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                    <span>Copy Article Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-7 max-w-4xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
              <span className="text-[#EE1119] font-bold">
                {liveMeta ? `${liveMeta.sourceName} · ${article.category}` : article.category}
              </span>
              <span className="mx-2 text-[#E5E7F0] dark:text-[#242C54]" aria-hidden="true">/</span>
              <span>{article.publishedDate}</span>
              <span className="mx-2 text-[#E5E7F0] dark:text-[#242C54]" aria-hidden="true">·</span>
              <span>{article.readTimeMinutes} min read</span>
            </p>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="mt-3 font-display text-[clamp(1.85rem,3.6vw,3.15rem)] font-extrabold leading-[1.1] tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance"
            >
              {article.title}
            </motion.h1>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] max-w-3xl">
              {article.excerpt}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7F0] dark:border-[#242C54] pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1464] dark:bg-[#232B6E] font-display text-xs font-extrabold text-white">
                  <User className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                    {article.authorName}
                  </p>
                  <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">{article.authorRole}</p>
                </div>
              </div>

              <p className="font-mono text-xs font-medium text-[#4A4F63] dark:text-[#C2C9E0]">
                {article.stackTags.join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Asymmetric Reading Canvas */}
      <section className="bg-white dark:bg-[#090D1F] py-12 sm:py-16 transition-colors">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
            {/* Main Technical Essay Column */}
            <article className="lg:col-span-8 space-y-10">
              <figure>
                <ArticleCoverVisual
                  src={article.coverImage}
                  alt={`Architectural visual for ${article.title}`}
                  category={article.category}
                  aspectClass="aspect-[16/9] rounded-2xl"
                />
                <figcaption className="mt-2.5 font-mono text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  Fig. 01 — {liveMeta ? `Daily Wire dispatch visual (${liveMeta.sourceName})` : `Systems schematic for ${article.category.toLowerCase()} architecture`} ({article.stackTags.slice(0, 3).join(' · ')})
                </figcaption>
              </figure>

              {loadingDetail && (
                <p className="font-mono text-xs text-[#6B7188] dark:text-[#8E97B8]" role="status">
                  Fetching full technical dispatch from {liveMeta?.sourceName}...
                </p>
              )}

              {hydratedSections.map((section, idx) => (
                <section
                  key={section.id}
                  id={`article-${section.id}`}
                  className="max-w-prose space-y-4 scroll-mt-24"
                >
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119] tabular-nums">
                    0{idx + 1} / {liveMeta ? 'Dispatch Notes' : 'Architecture Notes'}
                  </p>
                  <h2 className="font-display text-2xl sm:text-[1.75rem] font-extrabold leading-tight tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((para, pIdx) => (
                    <p
                      key={`${section.id}-p-${pIdx}`}
                      className={`text-base sm:text-[1.0625rem] leading-[1.8] text-[#4A4F63] dark:text-[#C2C9E0] ${
                        idx === 0 && pIdx === 0
                          ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-5xl first-letter:font-extrabold first-letter:leading-[0.88] first-letter:text-[#1A1464] dark:first-letter:text-white'
                          : ''
                      }`}
                    >
                      {para}
                    </p>
                  ))}
                </section>
              ))}

              {/* Hairline Editorial Callout (No border-l-4) */}
              {article.calloutQuote && (
                <blockquote className="max-w-prose border-y border-[#E5E7F0] dark:border-[#242C54] py-7">
                  <p className="font-display text-xl sm:text-2xl font-bold leading-snug text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                    “{article.calloutQuote}”
                  </p>
                  <footer className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                    0xDEV Engineering Principle · {article.authorName}
                  </footer>
                </blockquote>
              )}

              {/* Copyable Code Reference Block */}
              {hydratedCode && (
                <div className="max-w-prose overflow-hidden rounded-2xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#120D4A] text-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-white/80">
                      <Terminal className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>{hydratedCode.filename}</span>
                      <span className="text-white/35" aria-hidden="true">·</span>
                      <span className="uppercase text-white/55">
                        {hydratedCode.language}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyCode()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-white hover:bg-white/20 transition-colors"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3 w-3 text-[#EE1119]" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-5 font-mono text-xs sm:text-[13px] leading-relaxed text-white/90">
                    <code>{hydratedCode.code}</code>
                  </pre>
                </div>
              )}

              {liveMeta && (
                <div className="max-w-prose rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                    Curated automatically in 0xDEV&apos;s Daily Engineering Wire from{' '}
                    <strong className="text-[#1A1464] dark:text-white">{liveMeta.sourceName}</strong>.
                  </p>
                  <a
                    href={liveMeta.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EE1119] hover:underline"
                  >
                    <span>Read original publication</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              )}
            </article>

            {/* Sticky Margin Sidebar: Takeaways, Outline & Consultation */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              {/* Key Takeaways Box (Full 1px hairline border) */}
              <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Key Engineering Takeaways
                </p>
                <ol className="mt-4 space-y-4">
                  {article.keyTakeaways.map((point, index) => (
                    <li
                      key={`${article.id}-takeaway-${index}`}
                      className="flex items-start gap-3 border-t border-[#E5E7F0] dark:border-[#242C54] pt-3 first:border-t-0 first:pt-0"
                    >
                      <span className="font-mono text-xs font-bold text-[#1A1464] dark:text-[#9FA8FF] tabular-nums pt-0.5">
                        0{index + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">{point}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Section Outline Navigation */}
              {hydratedSections.length > 0 && (
                <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                    In This Brief
                  </p>
                  <nav aria-label="Article section outline" className="mt-3 space-y-2.5">
                    {hydratedSections.map((section, idx) => (
                      <a
                        key={`toc-${section.id}`}
                        href={`#article-${section.id}`}
                        className="flex items-start gap-2.5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                      >
                        <span className="font-mono text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums pt-0.5">
                          0{idx + 1}
                        </span>
                        <span>{section.heading}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Contextual Architecture Consultation Card */}
              <div className="relative overflow-hidden rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] p-6 text-white">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-6 h-1.5 w-20 -skew-x-24 bg-[#EE1119]"
                />
                <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Need This Built?
                </p>
                <h3 className="mt-2 font-display text-lg font-extrabold text-white">
                  Architect your system with 0xDEV.
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/80">
                  Our engineering team designs, ships, and maintains{' '}
                  {article.category.toLowerCase()} infrastructure under a single accountable
                  contract.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#D00D14]"
                >
                  <span>Discuss This Architecture</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Related Technical Articles */}
      {relatedArticles.length > 0 && (
        <section className="border-t border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] py-16 transition-colors">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Continue Reading
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Related Engineering Insights
                </h2>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
              >
                <span>View all articles</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
              {relatedArticles.map((rel) => (
                <article
                  key={rel.id}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 transition-colors hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      <span className="text-[#EE1119] font-bold">{rel.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>{rel.readTimeMinutes} min read</span>
                    </p>
                    <h3 className="mt-2.5 font-display text-lg font-bold leading-snug text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors">
                      <a
                        href={`/blog/${rel.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectArticle(rel.slug);
                        }}
                      >
                        {rel.title}
                      </a>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-3">
                      {rel.excerpt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectArticle(rel.slug)}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};

export const BlogPage: React.FC<BlogPageProps> = ({
  selectedSlug,
  onSelectArticle,
  onNavigate,
}) => {
  const { articles } = useBlogPosts();
  const {
    liveArticles,
    headlines,
    loading: newsLoading,
    error: newsError,
    lastUpdatedIso,
    refreshFeed,
  } = useDailyTechNews();

  const [selectedCategory, setSelectedCategory] = useState<'All' | BlogCategory>('All');
  const [feedScope, setFeedScope] = useState<FeedScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedDirectArticle, setResolvedDirectArticle] = useState<LiveNewsArticle | null>(
    null
  );

  const combinedArticles = useMemo<BlogArticle[]>(() => {
    if (feedScope === 'originals') return articles;
    if (feedScope === 'daily-wire') return liveArticles;
    return [...articles, ...liveArticles];
  }, [articles, liveArticles, feedScope]);

  const allPool = useMemo<BlogArticle[]>(
    () => [...articles, ...liveArticles],
    [articles, liveArticles]
  );

  // Handle direct deep-link refresh to /blog/news-dev-<id>
  useEffect(() => {
    setResolvedDirectArticle(null);
    if (!selectedSlug) return;
    if (allPool.some((a) => a.slug === selectedSlug)) return;

    const extId = extractExternalDevIdFromSlug(selectedSlug);
    if (!extId) return;

    let cancelled = false;
    void fetchLiveDevArticleById(extId).then((fetched) => {
      if (!cancelled && fetched) {
        setResolvedDirectArticle(fetched);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSlug, allPool]);

  const activeArticle = useMemo(() => {
    if (!selectedSlug) return null;
    return allPool.find((a) => a.slug === selectedSlug) || resolvedDirectArticle;
  }, [allPool, selectedSlug, resolvedDirectArticle]);

  const relatedArticles = useMemo(() => {
    if (!activeArticle) return [];
    return allPool
      .filter((a) => a.slug !== activeArticle.slug)
      .sort((a, b) =>
        a.category === activeArticle.category && b.category !== activeArticle.category ? -1 : 1
      )
      .slice(0, 3);
  }, [allPool, activeArticle]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedArticles.filter((article) => {
      const matchesCat =
        selectedCategory === 'All' || article.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q) ||
        article.stackTags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [combinedArticles, selectedCategory, searchQuery]);

  const filteredHeadlines = useMemo(() => {
    if (feedScope === 'originals') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return headlines;
    return headlines.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.domain.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q)
    );
  }, [headlines, feedScope, searchQuery]);

  const featuredLead = useMemo(() => {
    if (
      selectedCategory !== 'All' ||
      searchQuery.trim() !== '' ||
      feedScope === 'daily-wire'
    ) {
      return null;
    }
    return articles.find((a) => a.featured) || articles[0] || null;
  }, [articles, selectedCategory, searchQuery, feedScope]);

  const gridArticles = useMemo(() => {
    if (!featuredLead) return filteredArticles;
    return filteredArticles.filter((a) => a.slug !== featuredLead.slug);
  }, [filteredArticles, featuredLead]);

  const formattedSyncTime = useMemo(() => {
    if (!lastUpdatedIso) return 'Daily auto-sync active';
    const d = new Date(lastUpdatedIso);
    if (Number.isNaN(d.getTime())) return 'Synced today';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }, [lastUpdatedIso]);

  if (activeArticle) {
    return (
      <ArticleDetailView
        article={activeArticle}
        relatedArticles={relatedArticles}
        onBack={() => onSelectArticle(null)}
        onSelectArticle={(slug) => onSelectArticle(slug)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Engineering Blog & Daily Tech Wire"
        title="Field-tested insights & daily software engineering dispatches."
        description="Original 0xDEV architectural deep dives paired with an automated daily engineering news wire curated from top developer publications and front-page systems threads."
        currentLabel="Blog"
        onNavigate={onNavigate}
      />

      {/* Filter, Scope & Daily Sync Utility Bar */}
      <section className="border-b border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#090D1F] py-6 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Top Utility Line: Source Scope + Daily Sync Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1"
              role="tablist"
              aria-label="Filter by article source"
            >
              {[
                { id: 'all' as FeedScope, label: `All (${articles.length + liveArticles.length})` },
                { id: 'originals' as FeedScope, label: `0xDEV Originals (${articles.length})` },
                { id: 'daily-wire' as FeedScope, label: `Daily Tech Wire (${liveArticles.length})` },
              ].map((tab) => {
                const isActive = feedScope === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFeedScope(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                        : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                Auto-updates daily · {formattedSyncTime}
              </p>
              <button
                type="button"
                onClick={() => void refreshFeed()}
                disabled={newsLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3 py-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8] hover:bg-white dark:hover:bg-[#182044] disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#EE1119] ${newsLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{newsLoading ? 'Syncing Wire...' : 'Refresh Feed'}</span>
              </button>
            </div>
          </div>

          {/* Topic Filter Tabs + Search Input */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="overflow-x-auto pb-1 lg:pb-0">
              <div
                className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1.5"
                role="tablist"
                aria-label="Filter engineering articles by topic"
              >
                {BLOG_CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedCategory(category)}
                      className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="blog-category-tab"
                          aria-hidden="true"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                        />
                      )}
                      <span className="relative z-10">{category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7188] dark:text-[#8E97B8]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search engineering articles and daily tech news"
                placeholder="Search articles, stacks, or headlines..."
                className="w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530] py-2.5 pl-10 pr-4 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188] dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044] transition-colors"
              />
            </div>
          </div>

          {newsError && (
            <p className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]" role="status">
              {newsError}
            </p>
          )}
        </div>
      </section>

      {/* Main Editorial Index */}
      <section className="bg-white dark:bg-[#090D1F] py-14 sm:py-20 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Lead Editorial Feature (Tier 1 Salience) */}
          {featuredLead && (
            <Reveal>
              <article className="group relative grid grid-cols-1 gap-8 overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-8 lg:grid-cols-12 items-stretch">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-8 h-1.5 w-28 -skew-x-24 bg-[#EE1119]"
                />
                <div className="lg:col-span-6">
                  <a
                    href={`/blog/${featuredLead.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectArticle(featuredLead.slug);
                    }}
                    className="block h-full"
                  >
                    <ArticleCoverVisual
                      src={featuredLead.coverImage}
                      alt={`Featured schematic for ${featuredLead.title}`}
                      category={featuredLead.category}
                      aspectClass="aspect-[16/10] h-full rounded-xl"
                    />
                  </a>
                </div>

                <div className="lg:col-span-6 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      <span className="text-[#EE1119] font-bold">
                        Featured · {featuredLead.category}
                      </span>
                      <span className="mx-2">·</span>
                      <span>{featuredLead.publishedDate}</span>
                      <span className="mx-2">·</span>
                      <span>{featuredLead.readTimeMinutes} min read</span>
                    </p>

                    <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold leading-[1.15] tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance group-hover:text-[#EE1119] transition-colors">
                      <a
                        href={`/blog/${featuredLead.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectArticle(featuredLead.slug);
                        }}
                      >
                        {featuredLead.title}
                      </a>
                    </h2>

                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      {featuredLead.excerpt}
                    </p>

                    <p className="mt-4 font-mono text-xs font-medium text-[#1A1464] dark:text-[#9FA8FF]">
                      {featuredLead.stackTags.join(' · ')}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7F0] dark:border-[#242C54] pt-5">
                    <div>
                      <p className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {featuredLead.authorName}
                      </p>
                      <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">{featuredLead.authorRole}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectArticle(featuredLead.slug)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#EE1119]"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Read Full Brief</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            </Reveal>
          )}

          {/* Grid List of Articles (Tier 2 Salience) */}
          {gridArticles.length === 0 && !featuredLead ? (
            <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-10 text-center">
              <p className="font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                {newsLoading && feedScope === 'daily-wire'
                  ? 'Fetching today’s engineering dispatches...'
                  : 'No technical articles matched your current filters.'}
              </p>
              <p className="mt-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                Try clearing your search or switching back to all engineering insights.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setFeedScope('all');
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#EE1119] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3 items-stretch"
            >
              <AnimatePresence mode="popLayout">
                {gridArticles.map((article) => {
                  const liveMeta = isLiveNewsArticle(article) ? article : null;
                  return (
                    <motion.article
                      key={article.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8] hover:shadow-md"
                    >
                      <div>
                        <a
                          href={`/blog/${article.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectArticle(article.slug);
                          }}
                          className="block"
                        >
                          <ArticleCoverVisual
                            src={article.coverImage}
                            alt={`Visual for ${article.title}`}
                            category={article.category}
                            aspectClass="aspect-[16/9] rounded-xl"
                          />
                        </a>

                        <p className="mt-4 font-mono text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                          <span className="text-[#EE1119] font-bold">
                            {liveMeta ? `${liveMeta.sourceName}` : '0xDEV Original'}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span>{article.category}</span>
                          <span className="mx-1.5">·</span>
                          <span>{article.publishedDate}</span>
                        </p>

                        <h2 className="mt-2 font-display text-lg font-extrabold leading-snug text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors">
                          <a
                            href={`/blog/${article.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectArticle(article.slug);
                            }}
                          >
                            {article.title}
                          </a>
                        </h2>

                        <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-3">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-[#E5E7F0] dark:border-[#242C54] pt-4">
                        <p className="font-mono text-[11px] font-medium text-[#6B7188] dark:text-[#8E97B8] truncate">
                          {article.stackTags.join(' · ')}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span>{article.readTimeMinutes} min read</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectArticle(article.slug)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors"
                          >
                            <span>Read Article</span>
                            <ArrowRight
                              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Tier 3 Salience: Today's Industry Headlines (Hacker News Front Page Wire) */}
          {filteredHeadlines.length > 0 && (
            <section
              aria-labelledby="daily-wire-headlines-heading"
              className="border-t border-[#E5E7F0] dark:border-[#242C54] pt-12"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    Today&apos;s Front-Page Engineering Wire
                  </p>
                  <h2
                    id="daily-wire-headlines-heading"
                    className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
                  >
                    Daily Software &amp; Systems News
                  </h2>
                </div>
                <p className="font-mono text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  Live from Hacker News · Refreshes automatically every 24h
                </p>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredHeadlines.map((item, idx) => (
                  <article
                    key={item.id}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] p-5 transition-colors hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8] hover:bg-white dark:hover:bg-[#141A38]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                        <span className="text-[#EE1119] font-bold">
                          0{idx + 1}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{item.domain}</span>
                        <span className="mx-1.5">·</span>
                        <span>{item.points} pts</span>
                      </p>
                      <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.title}
                        </a>
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                        <span>by {item.author}</span>
                        <a
                          href={item.discussionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{item.commentsCount} discussions</span>
                        </a>
                      </div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors group-hover:border-[#1A1464] dark:group-hover:border-[#4F59B8] group-hover:bg-[#1A1464] dark:group-hover:bg-[#2E368F] group-hover:text-white"
                    >
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
