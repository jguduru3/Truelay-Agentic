import type { SVGProps } from "react";
import { cn } from "../lib/utils";
import { useBlockingPageGate } from "../hooks/usePageContentReady";

/** Brand-neutral "working" mark: a ring that draws itself in and out. */
export function AnimatedLoadingIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="-1 -1 26 26"
      className={cn("app-thinking-icon", className)}
      aria-hidden="true"
      {...props}
    >
      <path
        className="app-thinking-icon-path"
        d="M12 2 a10 10 0 1 1 0 20 a10 10 0 1 1 0 -20"
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full-page loading state: a large, centered, gray animated ring. */
export function AppLoading({ className }: { className?: string }) {
  // While a full-page loading state is on screen the page has not loaded.
  useBlockingPageGate();
  return (
    <div
      role="status"
      className={cn("flex min-h-dvh w-full items-center justify-center", className)}
    >
      <AnimatedLoadingIcon className="h-24 w-24 text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
