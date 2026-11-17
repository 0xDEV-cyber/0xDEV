import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { FolderPlus, Layers, Plus, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProjectPreviewKind } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { usePortfolioProjects } from '../hooks/usePortfolioProjects';
import { ProjectPreviewScreen } from './ProjectPreviewVisual';

const PREVIEW_KINDS: { value: ProjectPreviewKind; label: string }[] = [
  { value: 'fintech', label: 'Fintech Settlement UI' },
  { value: 'telehealth', label: 'Healthcare / Telehealth UI' },
  { value: 'logistics', label: 'Logistics Telemetry Map' },
  { value: 'agritech', label: 'AgriTech Payout Hub' },
  { value: 'ecommerce', label: 'E-Commerce Vendor Grid' },
  { value: 'edtech', label: 'EdTech Campus ERP' },
  { value: 'cleantech', label: 'CleanTech Microgrid IoT' },
  { value: 'saas', label: 'SaaS Analytics Cashflow' },
  { value: 'pharma', label: 'Pharma Cold-Chain UI' },
  { value: 'hospitality', label: 'Hospitality Booking Desk' },
  { value: 'security', label: 'Cybersecurity IAM Posture' },
  { value: 'govtech', label: 'GovTech Utility Portal' },
];

export const AdminPortfolioManager: React.FC = () => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';
  const { customProjects, projects } = usePortfolioProjects();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('Fintech');
  const [region, setRegion] = useState('East Africa & Remote');
  const [timeline, setTimeline] = useState('8 Weeks · Custom Build');
  const [clientType, setClientType] = useState('Enterprise Partner');
  const [deliverableType, setDeliverableType] = useState('Web & Mobile Platform');
  const [previewUrl, setPreviewUrl] = useState('app.clientportal.io');
  const [previewKind, setPreviewKind] = useState<ProjectPreviewKind>('fintech');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [architectureNotes, setArchitectureNotes] = useState('');
  const [metric1Value, setMetric1Value] = useState('99.9%');
  const [metric1Label, setMetric1Label] = useState('Measured Uptime');
  const [metric2Value, setMetric2Value] = useState('3x');
  const [metric2Label, setMetric2Label] = useState('Faster Delivery');
  const [metric3Value, setMetric3Value] = useState('24/7');
  const [metric3Label, setMetric3Label] = useState('SLA Support');
  const [stackSummary, setStackSummary] = useState('React · TypeScript · Node.js · Cloud');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPrimaryAdmin) return null;

  const handlePublishProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    if (
      title.trim().length < 3 ||
      problem.trim().length < 10 ||
      solution.trim().length < 10 ||
      architectureNotes.trim().length < 5
    ) {
      setError('Please complete title (3+ chars), challenge (10+ chars), solution (10+ chars), and architecture notes.');
      return;
    }

    const projectId = `PRJ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    setSaving(true);
    try {
      await setDoc(doc(db, 'portfolioProjects', projectId), {
        projectId,
        title: title.trim().slice(0, 120),
        sector: sector.trim().slice(0, 40) || 'SaaS',
        region: region.trim().slice(0, 80) || 'Global',
        timeline: timeline.trim().slice(0, 80) || '8 Weeks',
        clientType: clientType.trim().slice(0, 80) || 'Client',
        deliverableType: deliverableType.trim().slice(0, 80) || 'Web App',
        previewUrl: previewUrl.trim().slice(0, 120) || 'app.0xdev.io',
        previewKind,
        problem: problem.trim().slice(0, 800),
        solution: solution.trim().slice(0, 800),
        architectureNotes: architectureNotes.trim().slice(0, 500),
        metric1Value: metric1Value.trim().slice(0, 30) || '99.9%',
        metric1Label: metric1Label.trim().slice(0, 60) || 'Uptime',
        metric2Value: metric2Value.trim().slice(0, 30) || '2x',
        metric2Label: metric2Label.trim().slice(0, 60) || 'Velocity',
        metric3Value: metric3Value.trim().slice(0, 30) || '24/7',
        metric3Label: metric3Label.trim().slice(0, 60) || 'Support',
        stackSummary: stackSummary.trim().slice(0, 160) || 'React · TypeScript',
        featured: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle('');
      setProblem('');
      setSolution('');
      setArchitectureNotes('');
      setShowForm(false);
      setFeedback('Published new case study to live public Work showcase.');
    } catch (err) {
      setError('Unable to publish project.');
      handleFirestoreError(err, OperationType.CREATE, `portfolioProjects/${projectId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (projectId: string, currentFeatured: boolean) => {
    try {
      await updateDoc(doc(db, 'portfolioProjects', projectId), {
        featured: !currentFeatured,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `portfolioProjects/${projectId}`);
    }
  };

  const handleDeleteCustom = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'portfolioProjects', projectId));
      setFeedback('Removed custom project from live showcase.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `portfolioProjects/${projectId}`);
    }
  };

  return (
    <section
      aria-labelledby="admin-portfolio-heading"
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119] flex items-center gap-1.5">
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Admin Portfolio CMS</span>
          </p>
          <h2
            id="admin-portfolio-heading"
            className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
          >
            Live Case Study Manager ({projects.length} Total Live)
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
            Publish new projects with live screen previews directly to Home, Work, and the Visitor Portal.
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
          <span>{showForm ? 'Close Publisher' : 'Publish New Case Study'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
          {error}
        </div>
      )}
      {feedback && (
        <div role="status" className="mt-4 rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
          {feedback}
        </div>
      )}

      {showForm && (
        <form onSubmit={handlePublishProject} className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cms-title" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Project Title *
                  </label>
                  <input
                    id="cms-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Kigezi FinHub Treasury Engine"
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-sm text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-sector" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Sector *
                  </label>
                  <input
                    id="cms-sector"
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="Fintech / SaaS / AgriTech"
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2 text-sm text-[#1A1464] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="cms-kind" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Screen Preview Style
                  </label>
                  <select
                    id="cms-kind"
                    value={previewKind}
                    onChange={(e) => setPreviewKind(e.target.value as ProjectPreviewKind)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
                  >
                    {PREVIEW_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cms-url" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Mock Browser URL
                  </label>
                  <input
                    id="cms-url"
                    type="text"
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-region" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Region
                  </label>
                  <input
                    id="cms-region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="cms-timeline" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Timeline
                  </label>
                  <input
                    id="cms-timeline"
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-client" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Client Type
                  </label>
                  <input
                    id="cms-client"
                    type="text"
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-deliv" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Deliverable Type
                  </label>
                  <input
                    id="cms-deliv"
                    type="text"
                    value={deliverableType}
                    onChange={(e) => setDeliverableType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cms-problem" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Challenge (10+ chars) *
                  </label>
                  <textarea
                    id="cms-problem"
                    rows={2}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-solution" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    0xDEV Solution (10+ chars) *
                  </label>
                  <textarea
                    id="cms-solution"
                    rows={2}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cms-arch" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Architecture Notes *
                  </label>
                  <input
                    id="cms-arch"
                    type="text"
                    value={architectureNotes}
                    onChange={(e) => setArchitectureNotes(e.target.value)}
                    placeholder="Multi-AZ deployment, Redis queues..."
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="cms-stack" className="block text-xs font-bold uppercase text-[#1A1464] dark:text-[#F4F6FC]">
                    Tech Stack Summary
                  </label>
                  <input
                    id="cms-stack"
                    type="text"
                    value={stackSummary}
                    onChange={(e) => setStackSummary(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <input
                    type="text"
                    aria-label="Metric 1 value"
                    value={metric1Value}
                    onChange={(e) => setMetric1Value(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1.5 text-xs font-bold text-[#1A1464] dark:text-white"
                  />
                  <input
                    type="text"
                    aria-label="Metric 1 label"
                    value={metric1Label}
                    onChange={(e) => setMetric1Label(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] text-[#4A4F63] dark:text-[#C2C9E0]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    aria-label="Metric 2 value"
                    value={metric2Value}
                    onChange={(e) => setMetric2Value(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1.5 text-xs font-bold text-[#1A1464] dark:text-white"
                  />
                  <input
                    type="text"
                    aria-label="Metric 2 label"
                    value={metric2Label}
                    onChange={(e) => setMetric2Label(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] text-[#4A4F63] dark:text-[#C2C9E0]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    aria-label="Metric 3 value"
                    value={metric3Value}
                    onChange={(e) => setMetric3Value(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1.5 text-xs font-bold text-[#1A1464] dark:text-white"
                  />
                  <input
                    type="text"
                    aria-label="Metric 3 label"
                    value={metric3Label}
                    onChange={(e) => setMetric3Label(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] text-[#4A4F63] dark:text-[#C2C9E0]"
                  />
                </div>
              </div>
            </div>

            {/* Live Screen Preview */}
            <div className="lg:col-span-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                Live Screen Preview
              </p>
              <ProjectPreviewScreen
                study={{
                  id: 'preview',
                  sector,
                  region,
                  timeline,
                  title: title || 'New Case Study',
                  clientType,
                  deliverableType,
                  previewUrl,
                  previewKind,
                  problem,
                  solution,
                  architectureNotes,
                  metrics: [
                    { value: metric1Value, label: metric1Label },
                    { value: metric2Value, label: metric2Label },
                    { value: metric3Value, label: metric3Label },
                  ],
                  stackSummary,
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
          >
            <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{saving ? 'Publishing...' : 'Publish to Live Showcase'}</span>
          </button>
        </form>
      )}

      {/* Custom Firestore Projects List */}
      <div className="mt-6">
        {customProjects.length === 0 ? (
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
            12 built-in flagship case studies are active. Custom case studies published here appear at the top of your live showcase immediately.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {customProjects.map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#EE1119]">
                    {proj.sector} · {proj.region}
                  </p>
                  <p className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                    {proj.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleFeatured(proj.id, proj.featured)}
                    aria-label="Toggle featured"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      proj.featured
                        ? 'border-[#1A1464] dark:border-[#4F59B8] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#6B7188] dark:text-[#8E97B8]'
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCustom(proj.id)}
                    aria-label={`Delete ${proj.title}`}
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
