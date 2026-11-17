import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Globe, MessageSquare, ShieldCheck } from 'lucide-react';
import { COMPANY_CONTACT, PageRoute, PROCESS_STEPS } from '../data/siteData';
import { EASE_OUT_EXPO, StaggerGrid, StaggerItem } from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface ProcessPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ProcessPage: React.FC<ProcessPageProps> = ({ onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentStep = PROCESS_STEPS[activeIndex];
  const progressScale = (activeIndex + 1) / PROCESS_STEPS.length;

  return (
    <>
      <PageHeader
        eyebrow="How We Work"
        title="A disciplined five-stage engineering process."
        description="Every milestone is visible, tested, and documented—whether you hire us for a focused freelance sprint or an end-to-end production system."
        currentLabel="Process"
        onNavigate={onNavigate}
      />

      {/* Interactive 5-Stage Timeline */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mb-6 hidden lg:block">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7F0] dark:bg-[#242C54]">
              <motion.div
                className="h-full w-full origin-left rounded-full bg-[#EE1119]"
                initial={false}
                animate={{ scaleX: progressScale }}
                transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
              />
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            role="tablist"
            aria-label="0xDEV Delivery Process"
          >
            {PROCESS_STEPS.map((item, index) => {
              const isSelected = index === activeIndex;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveIndex(index)}
                  className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[#1A1464] dark:border-[#3A459E] bg-[#1A1464] dark:bg-[#232B6E] text-white shadow-lg -translate-y-0.5'
                      : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#182044]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-display text-xs font-extrabold tabular-nums ${
                        isSelected ? 'text-[#EE1119]' : 'text-[#6B7188] dark:text-[#8E97B8]'
                      }`}
                    >
                      STEP {item.step}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-white/75' : 'text-[#6B7188] dark:text-[#8E97B8]'
                      }`}
                    >
                      {item.duration}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold">{item.title}</h2>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected ? 'text-[#EE1119] translate-x-0.5' : 'text-[#6B7188] dark:text-[#8E97B8]'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Active Step Deep Breakdown */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-12"
              >
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                    <span>Phase {currentStep.step}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6B7188] dark:text-[#8E97B8]">{currentStep.duration}</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                    {currentStep.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                    {currentStep.description}
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                        Client Touchpoint
                      </p>
                      <p className="mt-1.5 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">{currentStep.clientTouchpoint}</p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#EE1119]">
                        Quality Gate
                      </p>
                      <p className="mt-1.5 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">{currentStep.qualityGate}</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#141A38] p-6 border border-[#E5E7F0] dark:border-[#242C54] flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                      Tangible Phase Artifacts
                    </p>
                    <ul className="mt-4 space-y-3">
                      {currentStep.artifacts.map((artifact) => (
                        <li
                          key={artifact}
                          className="flex items-center gap-2.5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          <CheckCircle2
                            className="h-4 w-4 text-[#EE1119] shrink-0"
                            aria-hidden="true"
                          />
                          <span>{artifact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54]">
                    <button
                      type="button"
                      onClick={() => onNavigate('contact')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                    >
                      <span>Book a Discovery Call for Phase 01</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Remote & Freelance Collaboration Standards */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
              Collaboration Standards
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Built for smooth local &amp; remote freelance collaboration.
            </h2>
            <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
              From {COMPANY_CONTACT.location}, we partner seamlessly with organizations down the
              road or across continents.
            </p>
          </div>

          <StaggerGrid className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Globe,
                title: 'Timezone & Async Discipline',
                body: `${COMPANY_CONTACT.timezone}. Every sprint includes clear written changelogs, recorded walkthroughs, and predictable call windows.`,
              },
              {
                icon: MessageSquare,
                title: 'Direct Access Without Gatekeepers',
                body: `No account-manager relay games. Speak directly with ${COMPANY_CONTACT.leadName} and the engineers shipping your product via WhatsApp, Slack, or phone.`,
              },
              {
                icon: ShieldCheck,
                title: 'Full Repository & Cloud Transparency',
                body: 'You hold admin rights to GitHub/GitLab repositories, Figma workspaces, and AWS/Azure/GCP accounts from day one.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.title} className="h-full">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                    className="h-full rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-7"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">{item.body}</p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
