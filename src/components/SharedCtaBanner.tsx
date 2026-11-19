import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PageRoute } from '../data/siteData';
import { EASE_OUT_EXPO, ParallaxAccent, Reveal, SPRING_SNAPPY } from './MotionPrimitives';

interface SharedCtaBannerProps {
  onNavigate: (page: PageRoute) => void;
}

export const SharedCtaBanner: React.FC<SharedCtaBannerProps> = ({ onNavigate }) => {
  return (
    <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal scale={0.985} duration={0.55}>
          <div className="relative overflow-hidden rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] px-6 py-12 sm:px-12 sm:py-16 text-white shadow-[0_24px_60px_rgba(26,20,100,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            {/* Scroll-linked Diagonal Red Swoosh Cut */}
            <ParallaxAccent
              offsetRange={[-14, 16]}
              className="pointer-events-none absolute top-0 right-0 h-full w-72 hidden md:block"
            >
              <div className="h-full w-full translate-x-20 -skew-x-12 bg-[#EE1119]/90" />
            </ParallaxAccent>
            <motion.div
              aria-hidden="true"
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true, amount: 'some' }}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE_OUT_EXPO }}
              className="pointer-events-none origin-top absolute top-0 right-16 h-full w-16 translate-x-20 -skew-x-12 bg-[#120D4A]/40 hidden md:block"
            />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119] md:text-white/85">
                  Kabale Studio · Remote &amp; Freelance Worldwide
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
                  Ready to put one team in charge of the whole stack?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/80 max-w-xl">
                  Talk straight with Arigye Wisdom for a clear timeline, honest architecture notes,
                  and a realistic budget breakdown.
                </p>
              </div>

              <div className="shrink-0">
                <motion.button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAPPY}
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
