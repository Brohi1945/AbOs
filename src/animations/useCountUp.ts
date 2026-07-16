import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
}

export function useCountUp(
  target: number | string,
  options: UseCountUpOptions = {}
): string | number {
  const { duration = 800, delay = 0 } = options;

  // Convert target to number (if it's a string like "Rs 1,000" extract the number)
  const numericTarget = typeof target === "string"
    ? parseFloat(target.replace(/[^0-9.-]/g, "")) || 0
    : target;

  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Don't start if target is 0 or invalid
    if (numericTarget === 0) {
      setValue(0);
      setStarted(false);
      return;
    }

    // Start after delay
    const timer = setTimeout(() => {
      setStarted(true);
      startTimeRef.current = null;
      frameRef.current = null;
    }, delay);

    return () => clearTimeout(timer);
  }, [numericTarget, delay]);

  useEffect(() => {
    if (!started) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min(
        1,
        (timestamp - startTimeRef.current) / duration
      );

      // Ease out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(eased * numericTarget);

      setValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(numericTarget);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [started, numericTarget, duration]);

  // If target was a string with Rs or commas, return as string with formatting
  if (typeof target === "string") {
    return value.toLocaleString();
  }

  return value;
}
