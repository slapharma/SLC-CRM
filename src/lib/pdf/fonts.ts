import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Register the brand typeface for PDF particulars.
 *
 * The CDG template uses Proxima Nova (a commercial font we can't redistribute).
 * Mulish is a close, freely-licensed geometric humanist substitute — bundled as
 * static TTFs under ./fonts and force-included in the serverless trace via
 * `outputFileTracingIncludes` in next.config.ts.
 *
 * To use the real Proxima Nova later, drop its TTFs in ./fonts and swap the
 * filenames below — no other change required.
 */
export const BRAND_FONT = "Mulish";

let registered = false;

export function registerBrandFonts(): void {
  if (registered) return;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  // Inline as base64 data URLs: works identically in dev and on serverless,
  // and sidesteps @react-pdf's filesystem path resolution entirely.
  const dataUrl = (name: string) =>
    `data:font/ttf;base64,${fs.readFileSync(path.join(dir, name)).toString("base64")}`;

  Font.register({
    family: BRAND_FONT,
    fonts: [
      { src: dataUrl("Mulish-Regular.ttf"), fontWeight: 400 },
      { src: dataUrl("Mulish-SemiBold.ttf"), fontWeight: 600 },
      { src: dataUrl("Mulish-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // Mulish has no italics bundled; avoid react-pdf throwing on emphasis runs.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
