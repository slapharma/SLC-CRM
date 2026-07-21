import { renderParticularsPdf } from "@/lib/pdf/build-particulars";
import { createClient } from "@/lib/supabase/server";

// react-pdf and the bundled TTFs need the Node runtime (not Edge).
export const runtime = "nodejs";

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

  const pdf = await renderParticularsPdf(id, supabase);
  if (!pdf) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
