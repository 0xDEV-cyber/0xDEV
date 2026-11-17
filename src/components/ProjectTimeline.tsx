import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  FolderGit2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EASE_OUT_EXPO } from './MotionPrimitives';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { PageRoute } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface TrackedInquiry {
  inquiryId: string;
  authorId: string;
  name: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  status: 'submitted' | 'reviewed' | 'in_progress' | 'completed' | 'archived';
  createdAtMs: number;
  createdAtLabel: string;
}

export interface ProjectMilestoneRecord {
  milestoneId: string;
  inquiryId: string;
  authorId: string;
  title: string;
  phase: string;
  summary: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  sortOrder: number;
  isBaseline?: boolean;
}

interface ProjectTimelineProps {
  onNavigate: (page: PageRoute) => void;
}

const INQUIRY_STATUS_LABELS: Record<TrackedInquiry['status'], string> = {
  submitted: 'Brief Submitted',
  reviewed: 'Under Review',
  in_progress: 'Active Build',
  completed: 'Delivered',
  archived: 'Archived',
};

const MILESTONE_STATUS_LABELS: Record<ProjectMilestoneRecord['status'], string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Upcoming',
};

function formatDate(ts: unknown): { ms: number; label: string } {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return {
      ms: d.getTime(),
      label: new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d),
    };
  }
  return { ms: Date.now(), label: 'Recent' };
}

