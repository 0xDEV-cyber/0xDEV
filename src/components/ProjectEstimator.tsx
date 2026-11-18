import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calculator, Check, Layers, Sparkles } from 'lucide-react';
import { EASE_OUT_EXPO, Reveal, SPRING_SNAPPY } from './MotionPrimitives';

export interface EstimateSelectionPayload {
  service: string;
  budget: string;
  summaryMessage: string;
}

interface ProjectEstimatorProps {
  onApplyEstimate: (payload: EstimateSelectionPayload) => void;
}

const PLATFORM_OPTIONS = [
  { id: 'web', label: 'Web App / SaaS Portal', baseCost: 6500, weeks: 4, service: 'Web & Mobile App Development' },
  { id: 'mobile', label: 'iOS & Android Mobile App', baseCost: 8000, weeks: 5, service: 'Web & Mobile App Development' },
  { id: 'apis', label: 'Custom APIs & Integrations', baseCost: 4500, weeks: 3, service: 'Custom Software & APIs' },
  { id: 'cloud', label: 'Cloud & DevOps Pipelines', baseCost: 3500, weeks: 2, service: 'Cloud & Infrastructure' },
  { id: 'security', label: 'Cybersecurity & Audit', baseCost: 3000, weeks: 2, service: 'Cybersecurity & Compliance' },
] as const;

const MODULE_OPTIONS = [
  { id: 'design', label: 'Full UI/UX Design System', cost: 2200, weeks: 2 },
  { id: 'payments', label: 'Mobile Money & Card Billing', cost: 2500, weeks: 2 },
  { id: 'realtime', label: 'Live Telemetry & Admin Portal', cost: 2800, weeks: 2 },
  { id: 'offline', label: 'Offline Field Sync (SQLite)', cost: 2400, weeks: 2 },
  { id: 'ai', label: 'Workflow Automation & BI', cost: 3200, weeks: 2 },
] as const;

const PACE_OPTIONS = [
  {
    id: 'standard',
    label: 'Standard Sprint Cadence',
    detail: 'Weekly staging builds · balanced cost',
    costMultiplier: 1,
    timeMultiplier: 1,
    model: 'Project-Based & Freelance',
  },
  {
    id: 'accelerated',
    label: 'Accelerated Launch Pod',
    detail: 'Parallel UI + Backend + DevOps engineers',
    costMultiplier: 1.25,
    timeMultiplier: 0.72,
    model: 'Dedicated Team Pod',
  },
  {
    id: 'retainer',
    label: 'Build + 24/7 Managed SLA',
    detail: 'Includes ongoing SRE & monthly feature bank',
    costMultiplier: 1.15,
    timeMultiplier: 1,
    model: 'Dedicated Team + Managed Retainer',
  },
] as const;

function mapToContactBudget(midCost: number, paceId: string): string {
  if (paceId === 'retainer' && midCost < 12000) return 'Managed Retainer ($1.5k – $15k/mo)';
  if (midCost < 5000) return 'Freelance / Micro-Project (Under $5k)';
  if (midCost <= 15000) return '$5k – $15k';
  if (midCost <= 40000) return '$15k – $40k';
  if (midCost <= 100000) return '$40k – $100k';
  return '$100k+';
}

