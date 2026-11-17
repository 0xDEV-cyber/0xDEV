import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PageRoute } from '../data/siteData';
import { EASE_OUT_EXPO } from './MotionPrimitives';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  currentLabel: string;
  onNavigate: (page: PageRoute) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  currentLabel,
  onNavigate,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-[#E5E7F0] bg-[#F6F7FB] py-14 sm:py-18">
      {/* Subtle Diagonal Signature Slash */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
        className="pointer-events-none absolute top-0 right-0 h-full w-64 translate-x-24 -skew-x-12 bg-white/70 hidden lg:block"
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT_EXPO }}
        className="pointer-events-none origin-top absolute top-0 right-56 h-full w-1.5 -skew-x-12 bg-[#EE1119]/80 hidden lg:block"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.nav
          aria-label="Breadcrumb"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="flex items-center gap-2 text-xs font-semibold text-[#6B7188]"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            className="hover:text-[#1A1464] transition-colors"
          >
            Home
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
          <span className="text-[#1A1464]">{currentLabel}</span>
        </motion.nav>

        <div className="mt-5 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: EASE_OUT_EXPO }}
            className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT_EXPO }}
            className="mt-2.5 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1A1464] text-balance leading-[1.1]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: EASE_OUT_EXPO }}
            className="mt-4 text-base sm:text-lg leading-relaxed text-[#4A4F63]"
          >
            {description}
          </motion.p>
        </div>
      </div>
    </section>
  );
};
