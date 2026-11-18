import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowUpRight,
  Cloud,
  Code2,
  Compass,
  Cpu,
  GitBranch,
  Layers,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { PageRoute, SERVICES, ServiceItem, TECH_STACK, TechItem } from '../data/siteData';
import {
  InteractiveCard,
  Reveal,
  SPRING_SNAPPY,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface ServicesPageProps {
  onNavigate: (page: PageRoute) => void;
  onSelectService: (serviceTitle: string) => void;
}

type CategoryFilter = 'All' | TechItem['category'];
const CATEGORIES: CategoryFilter[] = [
  'All',
  'Frontend & Mobile',
  'Backend & APIs',
  'Cloud & DevOps',
  'Data & Security',
];

const iconMap: Record<ServiceItem['iconName'], React.ComponentType<{ className?: string }>> = {
  Compass,
  Smartphone,
  Code2,
  Cloud,
  GitBranch,
  ShieldCheck,
  Cpu,
  Activity,
  Layers,
};

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate, onSelectService }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  const filteredTech =
    selectedCategory === 'All'
      ? TECH_STACK
      : TECH_STACK.filter((item) => item.category === selectedCategory);

  return (
    <>
      <PageHeader
        eyebrow="What We Do"
        title="Nine disciplines. One engineering team."
        description="Whether you need a complete software build or focused freelance help from our Kabale studio, every part of your product is handled under one roof."
        currentLabel="Services"
        onNavigate={onNavigate}
      />

      {/* Detailed Services Grid */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StaggerGrid staggerDelay={0.05} className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = iconMap[service.iconName];
              return (
                <StaggerItem key={service.id} className="h-full">
                  <InteractiveCard
                    hoverY={-5}
                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-7 transition-shadow duration-200 hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:shadow-[0_18px_38px_rgba(26,20,100,0.08)] dark:hover:shadow-[0_18px_38px_rgba(0,0,0,0.4)]"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
                    />

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC] transition-colors group-hover:bg-[#1A1464] dark:group-hover:bg-[#2E368F] group-hover:text-white">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="font-display text-xs font-bold tabular-nums text-[#6B7188] dark:text-[#8E97B8] group-hover:text-[#EE1119] transition-colors">
                          {service.number}
                        </span>
                      </div>

                      <h2 className="mt-5 font-display text-xl font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {service.title}
                      </h2>
                      <p className="mt-2.5 text-sm font-medium leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {service.summary}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-[#6B7188] dark:text-[#8E97B8]">
                        {service.deepDive}
                      </p>

                      <div className="mt-4 rounded-xl bg-[#F6F7FB] dark:bg-[#101530] p-3.5 border border-[#E5E7F0] dark:border-[#242C54]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                          Good fit for
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                          {service.idealFor}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54]">
                      <p className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">{service.deliverables}</p>
                      <button
                        type="button"
                        onClick={() => onSelectService(service.title)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors group-hover:text-[#EE1119]"
                      >
                        <span>Ask about this service</span>
                        <ArrowUpRight
                          className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </InteractiveCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                  Tools We Ship With
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC]">
                  Proven tools across frontend, backend &amp; cloud.
                </h2>
              </div>

              <div
                className="flex flex-wrap gap-1.5 rounded-xl bg-white dark:bg-[#141A38] p-1.5 border border-[#E5E7F0] dark:border-[#242C54]"
                role="tablist"
                aria-label="Filter technologies by layer"
              >
                {CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedCategory(category)}
                      className={`relative rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
                        isActive ? 'text-white' : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="services-category-pill"
                          aria-hidden="true"
                          transition={SPRING_SNAPPY}
                          className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                        />
                      )}
                      <span className="relative z-10">{category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <motion.div layout className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredTech.map((tech) => (
                <motion.div
                  key={tech.name}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  whileHover={{ y: -3 }}
                  transition={SPRING_SNAPPY}
                  className="group flex items-center justify-between rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-4 transition-colors duration-150 hover:border-[#1A1464]/35 dark:hover:border-white/25 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm sm:text-base font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                      {tech.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7188] dark:text-[#8E97B8] truncate">{tech.role}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="h-5 w-1.5 shrink-0 -skew-x-12 rounded-xs bg-[#E5E7F0] dark:bg-[#2E3766] transition-colors group-hover:bg-[#EE1119]"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
