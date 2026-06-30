// Dependency-free CSV helpers for the admin bulk importer (#8). Multi-value
// cells (tags, towns) use ";" inside the cell so they don't clash with the
// "," column delimiter.

export type ImportEntity = "companies" | "contacts" | "enquiries" | "listings";

/** Parse CSV text into rows of string cells (handles quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Serialise headers + rows to CSV text (used for downloadable templates). */
export function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

/** Column headers + one example row per importable entity. */
export const IMPORT_TEMPLATES: Record<
  ImportEntity,
  { label: string; headers: string[]; example: string[] }
> = {
  companies: {
    label: "Companies",
    headers: ["name", "type", "sector_tags", "website", "phone", "notes"],
    example: [
      "Riverside Taverns Ltd",
      "operator",
      "pub;bar",
      "https://example.co.uk",
      "+44 20 7123 4567",
      "Key operator",
    ],
  },
  contacts: {
    label: "Contacts",
    headers: [
      "first_name",
      "last_name",
      "email",
      "phone",
      "role",
      "marketing_opt_in",
      "notes",
    ],
    example: [
      "James",
      "Hartley",
      "james@example.co.uk",
      "+44 7700 900000",
      "acquisitions",
      "true",
      "Met at expo",
    ],
  },
  enquiries: {
    label: "Enquiries",
    headers: ["title", "status", "target_towns", "target_regions", "max_rent", "notes"],
    example: [
      "Wet-led bar, Central London",
      "active",
      "London;Manchester",
      "Greater London",
      "110000",
      "Needs late licence",
    ],
  },
  listings: {
    label: "Listings",
    headers: [
      "title",
      "status",
      "disposal_type",
      "city",
      "postcode",
      "use_class",
      "size_sqft",
      "rent_pa",
      "premium",
      "description",
    ],
    example: [
      "Corner bar, Soho",
      "Available",
      "new_lease",
      "London",
      "W1D 4SB",
      "Sui Generis",
      "1850",
      "95000",
      "120000",
      "Prime corner unit",
    ],
  },
};
