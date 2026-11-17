import React from 'react';
import { motion, Variants } from 'motion/react';

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 18,
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
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_OUT_EXPO,
    },
  },
};

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerGrid: React.FC<StaggerGroupProps> = ({ children, className }) => (
  <motion.div
    variants={staggerContainerVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.08 }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<StaggerGroupProps> = ({ children, className }) => (
  <motion.div variants={staggerItemVariants} className={className}>
    {children}
  </motion.div>
);
