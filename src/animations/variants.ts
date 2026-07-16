// ============================================================
//  Reusable framer-motion VARIANTS.
//  Modal, Drawer, StatCard grids, etc. yahan se import karte hain
//  instead of apna initial/animate/exit likhne ke.
// ============================================================
import { DURATION, EASE, STAGGER } from "./config";
import type { Variants, Transition } from "framer-motion";

export const backdropTransition: Transition = { duration: DURATION.base, ease: EASE.out };
export const modalTransition: Transition = { duration: DURATION.medium, ease: EASE.out };
export const drawerTransition: Transition = { duration: DURATION.medium, ease: EASE.out };

export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const drawerSlideRight: Variants = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
};

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      delayChildren: STAGGER.delayChildren,
      staggerChildren: STAGGER.staggerChildren,
    },
  },
};

export const floatLoop: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 2, repeat: Infinity, ease: EASE.inOut },
  },
};
