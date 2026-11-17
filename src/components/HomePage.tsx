import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Quote,
  Shield,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  CASE_STUDIES,
  COMPANY_CONTACT,
  HERO_STACK_LAYERS,
  PageRoute,
  SERVICES,
  STATS,
  TESTIMONIALS,
  TRUST_PARTNERS,
} from '../data/siteData';
import { EASE_OUT_EXPO, Reveal, StaggerGrid, StaggerItem } from './MotionPrimitives';
import { SharedCtaBanner } from './SharedCtaBanner';

interface HomePageProps {
  onNavigate: (page: PageRoute) => void;
  onSelectService: (serviceTitle: string) => void;
}

const layerIcons = [Layers, Terminal, Shield, Wrench];

const AnimatedCounter: React.FC<{
  target: number;
  suffix: string;
  decimals?: number;
  start: boolean;
}> = ({ target, suffix, decimals = 0, start }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const duration = 1200;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [start, target]);

  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectService }) => {
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const statsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveLayerIndex((prev) => (prev + 1) % HERO_STACK_LAYERS.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const activeLayer = HERO_STACK_LAYERS[activeLayerIndex];
  const currentTestimonial = TESTIMONIALS[activeSlide];

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[48%] translate-x-16 -skew-x-12 bg-[#F6F7FB] hidden lg:block"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE_OUT_EXPO }}
          className="pointer-events-none origin-top absolute top-16 right-[46%] h-64 w-1.5 -skew-x-12 bg-[#EE1119]/85 hidden lg:block"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
                className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]"
              >
                {COMPANY_CONTACT.location} · Open for Remote &amp; Freelance Work
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.06, ease: EASE_OUT_EXPO }}
                className="mt-4 font-display text-[clamp(2.25rem,4.1vw,3.65rem)] font-extrabold leading-[1.08] tracking-tight text-[#1A1464] text-balance"
              >
                One Team.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">Every Layer</span>
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.55, delay: 0.3, ease: EASE_OUT_EXPO }}
                    className="origin-left absolute left-0 right-0 bottom-1.5 h-3 -skew-x-12 bg-[#EE1119]/15"
                  />
                </span>{' '}
                of Your Technology.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12, ease: EASE_OUT_EXPO }}
                className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#4A4F63]"
              >
                We design, build, deploy, and maintain software, cloud infrastructure, and
                cybersecurity under one roof. Whether you need a full product build or an agile
                freelance engineering partner, you work with{' '}
                <strong className="font-semibold text-[#1A1464]">one accountable team</strong>{' '}
                instead of juggling five vendors.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18, ease: EASE_OUT_EXPO }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <motion.button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-[0_10px_24px_rgba(238,17,25,0.24)] transition-colors duration-150 hover:bg-[#D00D14] whitespace-nowrap"
                >
                  <span>Start Your Project</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => onNavigate('services')}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1A1464] bg-white px-7 py-3.5 text-sm sm:text-base font-semibold text-[#1A1464] transition-colors duration-150 hover:bg-[#1A1464] hover:text-white whitespace-nowrap"
                >
                  <span>Explore Services</span>
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.25 }}
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-[#4A4F63]"
              >
                <span>Single Point of Contact</span>
                <span className="text-[#EE1119]" aria-hidden="true">/</span>
                <span>100% IP &amp; Code Ownership</span>
                <span className="text-[#EE1119]" aria-hidden="true">/</span>
                <span>Direct Access: {COMPANY_CONTACT.phoneDisplay}</span>
              </motion.div>
            </div>

            {/* Interactive 4-Layer Architecture Stack */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14, ease: EASE_OUT_EXPO }}
              className="lg:col-span-6"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="relative rounded-2xl border border-[#E5E7F0] bg-white p-5 sm:p-7 shadow-[0_20px_50px_rgba(26,20,100,0.09)]">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-6 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                />

                <div className="flex items-center justify-between border-b border-[#E5E7F0] pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188]">
                      Unified Delivery Stack
                    </p>
                    <p className="mt-0.5 font-display text-base font-bold text-[#1A1464]">
                      Design · Build · Infrastructure · Maintain
                    </p>
                  </div>
                  <span className="font-display text-xs font-bold tabular-nums text-[#EE1119]">
                    0{activeLayerIndex + 1} / 04
                  </span>
                </div>

                <div className="mt-5 space-y-2.5" role="tablist" aria-label="0xDEV Technology Stack Layers">
                  {HERO_STACK_LAYERS.map((layer, index) => {
                    const Icon = layerIcons[index];
                    const isActive = index === activeLayerIndex;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          setPaused(true);
                          setActiveLayerIndex(index);
                        }}
                        className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                          isActive
                            ? 'border-[#1A1464] bg-[#1A1464] text-white shadow-md translate-x-1'
                            : 'border-[#E5E7F0] bg-[#F6F7FB] text-[#1A1464] hover:border-[#1A1464]/35 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? 'bg-[#EE1119] text-white'
                                : 'bg-white text-[#1A1464] border border-[#E5E7F0]'
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-display text-xs font-bold tabular-nums ${
                                  isActive ? 'text-[#EE1119]' : 'text-[#6B7188]'
                                }`}
                              >
                                {layer.step}
                              </span>
                              <span className="font-display text-sm sm:text-base font-bold truncate">
                                {layer.name}
                              </span>
                            </div>
                            <p
                              className={`text-xs truncate ${
                                isActive ? 'text-white/80' : 'text-[#4A4F63]'
                              }`}
                            >
                              {layer.tagline}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                            isActive
                              ? 'text-[#EE1119] translate-x-0.5'
                              : 'text-[#6B7188] opacity-60 group-hover:opacity-100'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl bg-[#F6F7FB] p-4 border border-[#E5E7F0] min-h-[112px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeLayer.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed text-[#4A4F63]">
                        {activeLayer.details}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {activeLayer.deliverables.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1464]"
                          >
                            <Check className="h-3.5 w-3.5 text-[#EE1119] shrink-0" aria-hidden="true" />
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trust Strip */}
          <div className="mt-16 border-t border-[#E5E7F0] pt-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] shrink-0">
                Trusted by growing teams across Uganda, Africa &amp; remote partners
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:gap-9">
                {TRUST_PARTNERS.map((partner) => (
                  <div
                    key={partner.name}
                    className="flex items-center gap-2 text-[#6B7188] transition-colors hover:text-[#1A1464]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 -skew-x-12 bg-[#1A1464]/25"
                    />
                    <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
                      {partner.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why 0xDEV Snapshot */}
      <section className="bg-[#F6F7FB] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Why 0xDEV
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] text-balance">
                  Stop juggling five vendors.
                </h2>
                <p className="mt-3 text-base text-[#4A4F63]">
                  Most software projects stall in the gaps between disconnected freelancers and
                  agencies. We replace five separate contracts with one accountable team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('why-0xdev')}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] bg-white px-5 py-3 text-sm font-semibold text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white whitespace-nowrap"
              >
                <span>Compare Models &amp; Pricing</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Reveal direction="right" distance={20}>
              <div className="h-full rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188]">
                  Fragmented Multi-Vendor Setup
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-[#1A1464]">
                  5 Contractors, Zero Shared Ownership
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-[#4A4F63]">
                  {[
                    'Separate UI freelancer, backend shop, DevOps contractor, host, and support desk',
                    'Days lost translating specs and blaming another vendor when bugs appear',
                    'Overlapping retainers and unexpected server bills',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <XCircle className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal direction="left" distance={20} delay={0.08}>
              <div className="h-full rounded-2xl bg-[#1A1464] p-6 sm:p-8 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  The 0xDEV Approach
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  One Team From Wireframe to 24/7 Uptime
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-white/85">
                  {[
                    'Designers, full-stack engineers, and cloud architects in one unified sprint',
                    'Single point of contact led by Arigye Wisdom in Kabale, Uganda',
                    'Transparent milestones, full code ownership, and predictable maintenance',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Core Services Preview */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Capabilities Overview
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] text-balance">
                  Every discipline required to ship and run reliable technology.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-[#1A1464] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#120D4A] whitespace-nowrap"
              >
                <span>View All 9 Services &amp; Tech Stack</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Reveal>

          <StaggerGrid className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 6).map((service) => (
              <StaggerItem key={service.id} className="h-full">
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] bg-white p-6 transition-colors duration-200 hover:border-[#1A1464]/35 hover:shadow-md"
                >
                  <div
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"
                  />
                  <div>
                    <span className="font-display text-xs font-bold tabular-nums text-[#EE1119]">
                      {service.number}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold text-[#1A1464]">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63]">
                      {service.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectService(service.title)}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] group-hover:text-[#EE1119] transition-colors"
                  >
                    <span>Request this service</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 4. Stats Band */}
      <section
        ref={statsRef}
        aria-label="Key 0xDEV Metrics"
        className="relative overflow-hidden bg-[#1A1464] py-16 sm:py-20 text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 h-full w-40 -translate-x-20 -skew-x-12 bg-[#EE1119]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-full w-56 translate-x-24 -skew-x-12 bg-[#120D4A]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.id}
                className="border-t border-white/15 pt-6 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0 sm:odd:border-l-0 sm:odd:pl-0 sm:even:border-l sm:even:pl-6 lg:odd:border-l lg:odd:pl-6 lg:first:border-l-0 lg:first:pl-0"
              >
                <p className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#EE1119]">
                  <AnimatedCounter
                    target={stat.target}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                    start={statsVisible}
                  />
                </p>
                <p className="mt-2 font-display text-base font-bold text-white">{stat.label}</p>
                <p className="mt-1 text-xs sm:text-sm text-white/75">{stat.context}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured Work Snapshot */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Featured Case Studies
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] text-balance">
                  Proven engineering across fintech, health &amp; logistics.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('work')}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] bg-white px-5 py-3 text-sm font-semibold text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white whitespace-nowrap"
              >
                <span>Read Full Case Studies</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Reveal>

          <StaggerGrid className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {CASE_STUDIES.map((study) => (
              <StaggerItem key={study.id} className="h-full">
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] bg-white p-6 transition-shadow duration-200 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7188]">
                      <span className="text-[#EE1119]">{study.sector}</span>
                      <span aria-hidden="true">·</span>
                      <span>{study.region}</span>
                    </div>
                    <h3 className="mt-2.5 font-display text-xl font-bold text-[#1A1464]">
                      {study.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#4A4F63]">{study.solution}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E5E7F0] grid grid-cols-3 gap-3">
                    {study.metrics.map((metric) => (
                      <div key={metric.label}>
                        <p className="font-display text-lg font-extrabold text-[#1A1464] tabular-nums">
                          {metric.value}
                        </p>
                        <p className="text-[11px] text-[#6B7188]">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 6. Client Testimonials Carousel */}
      <section className="bg-[#F6F7FB] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                Client Outcomes
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464]">
                Why partners trust 0xDEV.
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() =>
                  setActiveSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                }
                aria-label="Previous testimonial"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7F0] bg-white text-[#1A1464] transition-colors hover:border-[#1A1464] hover:bg-[#1A1464] hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length)}
                aria-label="Next testimonial"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7F0] bg-white text-[#1A1464] transition-colors hover:border-[#1A1464] hover:bg-[#1A1464] hover:text-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </motion.button>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[#E5E7F0] bg-white p-7 sm:p-10 shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center"
              >
                <div className="lg:col-span-8">
                  <Quote className="h-8 w-8 text-[#EE1119]" aria-hidden="true" />
                  <blockquote className="mt-4 font-display text-lg sm:text-2xl font-semibold leading-snug text-[#1A1464]">
                    “{currentTestimonial.quote}”
                  </blockquote>
                </div>
                <div className="lg:col-span-4 lg:border-l lg:border-[#E5E7F0] lg:pl-8">
                  <p className="font-display text-base font-bold text-[#1A1464]">
                    {currentTestimonial.name}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[#4A4F63]">
                    {currentTestimonial.role}
                  </p>
                  <p className="text-xs font-semibold text-[#6B7188]">{currentTestimonial.company}</p>
                  <div className="mt-5 pt-4 border-t border-[#E5E7F0]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#EE1119]">
                      Measured Result
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1A1464]">
                      {currentTestimonial.outcome}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
