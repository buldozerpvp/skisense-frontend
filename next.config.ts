import type { NextConfig } from "next";

// Cache Components (Next 16's new default) adds a lot of ceremony
// (Suspense boundaries, "use cache" directives, non-empty
// generateStaticParams) that isn't worth it for this minimal,
// entirely client-driven dashboard — everything here is fetched on the
// client via TanStack Query anyway. Keeping standard rendering instead.
const nextConfig: NextConfig = {
  // React Compiler memoises components and hooks at build time, which is what
  // this app wants: the offers table re-renders on every keystroke in a filter
  // and every chart recomputes its scales from the same rows.
  reactCompiler: true,
  // Keep the Postgres driver out of the bundle: it's a Node library that the
  // route handlers load at runtime, only when DATABASE_URL is set. Bundling
  // it would make it a hard build-time dependency again.
  serverExternalPackages: ["pg"],

  /**
   * Security headers.
   *
   * The site is public and read-only — there is no login, no cookie and no
   * form that writes anything — so the risk here isn't data theft but the
   * page being framed, sniffed or used to leak where a visitor came from.
   *
   * The CSP allows inline styles because emotion (MUI) injects them at
   * runtime, and inline scripts because Next's hydration bootstrap is inline;
   * tightening either needs a nonce, which means giving up static rendering.
   * Everything else is locked to this origin, with Google Fonts the single
   * exception, since the font stylesheet is loaded in the layout.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Resort photos come from Wikimedia Commons and map tiles from
              // OpenStreetMap; both are images only, no script.
              // Wikimedia serves a Commons photo from whichever host it
              // feels like: `Special:FilePath` used to redirect to
              // upload.wikimedia.org and now lands on thumb.wikimedia.org.
              // Only the first was allowed, so every resort photo was blocked
              // by our own header and the card showed a grey panel. Any
              // wikimedia.org host is allowed now rather than a list that
              // silently rots the next time they move the files.
              "img-src 'self' data: blob: https://*.wikimedia.org https://*.tile.openstreetmap.org",
              // The operators' own sites, opened from the Open column.
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
