import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { CASE_STUDIES, CaseStudy, ProjectPreviewKind } from '../data/siteData';
import { db } from '../firebase';

export interface FirestorePortfolioDoc extends CaseStudy {
  featured: boolean;
  isCustom: boolean;
  createdAtMs: number;
}

const VALID_PREVIEW_KINDS: ProjectPreviewKind[] = [
  'fintech',
  'telehealth',
  'logistics',
  'agritech',
  'ecommerce',
  'edtech',
  'cleantech',
  'saas',
  'pharma',
  'hospitality',
  'security',
  'govtech',
];

export function usePortfolioProjects() {
  const [customProjects, setCustomProjects] = useState<FirestorePortfolioDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'portfolioProjects'),
      where('featured', 'in', [true, false])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FirestorePortfolioDoc[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const rawKind = String(data.previewKind || 'saas') as ProjectPreviewKind;
            const previewKind = VALID_PREVIEW_KINDS.includes(rawKind) ? rawKind : 'saas';
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

            return {
              id: String(data.projectId || d.id),
              sector: String(data.sector || 'SaaS'),
              region: String(data.region || 'Global Remote'),
              timeline: String(data.timeline || '8 Weeks'),
              title: String(data.title || '0xDEV Client Build'),
              clientType: String(data.clientType || 'Enterprise Partner'),
              deliverableType: String(data.deliverableType || 'Web Platform'),
              previewUrl: String(data.previewUrl || 'app.0xdev.io'),
              previewKind,
              problem: String(data.problem || ''),
              solution: String(data.solution || ''),
              architectureNotes: String(data.architectureNotes || ''),
              metrics: [
                {
                  value: String(data.metric1Value || '99.9%'),
                  label: String(data.metric1Label || 'Production Uptime'),
                },
                {
                  value: String(data.metric2Value || '2x'),
                  label: String(data.metric2Label || 'Delivery Speed'),
                },
                {
                  value: String(data.metric3Value || '24/7'),
                  label: String(data.metric3Label || 'Managed SLA'),
                },
              ],
              stackSummary: String(data.stackSummary || 'React · TypeScript · Cloud'),
              featured: Boolean(data.featured),
              isCustom: true,
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);

        setCustomProjects(items);
        setLoading(false);
      },
      (error) => {
        // Fallback gracefully to static CASE_STUDIES if offline or rules disallow
        console.warn('Portfolio listener fallback active:', error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const projects = useMemo<CaseStudy[]>(() => {
    const customIds = new Set(customProjects.map((p) => p.id));
    const remainingBaseline = CASE_STUDIES.filter((s) => !customIds.has(s.id));
    return [...customProjects, ...remainingBaseline];
  }, [customProjects]);

  return { projects, customProjects, loading };
}
