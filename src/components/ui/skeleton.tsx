import { cn } from "@/lib/utils";

/** Loading placeholder. `motion-safe:` so it auto-respects prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />;
}
