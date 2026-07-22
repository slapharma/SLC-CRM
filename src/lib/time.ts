// Tiny time helpers. Kept out of components so calling them during render does
// not trip the react-hooks purity rule (the time read happens here, server-side).

/** True if the ISO timestamp is in the past. */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** Whole days elapsed since the ISO timestamp (never negative). */
export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
