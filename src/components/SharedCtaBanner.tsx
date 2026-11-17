import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PageRoute } from '../data/siteData';
import { Reveal } from './MotionPrimitives';

interface SharedCtaBannerProps {
  onNavigate: (page: PageRoute) => void;
}

export const SharedCtaBanner: React.FC<SharedCtaBannerProps> = ({ onNavigate }) => {
  return (
    <section className="bg-white py-16 sm:py-20 border-t border-[#E5E7F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-[#1A1464] px-6 py-12 sm:px-12 sm:py-16 text-white shadow-[0_24px_60px_rgba(26,20,100,0.18)]">
            {/* Diagonal Red Swoosh Cut */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 h-full w-72 translate-x-20 -skew-x-12 bg-[#EE1119]/90 hidden md:block"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-16 h-full w-16 translate-x-20 -skew-x-12 bg-[#120D4A]/40 hidden md:block"
            />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119] md:text-white/85">
                  Kabale Studio · Worldwide Remote &amp; Freelance
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
                  Ready to replace five vendors with one team?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/80 max-w-xl">
                  Speak directly with Arigye Wisdom and our engineering leads for a practical
                  architecture, timeline, and budget breakdown.
                </p>
              </div>

              <div className="shrink-0">
                <motion.button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm sm:text-base font-bold text-[#1A1464] shadow-lg transition-colors duration-150 hover:bg-[#F6F7FB] whitespace-nowrap"
                >
                  <span>Start Your Project</span>
                  <ArrowRight
                    className="h-4 w-4 text-[#EE1119] transition-transform duration-150 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </motion.button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
