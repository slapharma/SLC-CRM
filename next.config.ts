import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer relies on fontkit/linebreak which use dynamic requires
  // and binary data files — keep it external so it loads from node_modules at
  // runtime instead of being bundled (required for the PDF route on Vercel).
  serverExternalPackages: ["@react-pdf/renderer"],
  // The PDF particulars route reads bundled TTF fonts from disk at runtime.
  // Force-include them in the serverless function trace so they ship to Vercel.
  outputFileTracingIncludes: {
    "/listings/[id]/particulars": ["./src/lib/pdf/fonts/**"],
  },
  // The demand entity is "Requirements" at /requirements. Redirect the old
  // /enquiries URLs (bookmarks, external links) to the new path.
  async redirects() {
    return [
      { source: "/enquiries", destination: "/requirements", permanent: true },
      {
        source: "/enquiries/:path*",
        destination: "/requirements/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
