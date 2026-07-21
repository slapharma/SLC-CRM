// Dependency-free CSV helpers for the admin bulk importer (#8). Multi-value
// cells (tags, towns) use ";" inside the cell so they don't clash with the
// "," column delimiter.

export type ImportEntity = "companies" | "contacts" | "requirements" | "listings";

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
  requirements: {
    label: "Requirements",
    // contact_email is REQUIRED — must match an existing contact (every requirement
    // must have a contact). Import contacts first, then reference them by email.
    headers: [
      "title",
      "contact_email",
      "status",
      "target_towns",
      "target_regions",
      "target_counties",
      "target_postcode_districts",
      "max_rent",
      "notes",
    ],
    example: [
      "Wet-led bar, Central London",
      "james@example.co.uk",
      "active",
      "London;Manchester",
      "Greater London",
      "Surrey;Kent",
      "W1;W2",
      "110000",
      "Needs late licence",
    ],
  },
  listings: {
    label: "Listings",
    // contact_email is REQUIRED — must match an existing contact (every listing
    // must have a contact). Company is optional and not set via CSV.
    headers: [
      "title",
      "contact_email",
      "status",
      "disposal_type",
      "city",
      "county",
      "postcode",
      "use_class",
      "size_sqft",
      "rent_pa",
      "premium",
      "description",
    ],
    example: [
      "Corner bar, Soho",
      "james@example.co.uk",
      "Available",
      "new_lease",
      "London",
      "Greater London",
      "W1D 4SB",
      "Sui Generis",
      "1850",
      "95000",
      "120000",
      "Prime corner unit",
    ],
  },
};
