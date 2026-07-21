import Link from "next/link";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SendHistoryRow = {
  id: string;
  at: string;
  recipientName: string | null;
  recipientEmail: string;
  companyName: string | null;
  senderName: string | null;
  pdfKind: string | null;
  /** The other half of the pair — the listing on a requirement page, and vice versa. */
  aboutLabel: string | null;
  aboutHref: string | null;
};

/** External send history for a listing or requirement — who was emailed what, when. */
export function SendHistoryCard({
  sends,
  className,
}: {
  sends: SendHistoryRow[];
  className?: string;
}) {
  if (sends.length === 0) return null;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          Send history
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {sends.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-medium">
                {s.recipientName ?? s.recipientEmail}
              </span>
              {s.companyName ? (
                <span className="text-muted-foreground">({s.companyName})</span>
              ) : null}
              <span className="text-muted-foreground">
                {new Date(s.at).toLocaleDateString("en-GB")}
                {s.senderName ? ` · by ${s.senderName}` : ""}
              </span>
              {s.pdfKind ? (
                <Badge tone={s.pdfKind === "unbranded" ? "orange" : "teal"}>
                  {s.pdfKind === "unbranded" ? "Unbranded PDF" : "Branded PDF"}
                </Badge>
              ) : null}
              {s.aboutLabel ? (
                s.aboutHref ? (
                  <Link
                    href={s.aboutHref}
                    className="text-muted-foreground hover:text-info hover:underline"
                  >
                    re: {s.aboutLabel}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">re: {s.aboutLabel}</span>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