export const ProjectEstimator: React.FC<ProjectEstimatorProps> = ({ onApplyEstimate }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['web']);
  const [selectedModules, setSelectedModules] = useState<string[]>(['design', 'payments']);
  const [paceId, setPaceId] = useState<(typeof PACE_OPTIONS)[number]['id']>('standard');

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const estimate = useMemo(() => {
    const chosenPlatforms = PLATFORM_OPTIONS.filter((p) => selectedPlatforms.includes(p.id));
    const chosenModules = MODULE_OPTIONS.filter((m) => selectedModules.includes(m.id));
    const pace = PACE_OPTIONS.find((p) => p.id === paceId) || PACE_OPTIONS[0];

    const platformSum = chosenPlatforms.reduce((acc, p) => acc + p.baseCost, 0);
    const moduleSum = chosenModules.reduce((acc, m) => acc + m.cost, 0);
    const rawTotal = (platformSum + moduleSum) * pace.costMultiplier;

    const minUsd = Math.round((rawTotal * 0.88) / 500) * 500;
    const maxUsd = Math.round((rawTotal * 1.16) / 500) * 500;

    const rawWeeks =
      chosenPlatforms.reduce((acc, p) => acc + p.weeks, 0) +
      chosenModules.reduce((acc, m) => acc + m.weeks, 0) * 0.65;
    const minWeeks = Math.max(2, Math.round(rawWeeks * pace.timeMultiplier * 0.85));
    const maxWeeks = Math.max(minWeeks + 2, Math.round(rawWeeks * pace.timeMultiplier * 1.15));

    const recommendedService =
      chosenPlatforms.length > 1
        ? 'Full-Stack (Multiple Layers)'
        : chosenPlatforms[0]?.service || 'Custom Software & APIs';

    const podSize =
      chosenPlatforms.length >= 3 || paceId === 'accelerated'
        ? '4–5 Engineers (Design + Full-Stack + DevOps)'
        : chosenPlatforms.length === 2
          ? '3 Engineers (UI/UX + Full-Stack + Cloud)'
          : '1–2 Senior Engineers (Lead Architect + Specialist)';

    return {
      minUsd,
      maxUsd,
      minWeeks,
      maxWeeks,
      pace,
      recommendedService,
      contactBudget: mapToContactBudget((minUsd + maxUsd) / 2, paceId),
      podSize,
      chosenPlatforms,
      chosenModules,
    };
  }, [selectedPlatforms, selectedModules, paceId]);

  const handleLockEstimate = () => {
    const platformNames = estimate.chosenPlatforms.map((p) => p.label).join(', ');
    const moduleNames =
      estimate.chosenModules.length > 0
        ? estimate.chosenModules.map((m) => m.label).join(', ')
        : 'Core architecture only';

    const summaryMessage = [
      `[0xDEV Scope Estimate]`,
      `Platforms: ${platformNames}`,
      `Modules: ${moduleNames}`,
      `Delivery Pace: ${estimate.pace.label}`,
      `Estimated Timeline: ${estimate.minWeeks}–${estimate.maxWeeks} weeks`,
      `Ballpark Budget: $${estimate.minUsd.toLocaleString()} – $${estimate.maxUsd.toLocaleString()} USD`,
      ``,
      `Project goals & details:`,
    ].join('\n');

    onApplyEstimate({
      service: estimate.recommendedService,
      budget: estimate.contactBudget,
      summaryMessage,
    });
  };

  return (
    <section
      id="project-estimator"
      aria-labelledby="estimator-heading"
      className="bg-white dark:bg-[#090D1F] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119] flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Quick Scope &amp; Cost Estimator</span>
          </p>
          <h2
            id="estimator-heading"
            className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance"
          >
            Get a quick ballpark before we talk.
          </h2>
          <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
            Pick the pieces you think you&apos;ll need. We&apos;ll calculate a realistic budget range
            and timeline you can drop straight into a project brief.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Controls */}
          <Reveal delay={0.05} className="lg:col-span-7 space-y-8 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] p-6 sm:p-8">
            {/* Step 1: Platforms */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                01 · Core Platforms (Pick 1 or more)
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PLATFORM_OPTIONS.map((opt) => {
                  const active = selectedPlatforms.includes(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      transition={SPRING_SNAPPY}
                      onClick={() => togglePlatform(opt.id)}
                      aria-pressed={active}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition-colors ${
                        active
                          ? 'border-[#1A1464] dark:border-[#3A459E] bg-[#1A1464] dark:bg-[#232B6E] text-white shadow-sm'
                          : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/40 dark:hover:border-white/25'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                          active ? 'bg-[#EE1119] text-white' : 'bg-[#F6F7FB] dark:bg-[#101530] text-[#6B7188] dark:text-[#8E97B8]'
                        }`}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Modules */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                02 · Extra Features &amp; Integrations (Optional)
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {MODULE_OPTIONS.map((mod) => {
                  const active = selectedModules.includes(mod.id);
                  return (
                    <motion.button
                      key={mod.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_SNAPPY}
                      onClick={() => toggleModule(mod.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#EE1119] bg-[#EE1119]/10 dark:bg-[#EE1119]/20 text-[#1A1464] dark:text-white'
                          : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#4A4F63] dark:text-[#B8C0DA] hover:border-[#1A1464]/40 dark:hover:border-white/25'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full transition-colors ${
                          active ? 'bg-[#EE1119]' : 'bg-[#CBD5E1] dark:bg-[#3A437A]'
                        }`}
                      />
                      <span>{mod.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Pace */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                03 · Speed &amp; Ongoing Support
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PACE_OPTIONS.map((pace) => {
                  const active = paceId === pace.id;
                  return (
                    <motion.button
                      key={pace.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      transition={SPRING_SNAPPY}
                      onClick={() => setPaceId(pace.id)}
                      aria-pressed={active}
                      className={`relative rounded-xl border p-3.5 text-left transition-colors ${
                        active
                          ? 'border-[#1A1464] dark:border-[#5D6BFF] bg-white dark:bg-[#182044]'
                          : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] hover:border-[#1A1464]/35 dark:hover:border-white/25'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="estimator-pace-ring"
                          aria-hidden="true"
                          transition={SPRING_SNAPPY}
                          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#1A1464]/20 dark:ring-[#5D6BFF]/40"
                        />
                      )}
                      <p className="font-display text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">{pace.label}</p>
                      <p className="mt-1 text-[11px] leading-snug text-[#6B7188] dark:text-[#8E97B8]">{pace.detail}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Right Live Summary Card */}
          <Reveal delay={0.12} className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] p-7 sm:p-8 text-white shadow-[0_24px_50px_rgba(26,20,100,0.2)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.5)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quick Estimate</span>
              </p>

              <div className="mt-5 border-b border-white/15 pb-5">
                <p className="text-xs text-white/70">Rough Budget Range (USD)</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${estimate.minUsd}-${estimate.maxUsd}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                    className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white tabular-nums"
                  >
                    ${estimate.minUsd.toLocaleString()} – ${estimate.maxUsd.toLocaleString()}
                  </motion.p>
                </AnimatePresence>
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-white/75">Estimated Timeline</dt>
                  <dd className="font-display font-bold text-white tabular-nums">
                    {estimate.minWeeks} – {estimate.maxWeeks} Weeks
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-white/75">Suggested Setup</dt>
                  <dd className="font-semibold text-right text-[#EE1119]">{estimate.pace.model}</dd>
                </div>
                <div className="border-t border-white/15 pt-4">
                  <dt className="text-xs uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                    <span>Who Works On It</span>
                  </dt>
                  <dd className="mt-1 font-semibold text-white/95">{estimate.podSize}</dd>
                </div>
              </dl>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_SNAPPY}
                onClick={handleLockEstimate}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(238,17,25,0.28)] transition-colors hover:bg-[#D00D14]"
              >
                <span>Use This Estimate in My Brief</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>

              <p className="mt-3 text-center text-[11px] text-white/65">
                Milestone billing · You keep all source code &amp; IP
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
