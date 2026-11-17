import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import {
  BLOG_ARTICLES,
  BlogArticle,
  BlogCategory,
  BlogSection,
} from '../data/blogData';
import { db } from '../firebase';

export interface FirestoreBlogDoc extends BlogArticle {
  createdAtMs: number;
}

const VALID_CATEGORIES: BlogCategory[] = [
  'Architecture',
  'Cloud & DevOps',
  'Mobile & Offline',
  'Security',
  'Fintech Systems',
];

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function useBlogPosts() {
  const [customPosts, setCustomPosts] = useState<FirestoreBlogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'blogPosts'),
      where('featured', 'in', [true, false])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FirestoreBlogDoc[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const rawCat = String(data.category || 'Architecture') as BlogCategory;
            const category = VALID_CATEGORIES.includes(rawCat) ? rawCat : 'Architecture';
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

            const sections: BlogSection[] = [];
            if (data.section1Heading && data.section1Body) {
              sections.push({
                id: 'section-1',
                heading: String(data.section1Heading),
                paragraphs: splitParagraphs(String(data.section1Body)),
              });
            }
            if (data.section2Heading && data.section2Body) {
              sections.push({
                id: 'section-2',
                heading: String(data.section2Heading),
                paragraphs: splitParagraphs(String(data.section2Body)),
              });
            }
            if (data.section3Heading && data.section3Body) {
              sections.push({
                id: 'section-3',
                heading: String(data.section3Heading),
                paragraphs: splitParagraphs(String(data.section3Body)),
              });
            }

            const stackTags = String(data.stackTags || 'TypeScript · Cloud')
              .split(/[·,]+/)
              .map((t) => t.trim())
              .filter(Boolean);

            const keyTakeaways = String(data.keyTakeaways || '')
              .split(/\n+/)
              .map((t) => t.replace(/^[-*•]\s*/, '').trim())
              .filter(Boolean);

            const codeSnippet = String(data.codeSnippet || '').trim();

            return {
              id: String(data.postId || d.id),
              slug: String(data.slug || d.id),
              title: String(data.title || '0xDEV Engineering Note'),
              excerpt: String(data.excerpt || ''),
              category,
              authorName: String(data.authorName || 'Arigye Wisdom'),
              authorRole: String(data.authorRole || 'Principal Systems Architect · 0xDEV'),
              publishedDate: String(data.publishedDate || '2026'),
              readTimeMinutes: Number(data.readTimeMinutes || 5),
              featured: Boolean(data.featured),
              coverImage: String(
                data.coverImage || '/src/assets/images/blog_cloud_infra_1794909289647.jpg'
              ),
              stackTags: stackTags.length > 0 ? stackTags : ['Engineering'],
              keyTakeaways:
                keyTakeaways.length > 0
                  ? keyTakeaways
                  : ['Production-grade architecture authored by 0xDEV.'],
              calloutQuote: data.calloutQuote ? String(data.calloutQuote) : undefined,
              sections,
              codeExample: codeSnippet
                ? {
                    filename: String(data.codeFilename || 'architecture/snippet.ts'),
                    language: String(data.codeLanguage || 'typescript'),
                    code: codeSnippet,
                  }
                : undefined,
              isCustom: true,
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);

        setCustomPosts(items);
        setLoading(false);
      },
      (error) => {
        console.warn('Blog listener fallback active:', error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const articles = useMemo<BlogArticle[]>(() => {
    const customSlugs = new Set(customPosts.map((p) => p.slug));
    const remainingBaseline = BLOG_ARTICLES.filter((a) => !customSlugs.has(a.slug));
    return [...customPosts, ...remainingBaseline];
  }, [customPosts]);

  return { articles, customPosts, loading };
}
