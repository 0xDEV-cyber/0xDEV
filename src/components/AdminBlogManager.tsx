import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { BookOpen, FilePlus2, Plus, Star, Trash2 } from 'lucide-react';
import { BlogCategory } from '../data/blogData';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useBlogPosts } from '../hooks/useBlogPosts';

const CATEGORIES: BlogCategory[] = [
  'Architecture',
  'Fintech Systems',
  'Cloud & DevOps',
  'Mobile & Offline',
  'Security',
];

const COVER_OPTIONS = [
  {
    label: 'Distributed Ledger Diagram',
    value: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
  },
  {
    label: 'Cloud Multi-AZ Topology',
    value: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
  },
  {
    label: 'Offline Edge Sync Architecture',
    value: '/src/assets/images/blog_offline_sync_1794909287812.jpg',
  },
];

function slugifyTitle(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return (cleaned || `engineering-note-${Date.now()}`).slice(0, 110);
}

export const AdminBlogManager: React.FC = () => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';
  const { customPosts, articles } = useBlogPosts();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Architecture');
  const [excerpt, setExcerpt] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(6);
  const [coverImage, setCoverImage] = useState(COVER_OPTIONS[0].value);
  const [stackTags, setStackTags] = useState('TypeScript · PostgreSQL · Cloud');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [section1Heading, setSection1Heading] = useState('Problem Context & System Constraints');
  const [section1Body, setSection1Body] = useState('');
  const [section2Heading, setSection2Heading] = useState('Production Architecture & Tradeoffs');
  const [section2Body, setSection2Body] = useState('');
  const [calloutQuote, setCalloutQuote] = useState('');
  const [codeFilename, setCodeFilename] = useState('src/architecture/example.ts');
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPrimaryAdmin) return null;

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    if (
      title.trim().length < 5 ||
      excerpt.trim().length < 15 ||
      keyTakeaways.trim().length < 10 ||
      section1Heading.trim().length < 3 ||
      section1Body.trim().length < 20 ||
      section2Heading.trim().length < 3 ||
      section2Body.trim().length < 20
    ) {
      setError(
        'Please complete title (5+ chars), excerpt (15+ chars), key takeaways (10+ chars), and both main engineering sections (20+ chars each).'
      );
      return;
    }

    const postId = `POST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const slug = slugifyTitle(title);
    const todayLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(new Date());

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        postId,
        slug: slug.length >= 3 ? slug : `note-${Date.now()}`,
        title: title.trim().slice(0, 160),
        excerpt: excerpt.trim().slice(0, 400),
        category,
        authorName: user?.displayName?.trim().slice(0, 80) || 'Arigye Wisdom',
        authorRole: 'Principal Systems Architect · 0xDEV',
        publishedDate: todayLabel,
        readTimeMinutes: Math.max(1, Math.min(60, Math.round(readTimeMinutes) || 5)),
        featured: false,
        coverImage,
        stackTags: stackTags.trim().slice(0, 200) || 'Engineering',
        keyTakeaways: keyTakeaways.trim().slice(0, 1000),
        section1Heading: section1Heading.trim().slice(0, 140),
        section1Body: section1Body.trim().slice(0, 4000),
        section2Heading: section2Heading.trim().slice(0, 140),
        section2Body: section2Body.trim().slice(0, 4000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (calloutQuote.trim()) {
        payload.calloutQuote = calloutQuote.trim().slice(0, 500);
      }
      if (codeSnippet.trim()) {
        payload.codeFilename = codeFilename.trim().slice(0, 80) || 'snippet.ts';
        payload.codeLanguage = codeLanguage.trim().slice(0, 40) || 'typescript';
        payload.codeSnippet = codeSnippet.trim().slice(0, 4000);
      }

      await setDoc(doc(db, 'blogPosts', postId), payload);

      setTitle('');
      setExcerpt('');
      setKeyTakeaways('');
      setSection1Body('');
      setSection2Body('');
      setCalloutQuote('');
      setCodeSnippet('');
      setShowForm(false);
      setFeedback('Published new technical engineering article to /blog.');
    } catch (err) {
      setError('Unable to publish article.');
      handleFirestoreError(err, OperationType.CREATE, `blogPosts/${postId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (postId: string, currentFeatured: boolean) => {
    try {
      await updateDoc(doc(db, 'blogPosts', postId), {
        featured: !currentFeatured,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `blogPosts/${postId}`);
    }
  };

  const handleDeleteCustom = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'blogPosts', postId));
      setFeedback('Removed custom technical article from /blog.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `blogPosts/${postId}`);
    }
  };

  return (
    <section
      aria-labelledby="admin-blog-heading"
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119] flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Admin Engineering Blog CMS</span>
          </p>
          <h2
            id="admin-blog-heading"
            className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
          >
            Technical Insights Publisher ({articles.length} Articles Live)
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
            Publish engineering deep-dives, architecture notes, and code patterns directly to the public Blog.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] shrink-0"
        >
          <Plus className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
          <span>{showForm ? 'Close Blog Editor' : 'Write Technical Article'}</span>
        </button>
      </div>

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
          className="mt-4 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
        >
          {feedback}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handlePublishPost}
          className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="blog-cms-title" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Article Title *
              </label>
              <input
                id="blog-cms-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Zero-Downtime PostgreSQL Schema Migrations at Scale"
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-sm text-[#1A1464] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="blog-cms-cat" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Category *
              </label>
              <select
                id="blog-cms-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as BlogCategory)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="blog-cms-excerpt" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Executive Summary / Excerpt *
              </label>
              <input
                id="blog-cms-excerpt"
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Concise 1-2 sentence technical overview shown on the index card..."
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="blog-cms-readtime" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                  Read Min
                </label>
                <input
                  id="blog-cms-readtime"
                  type="number"
                  min={1}
                  max={60}
                  value={readTimeMinutes}
                  onChange={(e) => setReadTimeMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="blog-cms-cover" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                  Schematic
                </label>
                <select
                  id="blog-cms-cover"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-2 text-xs text-[#1A1464] dark:text-white"
                >
                  {COVER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="blog-cms-tags" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Stack Tags (· separated)
              </label>
              <input
                id="blog-cms-tags"
                type="text"
                value={stackTags}
                onChange={(e) => setStackTags(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="blog-cms-takeaways" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Key Takeaways (one per line) *
              </label>
              <textarea
                id="blog-cms-takeaways"
                rows={2}
                value={keyTakeaways}
                onChange={(e) => setKeyTakeaways(e.target.value)}
                placeholder={'Use expand-and-contract migrations\nBackfill in bounded batches'}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="blog-cms-s1h" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Section 01 Heading *
              </label>
              <input
                id="blog-cms-s1h"
                type="text"
                value={section1Heading}
                onChange={(e) => setSection1Heading(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
              <textarea
                aria-label="Section 01 Body"
                rows={4}
                value={section1Body}
                onChange={(e) => setSection1Body(e.target.value)}
                placeholder="Write detailed engineering prose for section 1 (20+ chars)..."
                className="mt-2 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="blog-cms-s2h" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Section 02 Heading *
              </label>
              <input
                id="blog-cms-s2h"
                type="text"
                value={section2Heading}
                onChange={(e) => setSection2Heading(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
              <textarea
                aria-label="Section 02 Body"
                rows={4}
                value={section2Body}
                onChange={(e) => setSection2Body(e.target.value)}
                placeholder="Write detailed implementation walkthrough for section 2 (20+ chars)..."
                className="mt-2 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="blog-cms-quote" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                Editorial Pull Quote (Optional)
              </label>
              <input
                id="blog-cms-quote"
                type="text"
                value={calloutQuote}
                onChange={(e) => setCalloutQuote(e.target.value)}
                placeholder="Core engineering principle highlighted in the article..."
                className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="blog-cms-codefile" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                  Code Filename
                </label>
                <input
                  id="blog-cms-codefile"
                  type="text"
                  value={codeFilename}
                  onChange={(e) => setCodeFilename(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-mono text-[#1A1464] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="blog-cms-codelang" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                  Language
                </label>
                <input
                  id="blog-cms-codelang"
                  type="text"
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-mono text-[#1A1464] dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="blog-cms-code" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
              Reference Code Snippet (Optional)
            </label>
            <textarea
              id="blog-cms-code"
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="// Optional production SQL, Go, Terraform, or TypeScript snippet"
              className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 font-mono text-xs text-[#1A1464] dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{saving ? 'Publishing Article...' : 'Publish to Engineering Blog'}</span>
          </button>
        </form>
      )}

      {/* Custom Firestore Blog Posts List */}
      <div className="mt-6">
        {customPosts.length === 0 ? (
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
            6 flagship engineering articles are live on /blog. Articles published here appear immediately in Firestore and rank at the top of the Blog index.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {customPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#EE1119]">
                    {post.category} · {post.readTimeMinutes} min read
                  </p>
                  <p className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                    {post.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleFeatured(post.id, post.featured)}
                    aria-label={`Toggle featured for ${post.title}`}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      post.featured
                        ? 'border-[#1A1464] dark:border-[#4F59B8] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#6B7188] dark:text-[#8E97B8]'
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCustom(post.id)}
                    aria-label={`Delete ${post.title}`}
                    className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-1.5 text-[#6B7188] dark:text-[#8E97B8] hover:border-[#EE1119] hover:text-[#EE1119]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
