import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ENGAGEMENT_MODELS, FAQS, PageRoute } from '../data/siteData';
import {
  AccordionBody,
  InteractiveCard,
  ParallaxAccent,
  Reveal,
  SPRING_SNAPPY,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { EstimateSelectionPayload, ProjectEstimator } from './ProjectEstimator';
import { SharedCtaBanner } from './SharedCtaBanner';

interface WhyPageProps {
  onNavigate: (page: PageRoute) => void;
  onSelectEngagement: (modelName: string, budgetHint: string) => void;
  onApplyEstimate: (payload: EstimateSelectionPayload) => void;
}

const FRAGMENTED_VENDORS = [
  { role: 'Freelance UI Designer', pain: 'Sends static screens with zero backend or latency checks' },
  { role: 'Contract App Developers', pain: 'Blame the design or API specs whenever dates slip' },
  { role: 'External DevOps Consultant', pain: 'Bills hourly for manual server restarts and patches' },
  { role: 'Separate Cloud Reseller', pain: 'Monthly hosting bills climb with nobody watching waste' },
  { role: 'Ad-Hoc IT Support Desk', pain: 'Slow ticket queues right when customers hit a bug' },
];

const UNIFIED_BENEFITS = [
  {
    icon: UserCheck,
    title: 'One Person Responsible',
    description:
      'One engineering lead tracks outcomes from the first Figma screen through live production monitoring.',
  },
  {
    icon: Clock,
    title: 'Faster Weekly Progress',
    description:
      'Design, app code, and cloud infrastructure move together inside the same weekly sprint.',
  },
  {
    icon: DollarSign,
    title: 'Lower Total Spend',
    description:
      'Cut out duplicate agency markups, handoff delays, and bloated cloud bills.',
  },
  {
    icon: ShieldCheck,
    title: 'No Blame Passing',
    description:
      'When anything slows down or breaks, our team fixes it across code and servers right away.',
  },
];

export const WhyPage: React.FC<WhyPageProps> = ({
  onNavigate,
  onSelectEngagement,
  onApplyEstimate,
}) => {
  const [openFaqId, setOpenFaqId] = useState<string>(FAQS[0].id);

  return (
    <>
      <PageHeader
        eyebrow="Why 0xDEV"
        title="Stop juggling five contractors."
        description="Putting design, app code, cloud servers, and ongoing support inside one Kabale-led studio removes handoff delays and surprise costs."
        currentLabel="Why 0xDEV"
        onNavigate={onNavigate}
      />

      {/* Side-by-Side Comparison */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
            {/* Left: Messy 5-Vendor Reality */}
            <Reveal
              direction="right"
              distance={22}
              className="lg:col-span-6 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                      Usual Multi-Vendor Setup
                    </span>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      5 Separate Contractors, 5 Different Priorities
                    </h2>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-[#6B7188] dark:text-[#8E97B8] shrink-0" aria-hidden="true" />
                </div>

                <StaggerGrid staggerDelay={0.05} className="mt-6 space-y-3">
                  {FRAGMENTED_VENDORS.map((vendor, index) => (
                    <StaggerItem
                      key={vendor.role}
                      className="flex items-start gap-3.5 rounded-xl border border-dashed border-[#D3D7E6] dark:border-[#2E3766] bg-white dark:bg-[#141A38] px-4 py-3"
                    >
                      <XCircle
                        className="mt-0.5 h-4 w-4 text-[#EE1119]/75 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                          Vendor 0{index + 1}: {vendor.role}
                        </p>
                        <p className="text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0] mt-0.5">{vendor.pain}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerGrid>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] flex items-center justify-between text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                <span>Result: Slow handoffs &amp; unclear ownership</span>
                <span className="text-[#EE1119]">5 Invoices / Month</span>
              </div>
            </Reveal>

            {/* Right: Clean 0xDEV Unified Team */}
            <Reveal
              direction="left"
              distance={22}
              delay={0.08}
              className="relative lg:col-span-6 rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] p-6 sm:p-8 text-white shadow-[0_24px_48px_rgba(26,20,100,0.18)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden"
            >
              <ParallaxAccent
                offsetRange={[-12, 14]}
                className="pointer-events-none absolute -top-10 -right-10 h-44 w-44"
              >
                <div className="h-full w-full -skew-x-12 bg-[#EE1119]/15" />
              </ParallaxAccent>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                      How 0xDEV Works
                    </span>
                    <h2 className="mt-1 font-display text-xl font-bold text-white">
                      One Team Across the Whole Build
                    </h2>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-[#EE1119] shrink-0" aria-hidden="true" />
                </div>

                <div className="mt-6 space-y-3.5">
                  <div className="rounded-xl bg-white/10 p-4 border border-white/15">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-base font-bold text-white">
                        Your 0xDEV Engineering Squad
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#EE1119]">
                        1 Direct Lead
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-white/80 leading-relaxed">
                      UI design, web &amp; mobile engineering, backend APIs, cloud setup,
                      security, and 24/7 support all sit on one shared roadmap.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[
                      'Design & Code in Sync Weekly',
                      'Shared Cloud & Security Rules',
                      'Friday Staging Previews',
                      'Direct WhatsApp, Slack & Phone',
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2.5 rounded-xl bg-[#120D4A] p-3.5 border border-white/10"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-xs sm:text-sm font-medium text-white/95">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-white/80">
                <span>Result: Steady shipping &amp; clear ownership</span>
                <span className="text-white">1 Partner · 1 SLA</span>
              </div>
            </Reveal>
          </div>

          <StaggerGrid staggerDelay={0.06} className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {UNIFIED_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <StaggerItem key={benefit.title} className="h-full">
                  <InteractiveCard
                    hoverY={-5}
                    className="h-full rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#141A38] p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#101530] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#F4F6FC]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      {benefit.description}
                    </p>
                  </InteractiveCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Interactive Cost & Timeline Estimator */}
      <ProjectEstimator onApplyEstimate={onApplyEstimate} />

      {/* Engagement Models */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
              Ways to Work With Us
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC]">
              Pick the setup that fits your stage, from short freelance sprints to full squads.
            </h2>
          </Reveal>

          <StaggerGrid staggerDelay={0.07} className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
            {ENGAGEMENT_MODELS.map((model) => {
              const isHighlighted = Boolean(model.highlighted);
              return (
                <StaggerItem key={model.id} className="h-full">
                  <InteractiveCard
                    hoverY={-5}
                    className={`relative flex h-full flex-col justify-between rounded-2xl p-7 sm:p-8 ${
                      isHighlighted
                        ? 'border-2 border-[#EE1119] bg-white dark:bg-[#141A38] shadow-[0_24px_50px_rgba(238,17,25,0.12)] dark:shadow-[0_24px_50px_rgba(238,17,25,0.18)]'
                        : 'border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38]'
                    }`}
                  >
                    {isHighlighted && (
                      <div
                        aria-hidden="true"
                        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold uppercase tracking-[0.14em] ${
                            isHighlighted ? 'text-[#EE1119]' : 'text-[#6B7188] dark:text-[#8E97B8]'
                          }`}
                        >
                          {model.subtitle}
                        </span>
                        <span className="text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">{model.cadence}</span>
                      </div>

                      <h3 className="mt-3 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        {model.name}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {model.description}
                      </p>

                      <div className="mt-5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-3.5 border border-[#E5E7F0] dark:border-[#242C54]">
                        <p className="text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">Best for:</p>
                        <p className="mt-0.5 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">{model.bestFor}</p>
                      </div>

                      <ul className="mt-6 space-y-3">
                        {model.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                            <Check
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                isHighlighted ? 'text-[#EE1119]' : 'text-[#1A1464] dark:text-[#7C8CFF]'
                              }`}
                              aria-hidden="true"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#E5E7F0] dark:border-[#242C54]">
                      <div className="mb-4 flex items-center justify-between text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                        <span>Typical budget</span>
                        <span className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                          {model.budgetHint}
                        </span>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING_SNAPPY}
                        onClick={() => onSelectEngagement(model.name, model.budgetHint)}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors duration-150 ${
                          isHighlighted
                            ? 'bg-[#EE1119] text-white shadow-sm hover:bg-[#D00D14]'
                            : 'bg-[#1A1464] dark:bg-[#2E368F] text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]'
                        }`}
                      >
                        <span>{model.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </motion.button>
                    </div>
                  </InteractiveCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
              Frequently Asked Questions
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC]">
              Common questions before we start.
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-10 divide-y divide-[#E5E7F0] dark:divide-[#242C54] rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38]">
              {FAQS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="px-6 py-5 sm:px-8">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${faq.id}-panel`}
                      onClick={() => setOpenFaqId((prev) => (prev === faq.id ? '' : faq.id))}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="font-display text-base sm:text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {faq.question}
                      </span>
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isOpen ? 'bg-[#EE1119] text-white' : 'bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC]'
                        }`}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                    <AccordionBody
                      isOpen={isOpen}
                      id={`${faq.id}-panel`}
                      className="pt-3 pr-10 text-sm sm:text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]"
                    >
                      {faq.answer}
                    </AccordionBody>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
