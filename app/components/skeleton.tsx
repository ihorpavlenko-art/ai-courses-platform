/**
 * Shared loading skeleton components for consistent loading states across pages.
 * Uses CSS classes defined in globals.css for animation.
 */

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Base rectangular skeleton placeholder.
 */
export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * Text-line skeleton placeholder (thinner border radius).
 */
export function SkeletonText({ className = "", width, height = "1rem" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-text ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * Circular skeleton placeholder (avatars, icons).
 */
export function SkeletonCircle({ className = "", width = "2.5rem", height = "2.5rem" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-circle ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * Card skeleton — a full card-shaped loading placeholder.
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] ${className}`}
      aria-hidden="true"
    >
      <SkeletonText width="60%" height="1.25rem" className="mb-3" />
      <SkeletonText width="80%" height="0.875rem" className="mb-2" />
      <SkeletonText width="40%" height="0.875rem" />
    </div>
  );
}

/**
 * Page-level skeleton with title and content grid.
 * Provides a consistent loading state for authenticated pages.
 */
export function PageSkeleton({
  title = true,
  cards = 6,
  columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}: {
  title?: boolean;
  cards?: number;
  columns?: string;
}) {
  return (
    <div aria-busy="true" aria-label="Loading content">
      {title && (
        <SkeletonText width="12rem" height="1.75rem" className="mb-6" />
      )}
      <div className={`grid gap-4 ${columns}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
