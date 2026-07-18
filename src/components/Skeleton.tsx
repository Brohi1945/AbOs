import React from "react";
import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg ${className}`}
          style={{
            background:
              "linear-gradient(90deg, var(--color-border) 25%, var(--color-text-muted) 50%, var(--color-border) 75%)",
            backgroundSize: "200% 100%",
            opacity: 0.35,
            animation: "skeleton-loading 1.5s infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-surface border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16 mt-2" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }) {
  return (
    <div className="border-t py-3 px-5 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? "w-32" : "w-20"} flex-1`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-surface border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i === 0 ? "w-32" : "w-20"} flex-1`} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-surface border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="h-56 flex items-end gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              height: `${20 + Math.random() * 60}%`,
              minHeight: "20%",
            }}
          />
        ))}
      </div>
    </div>
  );
}
