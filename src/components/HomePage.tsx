import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Download,
  Eye,
  Layers,
  Quote,
  Shield,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  CaseStudy,
  COMPANY_CONTACT,
  HERO_STACK_LAYERS,
  PageRoute,
  SERVICES,
  STATS,
  TESTIMONIALS,
  TRUST_PARTNERS,
} from '../data/siteData';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { useDailyTechNews } from '../hooks/useDailyTechNews';
import { usePortfolioProjects } from '../hooks/usePortfolioProjects';
import {
  AnimatedCounter,
  ArchitecturalRule,
  EASE_OUT_EXPO,
  InteractiveCard,
  MaskLine,
  ParallaxAccent,
  Reveal,
  SPRING_SNAPPY,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';
import { EngineeringMotionCards } from './EngineeringMotionCards';
import { ProjectPreviewModal, ProjectPreviewScreen } from './ProjectPreviewVisual';
import { SharedCtaBanner } from './SharedCtaBanner';

interface HomePageProps {
  onNavigate: (page: PageRoute) => void;
  onSelectService: (serviceTitle: string) => void;
  onOpenArticle?: (slug: string) => void;
}

const layerIcons = [Layers, Terminal, Shield, Wrench];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectService,
  onOpenArticle,
}) => {
  const { projects } = usePortfolioProjects();
  const { articles } = useBlogPosts();
  const { liveArticles } = useDailyTechNews();
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [workSector, setWorkSector] = useState<string>('All');
  const [inspectedProject, setInspectedProject] = useState<CaseStudy | null>(null);
  const [moviesBannerImgFailed, setMoviesBannerImgFailed] = useState(false);
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
      <section className="relative overflow-hidden bg-white dark:bg-[#090D1F] pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <ParallaxAccent
          offsetRange={[-24, 24]}
          className="pointer-events-none absolute -top-24 right-0 h-[540px] w-[48%] hidden lg:block"
        >
          <motion.div
            initial={{ opacity: 0, x: 56 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
            className="h-full w-full translate-x-16 -skew-x-12 bg-[#F6F7FB] dark:bg-[#101530]"
          />
        </ParallaxAccent>
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.65, delay: 0.14, ease: EASE_OUT_EXPO }}
          className="pointer-events-none origin-top absolute top-16 right-[46%] h-64 w-1.5 -skew-x-12 bg-[#EE1119]/85 hidden lg:block"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <motion.p
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
                className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]"
              >
                {COMPANY_CONTACT.location} · Open for Remote &amp; Freelance Work
              </motion.p>

              <h1 className="mt-4 font-display text-[clamp(2.25rem,4.1vw,3.65rem)] font-extrabold leading-[1.08] tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                <MaskLine delay={0.05}>One Team.</MaskLine>
                <MaskLine delay={0.14}>
                  <span className="relative inline-block">
                    <span className="relative z-10">Every Layer</span>
                    <motion.span
                      aria-hidden="true"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.36, ease: EASE_OUT_EXPO }}
                      className="origin-left absolute left-0 right-0 bottom-1.5 h-3 -skew-x-12 bg-[#EE1119]/15 dark:bg-[#EE1119]/30"
                    />
                  </span>{' '}
                  of Your Technology.
                </MaskLine>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.22, ease: EASE_OUT_EXPO }}
                className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]"
              >
                We design, write, deploy, and maintain your software, cloud setup, and security under
                one roof. Whether you need a complete product build or a hands-on freelance partner,
                you work with{' '}
                <strong className="font-semibold text-[#1A1464] dark:text-white">
                  one accountable team
                </strong>{' '}
                instead of chasing five separate contractors.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.28, ease: EASE_OUT_EXPO }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <motion.button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  whileHover={{ y: -2.5, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAPPY}
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
                  onClick={() => {
                    const el = document.getElementById('our-work-showcase');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      onNavigate('work');
                    }
                  }}
                  whileHover={{ y: -2.5 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAPPY}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors duration-150 hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F] dark:hover:border-[#2E368F] whitespace-nowrap"
                >
                  <Eye className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                  <span>See Our Work ({projects.length})</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ x: 2 }}
                  onClick={() => onNavigate('services')}
                  className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors whitespace-nowrap"
                >
                  <span>Explore Services</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.34 }}
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-[#4A4F63] dark:text-[#B8C0DA]"
              >
                <span>Direct Engineer Contact</span>
                <span className="text-[#EE1119]" aria-hidden="true">/</span>
                <span>100% Code Ownership</span>
                <span className="text-[#EE1119]" aria-hidden="true">/</span>
                <span>Call or WhatsApp: {COMPANY_CONTACT.phoneDisplay}</span>
              </motion.div>
            </div>

            {/* Interactive 4-Layer Architecture Stack */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.16, ease: EASE_OUT_EXPO }}
              className="lg:col-span-6"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 sm:p-7 shadow-[0_20px_50px_rgba(26,20,100,0.09)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-6 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                />

                <div className="flex items-center justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                      How We Deliver
                    </p>
                    <p className="mt-0.5 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      Design · Build · Infrastructure · Maintain
                    </p>
                  </div>
                  <span className="font-display text-xs font-bold tabular-nums text-[#EE1119]">
                    0{activeLayerIndex + 1} / 04
                  </span>
                </div>

                {/* Live Cycle Progress Hairline */}
                <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-[#E5E7F0] dark:bg-[#242C54]">
                  {!paused ? (
                    <motion.div
                      key={`progress-${activeLayer.id}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 3.8, ease: 'linear' }}
                      className="h-full w-full origin-left bg-[#EE1119]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#EE1119]/40" />
                  )}
                </div>

                <div className="mt-4 space-y-2.5" role="tablist" aria-label="0xDEV Technology Stack Layers">
                  {HERO_STACK_LAYERS.map((layer, index) => {
                    const Icon = layerIcons[index];
                    const isActive = index === activeLayerIndex;
                    return (
                      <motion.button
                        key={layer.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setPaused(true);
                          setActiveLayerIndex(index);
                        }}
                        className={`relative group flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors duration-200 ${
                          isActive
                            ? 'border-[#1A1464] dark:border-[#3A459E] text-white'
                            : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#182044]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="hero-stack-active-bg"
                            aria-hidden="true"
                            transition={SPRING_SNAPPY}
                            className="absolute inset-0 rounded-xl bg-[#1A1464] dark:bg-[#232B6E] shadow-md"
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? 'bg-[#EE1119] text-white'
                                : 'bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] border border-[#E5E7F0] dark:border-[#242C54]'
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-display text-xs font-bold tabular-nums ${
                                  isActive ? 'text-[#EE1119]' : 'text-[#6B7188] dark:text-[#8E97B8]'
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
                                isActive ? 'text-white/80' : 'text-[#4A4F63] dark:text-[#B8C0DA]'
                              }`}
                            >
                              {layer.tagline}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-150 ${
                            isActive
                              ? 'text-[#EE1119] translate-x-0.5'
                              : 'text-[#6B7188] dark:text-[#8E97B8] opacity-60 group-hover:opacity-100'
                          }`}
                          aria-hidden="true"
                        />
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-4 border border-[#E5E7F0] dark:border-[#242C54] min-h-[112px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeLayer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {activeLayer.details}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {activeLayer.deliverables.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
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
          <div className="mt-16 pt-8">
            <ArchitecturalRule className="mb-8" />
            <StaggerGrid staggerDelay={0.05} className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8] shrink-0">
                Built for growing teams across Uganda, Africa &amp; remote clients
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:gap-9">
                {TRUST_PARTNERS.map((partner) => (
                  <StaggerItem
                    key={partner.name}
                    className="flex items-center gap-2 text-[#6B7188] dark:text-[#8E97B8] transition-colors hover:text-[#1A1464] dark:hover:text-white"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 -skew-x-12 bg-[#1A1464]/25 dark:bg-white/30"
                    />
                    <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
                      {partner.name}
                    </span>
                  </StaggerItem>
                ))}
              </div>
            </StaggerGrid>
          </div>
        </div>
      </section>

      {/* 2. Why 0xDEV Snapshot */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Why 0xDEV
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                  Stop juggling five contractors.
                </h2>
                <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
                  Most software projects slow down in the gaps between separate freelancers and
                  agencies. We put design, code, hosting, and support under one team.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                onClick={() => onNavigate('why-0xdev')}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F] whitespace-nowrap"
              >
                <span>Compare Models &amp; Pricing</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Reveal direction="right" distance={22}>
              <InteractiveCard hoverY={-4} className="h-full rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                  Split Multi-Vendor Setup
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                  5 Contractors, Nobody Owns the Fix
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                  {[
                    'Separate UI designer, backend freelancer, DevOps contractor, host, and support desk',
                    'Days wasted forwarding screenshots and arguing over who caused a bug',
                    'Overlapping retainers and surprise monthly cloud bills',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <XCircle className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </InteractiveCard>
            </Reveal>

            <Reveal direction="left" distance={22} delay={0.08}>
              <InteractiveCard hoverY={-4} spotlightTone="dark" className="h-full rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] p-6 sm:p-8 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  How 0xDEV Works
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  One Team From Sketch to 24/7 Uptime
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-white/85">
                  {[
                    'Designers, full-stack developers, and cloud engineers in one weekly sprint',
                    'Direct contact with Arigye Wisdom in Kabale, Uganda',
                    'Clear milestones, full source code ownership, and predictable upkeep',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </InteractiveCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Core Services Preview */}
      <section className="bg-white dark:bg-[#090D1F] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  What We Do
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                  Every skill needed to build and run dependable software.
                </h2>
              </div>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                onClick={() => onNavigate('services')}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#120D4A] dark:hover:bg-[#3A43A8] whitespace-nowrap"
              >
                <span>View All 9 Services &amp; Tech Stack</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>
          </Reveal>

          <StaggerGrid staggerDelay={0.055} className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 6).map((service) => (
              <StaggerItem key={service.id} className="h-full">
                <InteractiveCard
                  hoverY={-5}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 transition-colors duration-200 hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:shadow-md"
                >
                  <div
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
                  />
                  <div>
                    <span className="font-display text-xs font-bold tabular-nums text-[#EE1119]">
                      {service.number}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      {service.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectService(service.title)}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors"
                  >
                    <span>Ask about this service</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </InteractiveCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 3b. Interactive Architecture Motion Cards */}
      <EngineeringMotionCards
        onSelectService={onSelectService}
        onNavigateServices={() => onNavigate('services')}
      />

      {/* 4. Stats Band */}
      <section
        ref={statsRef}
        aria-label="Key 0xDEV Metrics"
        className="relative overflow-hidden bg-[#1A1464] py-16 sm:py-20 text-white"
      >
        <ParallaxAccent
          offsetRange={[-16, 18]}
          className="pointer-events-none absolute top-0 left-0 h-full w-40"
        >
          <div className="h-full w-full -translate-x-20 -skew-x-12 bg-[#EE1119]/15" />
        </ParallaxAccent>
        <ParallaxAccent
          offsetRange={[16, -16]}
          className="pointer-events-none absolute bottom-0 right-0 h-full w-56"
        >
          <div className="h-full w-full translate-x-24 -skew-x-12 bg-[#120D4A]" />
        </ParallaxAccent>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StaggerGrid staggerDelay={0.07} className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <StaggerItem
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
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 5. See Some of Our Work Showcase (All 12 Live Screen Previews) */}
      <section id="our-work-showcase" className="bg-white dark:bg-[#090D1F] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Selected Builds · {projects.length} Shipped Projects
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                  Interactive screen previews across fintech, health, agritech &amp; cloud.
                </h2>
                <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
                  Click any preview screen below to check the interface, architecture notes, and
                  production numbers.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                onClick={() => onNavigate('work')}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F] whitespace-nowrap"
              >
                <span>Open Full Work Archive</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>
          </Reveal>

          {/* Sector Filter Tabs */}
          <div className="mt-8 overflow-x-auto pb-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1.5"
              role="tablist"
              aria-label="Filter showcased work by sector"
            >
              {['All', ...Array.from(new Set(projects.map((s) => s.sector)))].map((sector) => {
                const isActive = workSector === sector;
                return (
                  <button
                    key={sector}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setWorkSector(sector)}
                    className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive ? 'text-white' : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="home-work-filter"
                        aria-hidden="true"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
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

          <motion.div layout className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {(workSector === 'All'
                ? projects
                : projects.filter((s) => s.sector === workSector)
              ).map((study) => (
                <motion.article
                  key={study.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  whileHover={{ y: -5 }}
                  transition={SPRING_SNAPPY}
                  className="flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-5 shadow-sm transition-shadow duration-200 hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:shadow-md"
                >
                  <div>
                    <ProjectPreviewScreen
                      study={study}
                      onInspect={(selected) => setInspectedProject(selected)}
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                      <span className="text-[#EE1119]">{study.sector}</span>
                      <span aria-hidden="true">·</span>
                      <span>{study.region}</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {study.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-3">
                      {study.solution}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54]">
                    <div className="grid grid-cols-3 gap-2">
                      {study.metrics.map((metric) => (
                        <div key={metric.label}>
                          <p className="font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                            {metric.value}
                          </p>
                          <p className="text-[11px] leading-tight text-[#6B7188] dark:text-[#8E97B8]">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInspectedProject(study)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] border border-[#E5E7F0] dark:border-[#242C54] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F]"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Open Screen Preview</span>
                    </motion.button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* 6. Partner Feedback Carousel */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Partner Feedback
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC]">
                  Why engineering leads stick with 0xDEV.
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  {TESTIMONIALS.map((t, idx) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      aria-label={`View feedback ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-200 ${
                        idx === activeSlide
                          ? 'w-6 bg-[#EE1119]'
                          : 'w-2 bg-[#1A1464]/20 dark:bg-white/25 hover:bg-[#1A1464]/45'
                      }`}
                    />
                  ))}
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() =>
                    setActiveSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                  }
                  aria-label="Previous feedback"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F]"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveSlide((prev) => (prev + 1) % TESTIMONIALS.length)}
                  aria-label="Next feedback"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F]"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </motion.button>
              </div>
            </div>
          </Reveal>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-7 sm:p-10 shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.26, ease: EASE_OUT_EXPO }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center"
              >
                <div className="lg:col-span-8">
                  <Quote className="h-8 w-8 text-[#EE1119]" aria-hidden="true" />
                  <blockquote className="mt-4 font-display text-lg sm:text-2xl font-semibold leading-snug text-[#1A1464] dark:text-[#F4F6FC]">
                    “{currentTestimonial.quote}”
                  </blockquote>
                </div>
                <div className="lg:col-span-4 lg:border-l lg:border-[#E5E7F0] dark:lg:border-[#242C54] lg:pl-8">
                  <p className="font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                    {currentTestimonial.name}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[#4A4F63] dark:text-[#C2C9E0]">
                    {currentTestimonial.role}
                  </p>
                  <p className="text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                    {currentTestimonial.company}
                  </p>
                  <div className="mt-5 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#EE1119]">
                      Measured Result
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                      {currentTestimonial.outcome}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 7. Engineering Insights Preview Strip */}
      <section className="bg-white dark:bg-[#090D1F] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Engineering Notes
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                  Field notes from recent builds.
                </h2>
                <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
                  Practical write-ups on payments, offline mobile sync, and cloud billing alongside
                  a daily developer news feed.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                onClick={() => onNavigate('blog')}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F] whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                <span>Read All {articles.length + liveArticles.length} Articles</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>
          </Reveal>

          <StaggerGrid staggerDelay={0.07} className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
            {[...articles.slice(0, 2), ...liveArticles.slice(0, 1), ...articles.slice(2, 3)]
              .slice(0, 3)
              .map((article) => (
              <StaggerItem key={article.id} className="h-full">
                <InteractiveCard
                  hoverY={-5}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#141A38] p-6 transition-colors hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#182044] hover:shadow-md"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      <span className="text-[#EE1119] font-bold">{article.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>{article.publishedDate}</span>
                    </p>
                    <h3 className="mt-2.5 font-display text-lg font-extrabold leading-snug text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors">
                      <a
                        href={`/blog/${article.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (onOpenArticle) {
                            onOpenArticle(article.slug);
                          } else {
                            onNavigate('blog');
                          }
                        }}
                      >
                        {article.title}
                      </a>
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#E5E7F0] dark:border-[#242C54] pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>{article.readTimeMinutes} min read</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenArticle) {
                          onOpenArticle(article.slug);
                        } else {
                          onNavigate('blog');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] group-hover:text-[#EE1119] transition-colors"
                    >
                      <span>Read Note</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                    </button>
                  </div>
                </InteractiveCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 8. Coming Soon: Movies & Free Downloads */}
      <section
        aria-label="Coming Soon: Movies and Free Downloads"
        className="bg-[#F6F7FB] dark:bg-[#101530] py-20 sm:py-24 border-t border-[#E5E7F0] dark:border-[#242C54]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <InteractiveCard
              hoverY={-4}
              className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-10 shadow-sm"
            >
              <div
                aria-hidden="true"
                className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                    Coming Soon · Free Media Hub
                  </p>
                  <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                    Movies &amp; free offline downloads are coming to 0xDEV.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                    Stream open-license classics, independent films, and engineering documentaries
                    or download lightweight 480p, 720p, and 1080p MP4 packages completely free with
                    zero paywalls.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8]">
                    <span>480p · 720p · 1080p MP4</span>
                    <span className="text-[#EE1119]" aria-hidden="true">/</span>
                    <span>Zero Subscriptions</span>
                    <span className="text-[#EE1119]" aria-hidden="true">/</span>
                    <span>Offline Playback Ready</span>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_SNAPPY}
                      onClick={() => onNavigate('movies')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#D00D14] whitespace-nowrap shrink-0"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>Preview Upcoming Hub</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <button
                    type="button"
                    onClick={() => onNavigate('movies')}
                    aria-label="Open Movies and Free Downloads preview page"
                    className="group/media relative block w-full overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#120D4A] aspect-video text-left"
                  >
                    {!moviesBannerImgFailed ? (
                      <img
                        src="/src/assets/images/movies_cinema_hub_1795014042309.jpg"
                        alt="0xDEV upcoming free cinema and download hub"
                        referrerPolicy="no-referrer"
                        onError={() => setMoviesBannerImgFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[#1A1464] p-6 text-center text-white">
                        <Clapperboard className="h-10 w-10 text-[#EE1119]" aria-hidden="true" />
                        <p className="mt-2 font-display text-base font-bold">
                          Movies &amp; Free Downloads
                        </p>
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#090D1F]/85 via-[#090D1F]/25 to-transparent"
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                          Launching Soon
                        </p>
                        <p className="font-display text-sm sm:text-base font-bold">
                          Free Streaming &amp; Direct MP4 Downloads
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur-md px-3 py-1.5 text-xs font-bold border border-white/20 whitespace-nowrap shrink-0">
                        <span>Get Notified</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </InteractiveCard>
          </Reveal>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />

      <ProjectPreviewModal
        study={inspectedProject}
        onClose={() => setInspectedProject(null)}
        actionLabel="Plan a Similar Build"
        onAction={(study) => {
          setInspectedProject(null);
          onSelectService(study.deliverableType);
        }}
      />
    </>
  );
};
