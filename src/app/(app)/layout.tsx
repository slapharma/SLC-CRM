import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string } | null = null;

  // Real auth boundary lives here (the proxy only does optimistic session refresh).
  // Before Supabase is provisioned we render a demo shell instead of locking people out.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();
    if (!authedUser) redirect("/login");
    user = { email: authedUser.email };
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} demo={!isSupabaseConfigured} />
        <main className="flex-1 overflow-x-hidden p-6 text-sm">{children}</main>
      </div>
    </div>
  );
}
