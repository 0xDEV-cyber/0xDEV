import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { CASE_STUDIES, PageRoute } from '../data/siteData';
import { EASE_OUT_EXPO } from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface WorkPageProps {
  onNavigate: (page: PageRoute) => void;
}

const SECTORS = ['All', 'Fintech', 'Healthcare', 'Logistics'] as const;

export const WorkPage: React.FC<WorkPageProps> = ({ onNavigate }) => {
  const [selectedSector, setSelectedSector] = useState<(typeof SECTORS)[number]>('All');

  const filteredStudies =
    selectedSector === 'All'
      ? CASE_STUDIES
      : CASE_STUDIES.filter((item) => item.sector === selectedSector);

  return (
    <>
      <PageHeader
        eyebrow="Featured Work & Case Studies"
        title="Systems engineered for uptime, speed, and clarity."
        description="Explore how consolidating design, software engineering, and cloud operations under 0xDEV eliminates multi-vendor bottlenecks and delivers measurable outcomes."
        currentLabel="Work"
        onNavigate={onNavigate}
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7F0] pb-6">
            <div
              className="flex flex-wrap gap-1.5 rounded-xl bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]"
              role="tablist"
              aria-label="Filter case studies by sector"
            >
              {SECTORS.map((sector) => {
                const isActive = selectedSector === sector;
                return (
                  <button
                    key={sector}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedSector(sector)}
                    className={`relative rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
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
                    <span className="relative z-10">{sector}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-medium text-[#6B7188] tabular-nums">
              Showing {filteredStudies.length} representative engagement
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
                  className="rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-9 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35"
                >
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B7188]">
                        <span className="text-[#EE1119]">{study.sector}</span>
                        <span aria-hidden="true">·</span>
                        <span>{study.region}</span>
                        <span aria-hidden="true">·</span>
                        <span>{study.timeline}</span>
                      </div>

                      <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464]">
                        {study.title}
                      </h2>

                      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                            The Challenge
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[#4A4F63]">
                            {study.problem}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                            The 0xDEV Solution
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[#4A4F63]">
                            {study.solution}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-xl bg-[#F6F7FB] p-4 border border-[#E5E7F0]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464]">
                          Architecture Highlight
                        </p>
                        <p className="mt-1 text-sm text-[#4A4F63]">{study.architectureNotes}</p>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-[#1A1464] p-6 text-white">
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

                      <div className="mt-6 pt-4 border-t border-white/15">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                          Stack Implemented
                        </p>
                        <p className="mt-1 text-xs font-medium text-white/90">
                          {study.stackSummary}
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigate('contact')}
                          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#EE1119] hover:text-white transition-colors"
                        >
                          <span>Plan a similar build</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
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
    </>
  );
};
