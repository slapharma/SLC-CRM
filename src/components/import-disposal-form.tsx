"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importDisposal } from "@/lib/disposals/actions";
import type { DisposalImportState } from "@/lib/disposals/import";

export function ImportDisposalForm() {
  const [state, formAction, pending] = useActionState<DisposalImportState, FormData>(
    importDisposal,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="url"
          type="url"
          placeholder="Paste a CDG Leisure property URL to import…"
          aria-label="CDG property URL"
          required
          className="sm:max-w-md"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          <Download />
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {state.message}{" "}
          {state.id ? (
            <Link href={`/listings/${state.id}`} className="font-medium underline">
              Open listing →
            </Link>
          ) : null}
        </p>
      ) : null}
      {state.warnings?.length ? (
        <ul className="text-xs text-amber-600 dark:text-amber-400">
          {state.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
