/**
 * Build the UK locations reference dataset used by location dropdowns,
 * county derivation and proximity matching.
 *
 * Run manually (NOT part of `npm run build`):
 *   node scripts/build-uk-locations.mjs
 *
 * Input:  scripts/data/postcode-districts.csv — doogal.co.uk "Postcode districts"
 *         download (derived from OS Open Data / ONS / Royal Mail sources).
 * Output: src/lib/locations/data/uk-locations.json        (server-only, with centroids)
 *         src/lib/locations/data/uk-location-options.json (client-safe, names only)
 *
 * Attribution (required by the upstream licences — keep in the generated files):
 *   Contains OS data © Crown copyright and database right.
 *   Contains Royal Mail data © Royal Mail copyright and database right.
 *   Contains ONS data © Crown copyright and database right.
 *   Licensed under the Open Government Licence v3.0. Source CSV via doogal.co.uk.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The 12 standard UK regions (9 English regions + the three other nations). */
const REGIONS = [
  "London",
  "South East",
  "South West",
  "East of England",
  "East Midlands",
  "West Midlands",
  "Yorkshire and The Humber",
  "North East",
  "North West",
  "Scotland",
  "Wales",
  "Northern Ireland",
];

const HOME_COUNTIES = [
  "Berkshire",
  "Buckinghamshire",
  "Essex",
  "Hertfordshire",
  "Kent",
  "Surrey",
  "East Sussex",
  "West Sussex",
];

/**
 * Postcode area → ceremonial county (or nearest equivalent). Used only as a
 * fallback when a record has no county set — approximate by design: a few
 * areas straddle county lines, in which case the dominant county is used.
 * Crown dependencies / NI map to null (no county concept used here).
 */
const AREA_TO_COUNTY = {
  AB: "Aberdeenshire", AL: "Hertfordshire", B: "West Midlands", BA: "Somerset",
  BB: "Lancashire", BD: "West Yorkshire", BH: "Dorset", BL: "Greater Manchester",
  BN: "East Sussex", BR: "Greater London", BS: "Bristol", BT: null,
  CA: "Cumbria", CB: "Cambridgeshire", CF: "South Glamorgan", CH: "Cheshire",
  CM: "Essex", CO: "Essex", CR: "Greater London", CT: "Kent",
  CV: "Warwickshire", CW: "Cheshire", DA: "Kent", DD: "Angus",
  DE: "Derbyshire", DG: "Dumfries and Galloway", DH: "County Durham",
  DL: "County Durham", DN: "South Yorkshire", DT: "Dorset", DY: "West Midlands",
  E: "Greater London", EC: "Greater London", EH: "Midlothian", EN: "Greater London",
  EX: "Devon", FK: "Stirlingshire", FY: "Lancashire", G: "Lanarkshire",
  GL: "Gloucestershire", GU: "Surrey", GY: null, HA: "Greater London",
  HD: "West Yorkshire", HG: "North Yorkshire", HP: "Buckinghamshire",
  HR: "Herefordshire", HS: "Western Isles", HU: "East Riding of Yorkshire",
  HX: "West Yorkshire", IG: "Greater London", IM: null, IP: "Suffolk",
  IV: "Highland", JE: null, KA: "Ayrshire", KT: "Surrey", KW: "Highland",
  KY: "Fife", L: "Merseyside", LA: "Lancashire", LD: "Powys",
  LE: "Leicestershire", LL: "Gwynedd", LN: "Lincolnshire", LS: "West Yorkshire",
  LU: "Bedfordshire", M: "Greater Manchester", ME: "Kent", MK: "Buckinghamshire",
  ML: "Lanarkshire", N: "Greater London", NE: "Tyne and Wear",
  NG: "Nottinghamshire", NN: "Northamptonshire", NP: "Gwent", NR: "Norfolk",
  NW: "Greater London", OL: "Greater Manchester", OX: "Oxfordshire",
  PA: "Renfrewshire", PE: "Cambridgeshire", PH: "Perth and Kinross",
  PL: "Devon", PO: "Hampshire", PR: "Lancashire", RG: "Berkshire",
  RH: "West Sussex", RM: "Greater London", S: "South Yorkshire",
  SA: "West Glamorgan", SE: "Greater London", SG: "Hertfordshire",
  SK: "Greater Manchester", SL: "Berkshire", SM: "Greater London",
  SN: "Wiltshire", SO: "Hampshire", SP: "Wiltshire", SR: "Tyne and Wear",
  SS: "Essex", ST: "Staffordshire", SW: "Greater London", SY: "Shropshire",
  TA: "Somerset", TD: "Scottish Borders", TF: "Shropshire", TN: "Kent",
  TQ: "Devon", TR: "Cornwall", TS: "North Yorkshire", TW: "Greater London",
  UB: "Greater London", W: "Greater London", WA: "Cheshire", WC: "Greater London",
  WD: "Hertfordshire", WF: "West Yorkshire", WN: "Greater Manchester",
  WR: "Worcestershire", WS: "West Midlands", WV: "West Midlands",
  YO: "North Yorkshire", ZE: "Shetland",
};

