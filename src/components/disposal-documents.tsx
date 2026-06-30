"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  addDisposalDocument,
  deleteDisposalDocument,
} from "@/lib/actions/disposal-documents";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "disposal-docs";

const DOC_TYPE_LABELS: Record<string, string> = {
  floor_plan: "Floor plan",
  vendor: "Vendor doc",
  brochure: "Brochure",
  epc: "EPC",
  other: "Document",
};

export type DisposalDoc = {
  id: string;
  name: string;
  doc_type: string;
  size_bytes: number | null;
  file_path: string;
  url: string | null;
};

function formatBytes(n: number | null) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DisposalDocuments({
  disposalId,
  docs,
}: {
  disposalId: string;
  docs: DisposalDoc[];
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [docType, setDocType] = React.useState("floor_plan");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${disposalId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("disposal_id", disposalId);
    fd.set("file_path", path);
    fd.set("name", file.name);
    fd.set("doc_type", docType);
    fd.set("size_bytes", String(file.size));
    const res = await addDisposalDocument({}, fd);
    if (res.error) setError(res.error);
    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-foreground">
                  {doc.name}
                </span>
                <Badge tone="slate">{DOC_TYPE_LABELS[doc.doc_type] ?? "Document"}</Badge>
                {doc.size_bytes != null ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(doc.size_bytes)}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${doc.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : null}
                <form action={deleteDisposalDocument}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="disposal_id" value={disposalId} />
                  <input type="hidden" name="file_path" value={doc.file_path} />
                  <button
                    type="submit"
                    aria-label={`Delete ${doc.name}`}
                    onClick={(e) => {
                      if (
                        !window.confirm(
                          `Delete “${doc.name}”? The file is permanently removed.`,
                        )
                      )
                        e.preventDefault();
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
        <div className="space-y-1">
          <Label htmlFor="doc-type" className="text-xs text-muted-foreground">
            Type
          </Label>
          <Select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            <option value="floor_plan">Floor plan</option>
            <option value="vendor">Vendor doc</option>
            <option value="brochure">Brochure</option>
            <option value="epc">EPC</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-file" className="text-xs text-muted-foreground">
            Upload PDF
          </Label>
          <input
            id="doc-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-xs file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1.5 file:text-xs hover:file:bg-muted disabled:opacity-50"
          />
        </div>
        {uploading ? (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        ) : null}
        {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
