// Tiny time helpers. Kept out of components so calling them during render does
// not trip the react-hooks purity rule (the time read happens here, server-side).

/** True if the ISO timestamp is in the past. */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
