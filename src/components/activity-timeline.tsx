import {
  CalendarClock,
  CheckSquare,
  Eye,
  FileText,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  viewing: Eye,
  note: FileText,
  meeting: CalendarClock,
  task: CheckSquare,
};

type ActivityRow = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  occurred_at: string;
  /** Who logged it. Optional so call sites that don't select it still compile. */
  created_by?: string | null;
};

export function ActivityTimeline({
  activities,
  actorNames,
}: {
  activities: ActivityRow[];
  /**
   * user id -> display name. Server pages resolve `created_by` through
   * `profiles` and pass the map in; when it's absent (or has no entry) the
   * actor is simply omitted rather than showing a raw uuid.
   */
  actorNames?: Record<string, string>;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? FileText;
        const who = a.created_by ? actorNames?.[a.created_by] : undefined;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {a.subject ?? a.type}
              </p>
              {a.body ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.body}
                </p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {who ? (
                  <>
                    <span className="font-medium text-foreground">{who}</span>
                    {" · "}
                  </>
                ) : null}
                {new Date(a.occurred_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
