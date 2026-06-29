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
};

export function ActivityTimeline({
  activities,
}: {
  activities: ActivityRow[];
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? FileText;
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
