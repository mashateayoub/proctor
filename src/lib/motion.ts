'use client';

import type { Transition, Variants } from 'framer-motion';

/**
 * Shared Framer Motion presets for the entire application.
 * Import these in any page/component to keep animations consistent.
 */

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ── Fade up (most common — headings, sections, cards) ──
export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease } as Transition,
};

// ── Fade in (subtle reveal — badges, secondary text) ──
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4, ease: 'easeOut' as const },
};

// ── Scale in (cards, modals) ──
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease } as Transition,
};

// ── Slide from left (sidebar links) ──
export const slideLeft = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ── Stagger container (wrap children to stagger their animations) ──
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// ── Stagger item (used inside stagger containers) ──
export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

// ── Modal overlay ──
export const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 } as Transition,
};

// ── Modal content ──
export const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: { duration: 0.25, ease } as Transition,
};

// ── Table row ──
export const tableRowVariant = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

// ── Button tap spring ──
export const tapSpring = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.01 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
};