function buildBaselineMilestones(inquiry: TrackedInquiry): ProjectMilestoneRecord[] {
  const status = inquiry.status;

  const progressMap: Record<TrackedInquiry['status'], [number, number, number, number, number]> = {
    submitted: [40, 0, 0, 0, 0],
    reviewed: [100, 35, 0, 0, 0],
    in_progress: [100, 100, 55, 10, 0],
    completed: [100, 100, 100, 100, 100],
    archived: [100, 100, 100, 100, 100],
  };

  const scores = progressMap[status] || progressMap.submitted;
  const templates = [
    {
      phase: 'Discover',
      title: 'Requirements & Scope Alignment',
      summary:
        'Audit business goals, technical constraints, and delivery priorities for your project brief.',
    },
    {
      phase: 'Design',
      title: 'System Architecture & UI Blueprint',
      summary:
        'Finalize wireframes, component hierarchy, database schema, and security boundaries.',
    },
    {
      phase: 'Build',
      title: 'Core Engineering & Integration',
      summary:
        'Implement frontend experience, backend APIs, authentication, and real-time data flows.',
    },
    {
      phase: 'Launch',
      title: 'QA Verification & Production Rollout',
      summary:
        'Execute security audits, cross-device verification, performance tuning, and live deployment.',
    },
    {
      phase: 'Maintain & Scale',
      title: 'Post-Launch Support & Enhancements',
      summary:
        'Handover documentation, operational monitoring, and iterative feature improvements.',
    },
  ];

  return templates.map((tpl, idx) => {
    const progress = scores[idx];
    const mStatus: ProjectMilestoneRecord['status'] =
      progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'pending';
    return {
      milestoneId: `baseline-${idx + 1}`,
      inquiryId: inquiry.inquiryId,
      authorId: inquiry.authorId,
      title: tpl.title,
      phase: tpl.phase,
      summary: tpl.summary,
      dueDate: idx === 0 ? inquiry.createdAtLabel : 'Scheduled',
      status: mStatus,
      progress,
      sortOrder: idx + 1,
      isBaseline: true,
    };
  });
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';

  const [inquiries, setInquiries] = useState<TrackedInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [selectedInquiryId, setSelectedInquiryId] = useState('');

  const [customMilestones, setCustomMilestones] = useState<ProjectMilestoneRecord[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // Admin editor state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhase, setNewPhase] = useState('Build');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<ProjectMilestoneRecord['status']>('in_progress');
  const [newProgress, setNewProgress] = useState(50);
  const [newSummary, setNewSummary] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subscribe to relevant inquiries for the signed-in client (or all inquiries for primary admin)
  useEffect(() => {
    if (!user) {
      setInquiries([]);
      setInquiriesLoading(false);
      return;
    }

    const q = isPrimaryAdmin
      ? collection(db, 'inquiries')
      : query(collection(db, 'inquiries'), where('authorId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TrackedInquiry[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const ts = formatDate(data.createdAt);
            const rawStatus = String(data.status || 'submitted') as TrackedInquiry['status'];
            return {
              inquiryId: String(data.inquiryId || d.id),
              authorId: String(data.authorId || ''),
              name: String(data.name || ''),
              email: String(data.email || ''),
              company: String(data.company || ''),
              service: String(data.service || 'Software Engineering'),
              budget: String(data.budget || ''),
              status: rawStatus,
              createdAtMs: ts.ms,
              createdAtLabel: ts.label,
            };
          })
          .sort((a, b) => {
            const aArchived = a.status === 'archived' ? 1 : 0;
            const bArchived = b.status === 'archived' ? 1 : 0;
            if (aArchived !== bArchived) return aArchived - bArchived;
            return b.createdAtMs - a.createdAtMs;
          });

        setInquiries(list);
        setSelectedInquiryId((prev) =>
          list.some((item) => item.inquiryId === prev) ? prev : list[0]?.inquiryId || ''
        );
        setInquiriesLoading(false);
      },
      (error) => {
        setInquiriesLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'inquiries');
      }
    );

    return () => unsubscribe();
  }, [user, isPrimaryAdmin]);

  const selectedInquiry = useMemo(
    () => inquiries.find((i) => i.inquiryId === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  // Subscribe to milestones subcollection for the selected inquiry
  useEffect(() => {
    if (!user || !selectedInquiryId) {
      setCustomMilestones([]);
      setMilestonesLoading(false);
      return;
    }

    setMilestonesLoading(true);
    const milestonesRef = collection(db, 'inquiries', selectedInquiryId, 'milestones');
    const q = isPrimaryAdmin
      ? milestonesRef
      : query(milestonesRef, where('authorId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: ProjectMilestoneRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const statusVal = String(data.status || 'pending');
            const normalizedStatus: ProjectMilestoneRecord['status'] =
              statusVal === 'completed' || statusVal === 'in_progress' ? statusVal : 'pending';
            const rawProgress = Number(data.progress);
            const clampedProgress = Number.isFinite(rawProgress)
              ? Math.max(0, Math.min(100, Math.round(rawProgress)))
              : 0;
            return {
              milestoneId: String(data.milestoneId || d.id),
              inquiryId: String(data.inquiryId || selectedInquiryId),
              authorId: String(data.authorId || ''),
              title: String(data.title || ''),
              phase: String(data.phase || 'Build'),
              summary: String(data.summary || ''),
              dueDate: String(data.dueDate || ''),
              status: normalizedStatus,
              progress: clampedProgress,
              sortOrder: Math.max(1, Math.round(Number(data.sortOrder) || 1)),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);

        setCustomMilestones(rows);
        setMilestonesLoading(false);
      },
      (error) => {
        setMilestonesLoading(false);
        handleFirestoreError(
          error,
          OperationType.LIST,
          `inquiries/${selectedInquiryId}/milestones`
        );
      }
    );

    return () => unsubscribe();
  }, [user, selectedInquiryId, isPrimaryAdmin]);

  const displayedMilestones = useMemo(() => {
    if (!selectedInquiry) return [];
    if (customMilestones.length > 0) return customMilestones;
    return buildBaselineMilestones(selectedInquiry);
  }, [selectedInquiry, customMilestones]);

  const isUsingBaseline = Boolean(selectedInquiry && customMilestones.length === 0);

  const summaryStats = useMemo(() => {
    if (displayedMilestones.length === 0) {
      return { overallPercent: 0, completedCount: 0, activeCount: 0, totalCount: 0 };
    }
    const sum = displayedMilestones.reduce((acc, m) => acc + m.progress, 0);
    const overallPercent = Math.round(sum / displayedMilestones.length);
    const completedCount = displayedMilestones.filter(
      (m) => m.status === 'completed' || m.progress === 100
    ).length;
    const activeCount = displayedMilestones.filter((m) => m.status === 'in_progress').length;
    return {
      overallPercent,
      completedCount,
      activeCount,
      totalCount: displayedMilestones.length,
    };
  }, [displayedMilestones]);

  const handleSeedStandardMilestones = async () => {
    if (!isPrimaryAdmin || !selectedInquiry) return;
    setBusyId('seed');
    setErrorMsg(null);
    setFeedback(null);

    const baseline = buildBaselineMilestones(selectedInquiry);
    try {
      const batch = writeBatch(db);
      baseline.forEach((item, index) => {
        const msId = `MS-${Date.now()}-${index + 1}`;
        batch.set(doc(db, 'inquiries', selectedInquiry.inquiryId, 'milestones', msId), {
          milestoneId: msId,
          inquiryId: selectedInquiry.inquiryId,
          authorId: selectedInquiry.authorId,
          title: item.title,
          phase: item.phase,
          summary: item.summary,
          dueDate: item.dueDate,
          status: item.status,
          progress: item.progress,
          sortOrder: index + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setFeedback('Initialized 5 editable milestones for this project.');
    } catch (error) {
      setErrorMsg('Unable to seed milestones right now.');
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `inquiries/${selectedInquiry.inquiryId}/milestones`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin || !selectedInquiry) return;

    const title = newTitle.trim();
    const phase = newPhase.trim();
    const summary = newSummary.trim();
    if (title.length < 2 || phase.length < 2 || summary.length < 2) {
      setErrorMsg('Please enter a phase, milestone title, and deliverable summary.');
      return;
    }

    const msId = `MS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const nextOrder =
      customMilestones.length > 0
        ? Math.min(50, Math.max(...customMilestones.map((m) => m.sortOrder)) + 1)
        : 1;
    const clampedProgress = Math.max(0, Math.min(100, Math.round(newProgress)));
    const resolvedStatus: ProjectMilestoneRecord['status'] =
      clampedProgress === 100 ? 'completed' : newStatus;

    setBusyId('create');
    setErrorMsg(null);
    setFeedback(null);

    try {
      await setDoc(doc(db, 'inquiries', selectedInquiry.inquiryId, 'milestones', msId), {
        milestoneId: msId,
        inquiryId: selectedInquiry.inquiryId,
        authorId: selectedInquiry.authorId,
        title: title.slice(0, 120),
        phase: phase.slice(0, 60),
        summary: summary.slice(0, 600),
        dueDate: newDueDate.trim().slice(0, 40),
        status: resolvedStatus,
        progress: clampedProgress,
        sortOrder: nextOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewDueDate('');
      setNewSummary('');
      setNewProgress(50);
      setNewStatus('in_progress');
      setShowAddForm(false);
      setFeedback(`Added milestone "${title}".`);
    } catch (error) {
      setErrorMsg('Failed to save milestone.');
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `inquiries/${selectedInquiry.inquiryId}/milestones/${msId}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickProgressUpdate = async (
    item: ProjectMilestoneRecord,
    nextPct: number
  ) => {
    if (!isPrimaryAdmin || item.isBaseline) return;
    const clamped = Math.max(0, Math.min(100, Math.round(nextPct)));
    const nextState: ProjectMilestoneRecord['status'] =
      clamped >= 100 ? 'completed' : clamped > 0 ? 'in_progress' : 'pending';

    setBusyId(item.milestoneId);
    setErrorMsg(null);
    setFeedback(null);

    const path = `inquiries/${item.inquiryId}/milestones/${item.milestoneId}`;
    try {
      await updateDoc(doc(db, 'inquiries', item.inquiryId, 'milestones', item.milestoneId), {
        progress: clamped,
        status: nextState,
        updatedAt: serverTimestamp(),
      });
      setFeedback(`Updated "${item.title}" to ${clamped}%.`);
    } catch (error) {
      setErrorMsg('Unable to update milestone progress.');
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteMilestone = async (item: ProjectMilestoneRecord) => {
    if (!isPrimaryAdmin || item.isBaseline) return;
    setBusyId(item.milestoneId);
    setErrorMsg(null);
    setFeedback(null);

    const path = `inquiries/${item.inquiryId}/milestones/${item.milestoneId}`;
    try {
      await deleteDoc(doc(db, 'inquiries', item.inquiryId, 'milestones', item.milestoneId));
      setFeedback(`Removed milestone "${item.title}".`);
    } catch (error) {
      setErrorMsg('Unable to remove milestone.');
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      aria-labelledby="project-timeline-heading"
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)]"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#1A1464]"
      />

      {/* Section Top Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[#E5E7F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
            <FolderGit2 className="h-4 w-4" aria-hidden="true" />
            <span>Project Delivery Timeline</span>
          </div>
          <h2
            id="project-timeline-heading"
            className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464]"
          >
            Milestones &amp; Completion Progress
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63]">
            Track every engineering phase, target delivery date, and real-time completion percentage.
          </p>
        </div>

        {/* Project Selector + Admin Actions */}
        {inquiries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {inquiries.length > 1 && (
              <div>
                <label htmlFor="timeline-project-select" className="sr-only">
                  Select active project
                </label>
                <select
                  id="timeline-project-select"
                  value={selectedInquiryId}
                  onChange={(e) => {
                    setSelectedInquiryId(e.target.value);
                    setFeedback(null);
                    setErrorMsg(null);
                  }}
                  className="rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1A1464] focus:border-[#1A1464] focus:bg-white"
                >
                  {inquiries.map((inq) => (
                    <option key={inq.inquiryId} value={inq.inquiryId}>
                      {isPrimaryAdmin ? `${inq.name} — ` : ''}
                      {inq.service} ({INQUIRY_STATUS_LABELS[inq.status] || inq.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isPrimaryAdmin && selectedInquiry && (
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#120D4A] whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span>{showAddForm ? 'Close Editor' : 'Add Milestone'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {inquiriesLoading ? (
        <div className="mt-6 space-y-4" aria-label="Loading project timeline">
          <div className="h-24 rounded-xl bg-[#F6F7FB] border border-[#E5E7F0]" />
          <div className="h-20 rounded-xl bg-[#F6F7FB] border border-[#E5E7F0]" />
          <div className="h-20 rounded-xl bg-[#F6F7FB] border border-[#E5E7F0]" />
        </div>
      ) : inquiries.length === 0 ? (
        /* Empty State */
        <div className="mt-6 rounded-xl border border-dashed border-[#D3D7E6] bg-[#F6F7FB]/60 px-6 py-10 text-center">
          <FolderGit2 className="mx-auto h-8 w-8 text-[#1A1464]/50" aria-hidden="true" />
          <h3 className="mt-3 font-display text-lg font-bold text-[#1A1464]">
            No active project briefs yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#4A4F63]">
            Once you submit a project consultation brief, your 0xDEV milestone timeline and live
            completion tracker will appear here automatically.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.2)] transition-colors hover:bg-[#D00D14]"
          >
            <span>Start a Project Brief</span>
          </button>
        </div>
      ) : selectedInquiry ? (
        <div className="mt-6 space-y-6">
          {/* Overall Completion Overview Bar */}
          <div className="rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-[#6B7188]">
                  <span className="font-bold text-[#1A1464]">
                    {INQUIRY_STATUS_LABELS[selectedInquiry.status] || selectedInquiry.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{selectedInquiry.inquiryId}</span>
                  {selectedInquiry.company && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{selectedInquiry.company}</span>
                    </>
                  )}
                  {isPrimaryAdmin && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Client: {selectedInquiry.name}</span>
                    </>
                  )}
                </div>

                <h3 className="mt-1.5 font-display text-xl font-extrabold text-[#1A1464] truncate">
                  {selectedInquiry.service}
                </h3>

                <p className="mt-1 text-xs font-medium text-[#4A4F63] tabular-nums">
                  {summaryStats.completedCount} of {summaryStats.totalCount} milestones completed
                  {summaryStats.activeCount > 0 && ` · ${summaryStats.activeCount} active`}
                </p>
              </div>

              <div className="shrink-0 sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B7188]">
                  Overall Completion
                </p>
                <p className="mt-0.5 font-display text-4xl font-extrabold tracking-tight text-[#1A1464] tabular-nums">
                  {summaryStats.overallPercent}
                  <span className="text-xl text-[#EE1119]">%</span>
                </p>
              </div>
            </div>

            {/* Segmented Overall Progress Bar */}
            <div className="mt-5">
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7F0]"
                role="progressbar"
                aria-valuenow={summaryStats.overallPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Overall project completion percentage"
              >
                <motion.div
                  className={`h-full w-full origin-left rounded-full transition-colors duration-200 ${
                    summaryStats.overallPercent >= 100 ? 'bg-[#16A34A]' : 'bg-[#EE1119]'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: summaryStats.overallPercent / 100 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                />
              </div>

              {/* Phase Mini-Step Indicators */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {displayedMilestones.slice(0, 5).map((ms, idx) => (
                  <div key={ms.milestoneId} className="min-w-0">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
                      <span className="truncate text-[#1A1464]">
                        <span className="font-mono text-[#6B7188] tabular-nums mr-1">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {ms.phase}
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          ms.progress >= 100
                            ? 'text-[#16A34A]'
                            : ms.progress > 0
                              ? 'text-[#EE1119]'
                              : 'text-[#6B7188]'
                        }`}
                      >
                        {ms.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback / Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 px-4 py-3 text-xs font-semibold text-[#1A1464]"
            >
              {errorMsg}
            </div>
          )}
          {feedback && (
            <div
              role="status"
              className="rounded-xl border border-[#1A1464]/20 bg-[#F6F7FB] px-4 py-3 text-xs font-semibold text-[#1A1464]"
            >
              {feedback}
            </div>
          )}

          {/* Baseline Info Notice & Admin Seed Control */}
          {isUsingBaseline && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E5E7F0] bg-white px-4 py-3.5">
              <div className="flex items-start gap-2.5 text-xs text-[#4A4F63]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#EE1119]" aria-hidden="true" />
                <span>
                  Showing standard 0xDEV 5-phase delivery baseline synchronized with your inquiry
                  status. Custom sprint deliverables added by our team appear here in real time.
                </span>
              </div>
              {isPrimaryAdmin && (
                <button
                  type="button"
                  disabled={busyId === 'seed'}
                  onClick={() => void handleSeedStandardMilestones()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1A1464] bg-white px-3.5 py-2 text-xs font-bold text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{busyId === 'seed' ? 'Seeding...' : 'Seed 5 Editable Milestones'}</span>
                </button>
              )}
            </div>
          )}

          {/* Admin Create Milestone Form */}
          <AnimatePresence>
            {isPrimaryAdmin && showAddForm && (
              <motion.form
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                onSubmit={handleAddMilestone}
                className="rounded-xl border border-[#1A1464]/20 bg-[#F6F7FB] p-5 space-y-4"
              >
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-bold text-[#1A1464]">
                  Add Custom Project Milestone
                </h4>
                <span className="text-xs font-mono text-[#6B7188]">
                  Project: {selectedInquiry.inquiryId}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="ms-phase"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                  >
                    Phase
                  </label>
                  <input
                    id="ms-phase"
                    type="text"
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value)}
                    placeholder="Design / Build / QA"
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] bg-white px-3.5 py-2.5 text-sm text-[#1A1464]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="ms-title"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                  >
                    Milestone Title
                  </label>
                  <input
                    id="ms-title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="API Integration & Authentication Flow"
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] bg-white px-3.5 py-2.5 text-sm text-[#1A1464]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="ms-due"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                  >
                    Target Date
                  </label>
                  <input
                    id="ms-due"
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    placeholder="May 30, 2025"
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] bg-white px-3.5 py-2.5 text-sm text-[#1A1464]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ms-status"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                  >
                    Status
                  </label>
                  <select
                    id="ms-status"
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as ProjectMilestoneRecord['status'])
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] bg-white px-3.5 py-2.5 text-sm text-[#1A1464]"
                  >
                    <option value="pending">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ms-progress"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] tabular-nums"
                  >
                    Completion: {newProgress}%
                  </label>
                  <input
                    id="ms-progress"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={newProgress}
                    onChange={(e) => setNewProgress(Number(e.target.value))}
                    className="mt-3 w-full accent-[#EE1119]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ms-summary"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                >
                  Deliverable Summary
                </label>
                <textarea
                  id="ms-summary"
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Describe what will be delivered and verified in this milestone."
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] bg-white px-3.5 py-2.5 text-sm text-[#1A1464]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busyId === 'create'}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{busyId === 'create' ? 'Saving...' : 'Save Milestone'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-[#E5E7F0] bg-white px-4 py-2.5 text-xs font-bold text-[#4A4F63] hover:text-[#1A1464]"
                >
                  Cancel
                </button>
              </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Chronological Visual Timeline */}
          {milestonesLoading ? (
            <p className="py-6 text-center text-sm text-[#6B7188]">Loading project milestones...</p>
          ) : (
            <ol className="relative space-y-5 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[#E5E7F0]">
              {displayedMilestones.map((item, idx) => {
                const isCompleted = item.status === 'completed' || item.progress >= 100;
                const isActive = !isCompleted && (item.status === 'in_progress' || item.progress > 0);
                const stepNum = String(idx + 1).padStart(2, '0');

                return (
                  <motion.li
                    key={item.milestoneId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.32,
                      delay: Math.min(idx * 0.05, 0.25),
                      ease: EASE_OUT_EXPO,
                    }}
                    className="relative pl-14"
                  >
                    {/* Timeline Node Icon */}
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors ${
                        isCompleted
                          ? 'border-[#16A34A] bg-[#16A34A] text-white'
                          : isActive
                            ? 'border-[#EE1119] bg-[#EE1119] text-white shadow-[0_6px_18px_rgba(238,17,25,0.22)]'
                            : 'border-[#E5E7F0] bg-white text-[#6B7188]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      ) : isActive ? (
                        <Clock className="h-4.5 w-4.5" />
                      ) : (
                        <CircleDot className="h-4 w-4" />
                      )}
                    </span>

                    {/* Milestone Card */}
                    <div
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                        isActive
                          ? 'border-[#1A1464]/30 bg-[#F6F7FB]/80'
                          : 'border-[#E5E7F0] bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
                            <span className="font-mono text-[#6B7188] tabular-nums">
                              {stepNum}
                            </span>
                            <span className="font-bold uppercase tracking-wider text-[#1A1464]">
                              {item.phase}
                            </span>
                            <span className="text-[#D3D7E6]" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className={
                                isCompleted
                                  ? 'font-bold text-[#16A34A]'
                                  : isActive
                                    ? 'font-bold text-[#EE1119]'
                                    : 'text-[#6B7188]'
                              }
                            >
                              {MILESTONE_STATUS_LABELS[item.status]}
                            </span>
                            {item.dueDate && (
                              <>
                                <span className="text-[#D3D7E6]" aria-hidden="true">
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-1 text-[#6B7188] tabular-nums">
                                  <Calendar className="h-3 w-3" aria-hidden="true" />
                                  {item.dueDate}
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className="mt-1.5 font-display text-base sm:text-lg font-bold text-[#1A1464]">
                            {item.title}
                          </h4>
                          <p className="mt-1 text-sm leading-relaxed text-[#4A4F63]">
                            {item.summary}
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <span
                            className={`font-display text-xl font-extrabold tabular-nums ${
                              isCompleted
                                ? 'text-[#16A34A]'
                                : isActive
                                  ? 'text-[#EE1119]'
                                  : 'text-[#6B7188]'
                            }`}
                          >
                            {item.progress}%
                          </span>
                        </div>
                      </div>

                      {/* Milestone Progress Bar */}
                      <div className="mt-3.5">
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7F0]"
                          role="progressbar"
                          aria-valuenow={item.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.title} completion percentage`}
                        >
                          <motion.div
                            className={`h-full w-full origin-left rounded-full transition-colors duration-200 ${
                              isCompleted
                                ? 'bg-[#16A34A]'
                                : isActive
                                  ? 'bg-[#EE1119]'
                                  : 'bg-[#1A1464]/30'
                            }`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: item.progress / 100 }}
                            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                          />
                        </div>
                      </div>

                      {/* Admin Quick Progress Controls */}
                      {isPrimaryAdmin && !item.isBaseline && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7F0] pt-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] mr-1">
                              Set progress:
                            </span>
                            {[0, 25, 50, 75, 100].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                disabled={busyId === item.milestoneId}
                                onClick={() => void handleQuickProgressUpdate(item, pct)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold font-mono tabular-nums transition-colors ${
                                  item.progress === pct
                                    ? 'border-[#1A1464] bg-[#1A1464] text-white'
                                    : 'border-[#E5E7F0] bg-white text-[#1A1464] hover:border-[#1A1464]'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={busyId === item.milestoneId}
                            onClick={() => void handleDeleteMilestone(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#6B7188] transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
};
