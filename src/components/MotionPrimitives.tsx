import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
  Variants,
} from 'motion/react';

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  scale?: number;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 20,
  scale = 1,
}) => {
  const offset =
    direction === 'up'
      ? { y: distance, x: 0 }
      : direction === 'down'
        ? { y: -distance, x: 0 }
        : direction === 'left'
          ? { x: distance, y: 0 }
          : direction === 'right'
            ? { x: -distance, y: 0 }
            : { x: 0, y: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, scale, ...offset }}
      whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface MaskLineProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const MaskLine: React.FC<MaskLineProps> = ({
  children,
  className,
  delay = 0,
}) => (
  <span className={`block overflow-hidden ${className || ''}`}>
    <motion.span
      className="block"
      initial={{ y: '105%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{ duration: 0.62, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.span>
  </span>
);

interface ArchitecturalRuleProps {
  className?: string;
  delay?: number;
  origin?: 'left' | 'right' | 'center';
}

export const ArchitecturalRule: React.FC<ArchitecturalRuleProps> = ({
  className = '',
  delay = 0,
  origin = 'left',
}) => {
  const originClass =
    origin === 'right'
      ? 'origin-right'
      : origin === 'center'
        ? 'origin-center'
        : 'origin-left';

  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT_EXPO }}
      className={`${originClass} h-px bg-[#E5E7F0] dark:bg-[#242C54] ${className}`}
    />
  );
};

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggerGrid: React.FC<StaggerGroupProps> = ({
  children,
  className,
  staggerDelay = 0.06,
}) => {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.04,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 'some' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.46,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div variants={staggerItemVariants} className={className}>
    {children}
  </motion.div>
);

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  hoverY?: number;
  onClick?: () => void;
  enableSpotlight?: boolean;
  spotlightTone?: 'light' | 'dark' | 'auto';
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className = '',
  hoverY = -5,
  onClick,
  enableSpotlight = true,
  spotlightTone = 'auto',
}) => {
  const mouseX = useMotionValue(-300);
  const mouseY = useMotionValue(-300);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enableSpotlight) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [enableSpotlight, mouseX, mouseY]
  );

  const lightGradient = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, rgba(26, 20, 100, 0.055), rgba(238, 17, 25, 0.03) 45%, transparent 75%)`;
  const darkGradient = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, rgba(124, 140, 255, 0.14), rgba(238, 17, 25, 0.06) 45%, transparent 75%)`;

  return (
    <motion.article
      whileHover={{ y: hoverY }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`group/card relative overflow-hidden ${className}`}
    >
      {enableSpotlight && (
        <>
          {spotlightTone !== 'dark' && (
            <motion.div
              aria-hidden="true"
              style={{ background: lightGradient }}
              className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 ${
                spotlightTone === 'auto' ? 'dark:hidden' : ''
              }`}
            />
          )}
          {spotlightTone !== 'light' && (
            <motion.div
              aria-hidden="true"
              style={{ background: darkGradient }}
              className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 ${
                spotlightTone === 'auto' ? 'hidden dark:block' : ''
              }`}
            />
          )}
        </>
      )}
      {children}
    </motion.article>
  );
};

interface ParallaxAccentProps {
  children?: React.ReactNode;
  className?: string;
  offsetRange?: [number, number];
}

export const ParallaxAccent: React.FC<ParallaxAccentProps> = ({
  children,
  className = '',
  offsetRange = [-18, 22],
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], offsetRange);

  return (
    <div ref={ref} aria-hidden="true" className={className}>
      <motion.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  );
};

interface AccordionBodyProps {
  isOpen: boolean;
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionBody: React.FC<AccordionBodyProps> = ({
  isOpen,
  id,
  children,
  className = '',
}) => (
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        id={id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
        className="overflow-hidden"
      >
        <div className={className}>{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const AnimatedCounter: React.FC<{
  target: number;
  suffix: string;
  decimals?: number;
  start?: boolean;
  autoObserve?: boolean;
}> = ({ target, suffix, decimals = 0, start, autoObserve = false }) => {
  const [value, setValue] = useState(0);
  const [triggered, setTriggered] = useState(Boolean(start));
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (start !== undefined) {
      if (start) setTriggered(true);
      return;
    }
    if (!autoObserve || !spanRef.current) return;
    const node = spanRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [start, autoObserve]);

  useEffect(() => {
    if (!triggered) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const duration = 1250;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(target * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [triggered, target]);

  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <span ref={spanRef} className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
};
