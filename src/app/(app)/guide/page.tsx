import type { Metadata } from "next";

import { GuideJourney } from "@/components/guide-journey";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quick Guide" };

export default async function GuidePage() {
  // Mirror the layout's admin check so the Admin step only shows to admins.
  let isAdmin = false;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: adminRow } = await supabase
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      isAdmin = Boolean(adminRow);
    }
  }

  return <GuideJourney isAdmin={isAdmin} />;
}
