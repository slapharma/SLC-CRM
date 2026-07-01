"use client";

import * as React from "react";
import { useActionState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileDown, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { runDeepDive } from "@/lib/actions/deep-dive";
import type { FormState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export type DeepDiveReport = {
  markdown: string | null;
  created_at: string;
  model: string | null;
};

// Style the rendered markdown via child-selector utilities (no typography plugin).
const PROSE = cn(
  "text-sm text-foreground",
  "[&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold",
  "[&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_p]:mt-2 [&_p]:leading-relaxed",
  "[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
  "[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li]:leading-relaxed",
  "[&_strong]:font-semibold",
  "[&_a]:text-info [&_a]:underline",
  "[&_hr]:my-3 [&_hr]:border-border",
  "[&_table]:mt-2 [&_table]:w-full [&_table]:text-left",
  "[&_th]:border-b [&_th]:py-1 [&_th]:pr-3 [&_th]:font-medium",
  "[&_td]:border-b [&_td]:border-border/50 [&_td]:py-1 [&_td]:pr-3",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
);

export function DeepDiveView({
  companyId,
  report,
}: {
  companyId: string;
  report: DeepDiveReport | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    runDeepDive,
    {},
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form action={action}>
          <input type="hidden" name="company_id" value={companyId} />
          <Button type="submit" disabled={pending}>
            <Sparkles />
            {pending ? "Researching…" : report?.markdown ? "Refresh Deep Dive" : "Run Deep Dive"}
          </Button>
        </form>
        {report?.markdown ? (
          <a
            href={`/companies/${companyId}/deep-dive`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <FileDown />
            Download PDF
          </a>
        ) : null}
      </div>

      {pending ? (
        <p className="text-sm text-muted-foreground">
          Researching the web with AI — this can take up to a minute.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      {report?.markdown ? (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Generated {new Date(report.created_at).toLocaleString("en-GB")}
            {report.model ? ` · ${report.model}` : ""}
          </p>
          <div className={cn("rounded-md border bg-muted/20 p-4", PROSE)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown>
          </div>
        </div>
      ) : !pending ? (
        <p className="text-sm text-muted-foreground">
          No Deep Dive yet. Click “Run Deep Dive” to research this company with AI —
          useful for gauging long-term client value and finding an angle to close.
        </p>
      ) : null}
    </div>
  );
}
