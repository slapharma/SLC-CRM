import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: Middleware was renamed to Proxy. This file must live at the same
// level as src/app. Only one proxy file is supported per project.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
