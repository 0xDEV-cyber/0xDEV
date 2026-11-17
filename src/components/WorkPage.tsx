import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Eye } from 'lucide-react';
import { CaseStudy, PageRoute } from '../data/siteData';
import { usePortfolioProjects } from '../hooks/usePortfolioProjects';
import { EASE_OUT_EXPO } from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { ProjectPreviewModal, ProjectPreviewScreen } from './ProjectPreviewVisual';
import { SharedCtaBanner } from './SharedCtaBanner';

interface WorkPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const WorkPage: React.FC<WorkPageProps> = ({ onNavigate }) => {
  const { projects } = usePortfolioProjects();
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [inspectedStudy, setInspectedStudy] = useState<CaseStudy | null>(null);

  const sectors = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((s) => s.sector)))],
    [projects]
  );

  const filteredStudies =
    selectedSector === 'All'
      ? projects
      : projects.filter((item) => item.sector === selectedSector);

  return (
    <>
      <PageHeader
        eyebrow={`See Some of Our Work · ${projects.length} Production Case Studies`}
        title="Systems engineered for uptime, speed, and clarity."
        description={`Explore interactive UI screen previews and production architectures across ${projects.length} shipped projects in fintech, healthcare, agritech, logistics, SaaS, and cloud security.`}
        currentLabel="Work"
        onNavigate={onNavigate}
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E7F0] pb-6">
            <div className="overflow-x-auto pb-1">
              <div
                className="inline-flex flex-wrap gap-1.5 rounded-xl bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]"
                role="tablist"
                aria-label="Filter case studies by sector"
              >
                {sectors.map((sector) => {
                  const isActive = selectedSector === sector;
                  return (
                    <button
                      key={sector}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedSector(sector)}
                      className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                        isActive ? 'text-white' : 'text-[#4A4F63] hover:text-[#1A1464]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="work-sector-pill"
                          aria-hidden="true"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[#1A1464] shadow-sm"
                        />
                      )}
                      <span className="relative z-10">
                        {sector === 'All' ? `All (${projects.length})` : sector}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs font-medium text-[#6B7188] tabular-nums shrink-0">
              Showing {filteredStudies.length} shipped project
              {filteredStudies.length === 1 ? '' : 's'}
            </p>
          </div>

          <motion.div layout className="mt-10 space-y-8">
            <AnimatePresence mode="popLayout">
              {filteredStudies.map((study) => (
                <motion.article
                  key={study.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                  className="rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-8 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35"
                >
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                    {/* Left: Interactive Live Screen Preview + Narrative */}
                    <div className="lg:col-span-8 space-y-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B7188]">
                          <span className="text-[#EE1119]">{study.sector}</span>
                          <span aria-hidden="true">·</span>
                          <span>{study.region}</span>
                          <span aria-hidden="true">·</span>
                          <span>{study.timeline}</span>
                          <span aria-hidden="true">·</span>
                          <span>{study.clientType}</span>
                        </div>

                        <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464]">
                          {study.title}
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
                        <div className="md:col-span-6">
                          <ProjectPreviewScreen
                            study={study}
                            onInspect={(selected) => setInspectedStudy(selected)}
                          />
                        </div>
                        <div className="md:col-span-6 space-y-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                              The Challenge
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63]">
                              {study.problem}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                              The 0xDEV Solution
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63]">
                              {study.solution}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F6F7FB] p-4 border border-[#E5E7F0]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464]">
                          Architecture Highlight
                        </p>
                        <p className="mt-1 text-sm text-[#4A4F63]">{study.architectureNotes}</p>
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="lg:col-span-4 flex h-full flex-col justify-between rounded-xl bg-[#1A1464] p-6 text-white">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                          Measured Outcomes
                        </p>
                        <div className="mt-5 space-y-5">
                          {study.metrics.map((metric) => (
                            <div
                              key={metric.label}
                              className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                            >
                              <p className="font-display text-3xl font-extrabold text-white tabular-nums">
                                {metric.value}
                              </p>
                              <p className="mt-0.5 text-xs text-white/75">{metric.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/15 space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                            Stack Implemented
                          </p>
                          <p className="mt-1 text-xs font-medium text-white/90">
                            {study.stackSummary}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setInspectedStudy(study)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/20 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-white hover:text-[#1A1464]"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Live Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigate('contact')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EE1119] hover:text-white transition-colors"
                          >
                            <span>Plan a similar build</span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />

      <ProjectPreviewModal
        study={inspectedStudy}
        onClose={() => setInspectedStudy(null)}
        actionLabel="Plan a Similar Build"
        onAction={() => {
          setInspectedStudy(null);
          onNavigate('contact');
        }}
      />
    </>
  );
};
