import { Search } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopBar({
  user,
  demo,
}: {
  user: { email?: string } | null;
  demo?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search companies, listings, requirements…"
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {demo ? (
          <span className="hidden rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 sm:inline dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            Demo — Supabase not configured
          </span>
        ) : null}
        <ThemeToggle />
        {user?.email ? (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
