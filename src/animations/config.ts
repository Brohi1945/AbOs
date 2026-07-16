// ============================================================
//  ANIMATION CONTROL CENTER
//  Pura app ka animation "feel" yahan se control hota hai.
//  Kahin bhi duration/easing hardcode NAHI karni — hamesha
//  yahan se import karo. Kal agar speed/style badalni ho,
//  sirf neeche wale numbers change karo — poori app update ho jayegi.
// ============================================================

 = "texport const DURATION = {
  fast: 0.15,
  base: 0.18,
  medium: 0.22,
  slow: 0.35,
} as const;

export const EASE = {
  out: "easeOut",
  inOut: "easeInOut",
  spring: { type: "spring", stiffness: 300, damping: 24 },
} as const;

export const STAGGER = {
  delayChildren: 0.05,
  staggerChildren: 0.06,
} as const;

export const INTERACTION = {
  hoverScale: 1.02,
  tapScale: 0.97,
} as const;

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

export const COUNT_UP_DURATION_MS = 800;

export const TOAST_DURATION = {
  success: 2600,
  error: 3200,
  info: 2600,
} as const;

export const TOAST_POSITION = "top-right" as const;
