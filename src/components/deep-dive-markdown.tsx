import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

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

// Split out of deep-dive-view.tsx and dynamically imported there — react-markdown +
// remark-gfm only need to ship to browsers that actually render a report.
export default function DeepDiveMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className={cn("rounded-md border bg-muted/20 p-4", PROSE)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
