import { createElement, type ReactElement } from "react";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/server";
import { registerBrandFonts } from "@/lib/pdf/fonts";
import { DeepDiveDocument } from "@/lib/pdf/deep-dive-document";

// react-pdf + bundled TTFs need the Node runtime (not Edge).
export const runtime = "nodejs";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { data: report } = await supabase
    .from("deep_dive_reports")
    .select("markdown, created_at")
    .eq("company_id", id)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report?.markdown) return new Response("No Deep Dive report yet", { status: 404 });

  registerBrandFonts();
  const title = company?.name ?? "Company";
  const element = createElement(DeepDiveDocument, {
    title,
    markdown: report.markdown,
    generatedOn: new Date(report.created_at).toLocaleDateString("en-GB"),
  }) as unknown as ReactElement<DocumentProps>;
  const pdf = await renderToBuffer(element);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug(title)}-deep-dive.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
