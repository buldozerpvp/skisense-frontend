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
              "img-src 'self' data: blob:",
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