/** Counties selectable in dropdowns but never produced by the area map. */
const EXTRA_COUNTIES = [
  ["City of London", "London"],
  ["Isle of Wight", "South East"],
  ["Rutland", "East Midlands"],
  ["Northumberland", "North East"],
  ["Mid Glamorgan", "Wales"],
  ["Clwyd", "Wales"],
  ["Dyfed", "Wales"],
  ["Orkney", "Scotland"],
];

// --- tiny CSV parser (handles quoted fields with commas) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const areaOf = (district) => (district.match(/^[A-Z]{1,2}/) ?? [null])[0];
const round4 = (n) => Math.round(n * 1e4) / 1e4;
const mode = (arr) => {
  const counts = new Map();
  for (const v of arr) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

const csv = readFileSync(join(root, "scripts", "data", "postcode-districts.csv"), "utf8");
const [header, ...rows] = parseCsv(csv);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Missing column: ${name}`);
  return i;
};
const iCode = col("Postcode"), iLat = col("Latitude"), iLng = col("Longitude"),
  iActive = col("Active postcodes"), iRegion = col("UK region"), iPostTown = col("Post Town");

const districts = [];
for (const r of rows) {
  const code = r[iCode]?.trim().toUpperCase();
  const lat = Number(r[iLat]), lng = Number(r[iLng]);
  const active = Number(r[iActive] ?? 0);
  if (!code || !Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || active === 0) continue;
  const area = areaOf(code);
  const region = REGIONS.includes(r[iRegion]) ? r[iRegion] : null;
  districts.push({
    code,
    town: r[iPostTown]?.trim() || null,
    county: (area && AREA_TO_COUNTY[area]) || null,
    region,
    lat: round4(lat),
    lng: round4(lng),
  });
}
districts.sort((a, b) => a.code.localeCompare(b.code));

// Towns: aggregate districts by post town.
const byTown = new Map();
for (const d of districts) {
  if (!d.town) continue;
  const t = byTown.get(d.town) ?? { lats: [], lngs: [], counties: [], regions: [] };
  t.lats.push(d.lat); t.lngs.push(d.lng);
  t.counties.push(d.county); t.regions.push(d.region);
  byTown.set(d.town, t);
}
const towns = [...byTown.entries()]
  .map(([name, t]) => ({
    name,
    county: mode(t.counties),
    region: mode(t.regions),
    lat: round4(t.lats.reduce((a, b) => a + b, 0) / t.lats.length),
    lng: round4(t.lngs.reduce((a, b) => a + b, 0) / t.lngs.length),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Counties: aggregate districts by mapped county, then append extras.
const byCounty = new Map();
for (const d of districts) {
  if (!d.county) continue;
  const c = byCounty.get(d.county) ?? { lats: [], lngs: [], regions: [] };
  c.lats.push(d.lat); c.lngs.push(d.lng); c.regions.push(d.region);
  byCounty.set(d.county, c);
}
const counties = [...byCounty.entries()].map(([name, c]) => ({
  name,
  region: mode(c.regions),
  homeCounty: HOME_COUNTIES.includes(name),
  lat: round4(c.lats.reduce((a, b) => a + b, 0) / c.lats.length),
  lng: round4(c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length),
}));
for (const [name, region] of EXTRA_COUNTIES) {
  if (!counties.some((c) => c.name === name)) {
    counties.push({ name, region, homeCounty: HOME_COUNTIES.includes(name), lat: null, lng: null });
  }
}
counties.sort((a, b) => a.name.localeCompare(b.name));

const attribution =
  "Contains OS data © Crown copyright and database right. Contains Royal Mail data © Royal Mail copyright and database right. Contains ONS data © Crown copyright and database right. Licensed under the Open Government Licence v3.0. Source CSV via doogal.co.uk.";

const outDir = join(root, "src", "lib", "locations", "data");
mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, "uk-locations.json"),
  JSON.stringify({ attribution, regions: REGIONS, homeCounties: HOME_COUNTIES, counties, towns, districts }),
);

writeFileSync(
  join(outDir, "uk-location-options.json"),
  JSON.stringify({
    attribution,
    regions: ["Home Counties", ...REGIONS],
    counties: counties.map((c) => c.name),
    towns: towns.map((t) => t.name),
    districts: districts.map((d) => [d.code, d.town ?? ""]),
  }),
);

console.log(
  `Wrote ${districts.length} districts, ${towns.length} towns, ${counties.length} counties → src/lib/locations/data/`,
);
