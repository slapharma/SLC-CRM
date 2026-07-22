"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Info, X } from "lucide-react";

/**
 * Shown when "Create deal" found an existing deal for the same
 * requirement ↔ listing pair and redirected here (?existing=1) instead of
 * duplicating it. Dismissing also strips the query param so a refresh
 * doesn't resurrect the banner.
 */
export function ExistingDealNotice({
  dealId,
  renamed = false,
}: {
  dealId: string;
  /** True when the title typed into the modal was applied to this deal. */
  renamed?: boolean;
}) {
  const router = useRouter();
  const [hidden, setHidden] = React.useState(false);
  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    router.replace(`/deals/${dealId}`, { scroll: false });
  }

  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
    >
      <span className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {renamed
          ? "A deal for this pairing already existed — you've been brought to it, and renamed it to the title you typed."
          : "A deal for this pairing already existed — you've been brought to it."}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-sky-100 dark:hover:bg-sky-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
