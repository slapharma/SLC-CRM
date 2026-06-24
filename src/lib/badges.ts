// Typed domain -> badge tone/label maps. Single source so colour<->meaning stays
// consistent everywhere (see design-system/slc-crm/MASTER.md §2). The string unions
// here seed the Postgres enums that arrive in Phase 1.

export type BadgeTone =
  | "slate"
  | "teal"
  | "emerald"
  | "amber"
  | "sky"
  | "violet"
  | "indigo"
  | "orange"
  | "red";

export type BadgeSpec = { tone: BadgeTone; label: string };

export function listingStatusBadge(status: string): BadgeSpec {
  switch (status) {
    case "available":
      return { tone: "emerald", label: "Available" };
    case "under_offer":
      return { tone: "amber", label: "Under Offer" };
    case "let":
      return { tone: "sky", label: "Let" };
    case "sold":
      return { tone: "violet", label: "Sold" };
    case "withdrawn":
      return { tone: "slate", label: "Withdrawn" };
    default:
      return { tone: "slate", label: status };
  }
}

export function dealStageBadge(stage: string): BadgeSpec {
  switch (stage) {
    case "lead":
      return { tone: "slate", label: "Lead" };
    case "viewing":
      return { tone: "sky", label: "Viewing" };
    case "offer":
      return { tone: "amber", label: "Offer" };
    case "heads_of_terms":
      return { tone: "indigo", label: "Heads of Terms" };
    case "legal":
      return { tone: "violet", label: "Legal" };
    case "completed":
      return { tone: "emerald", label: "Completed" };
    case "fell_through":
      return { tone: "red", label: "Fell Through" };
    default:
      return { tone: "slate", label: stage };
  }
}

export function useClassBadge(useClass: string): BadgeSpec {
  switch (useClass) {
    case "E":
      return { tone: "sky", label: "Class E" };
    case "sui_generis_pub_bar":
      return { tone: "violet", label: "Pub / Bar (SG)" };
    case "sui_generis_nightclub":
      return { tone: "indigo", label: "Nightclub (SG)" };
    case "sui_generis_hot_food":
      return { tone: "orange", label: "Hot-food Takeaway (SG)" };
    case "A3":
      return { tone: "slate", label: "A3 (legacy)" };
    case "A4":
      return { tone: "slate", label: "A4 (legacy)" };
    case "A5":
      return { tone: "slate", label: "A5 (legacy)" };
    default:
      return { tone: "slate", label: useClass };
  }
}

export function licenceBadge(licence: string): BadgeSpec {
  switch (licence) {
    case "held":
      return { tone: "emerald", label: "Licence Held" };
    case "late":
      return { tone: "teal", label: "Late Licence" };
    case "none":
      return { tone: "slate", label: "No Licence" };
    default:
      return { tone: "slate", label: licence };
  }
}

export function tenureBadge(tenure: string): BadgeSpec {
  switch (tenure) {
    case "freehold":
      return { tone: "emerald", label: "Freehold" };
    case "leasehold":
      return { tone: "sky", label: "Leasehold" };
    case "assignment":
      return { tone: "amber", label: "Assignment" };
    case "new_letting":
      return { tone: "teal", label: "New Letting" };
    default:
      return { tone: "slate", label: tenure };
  }
}
