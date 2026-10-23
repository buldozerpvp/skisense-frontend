import type { NextConfig } from "next";

// Cache Components (Next 16's new default) adds a lot of ceremony
// (Suspense boundaries, "use cache" directives, non-empty
// generateStaticParams) that isn't worth it for this minimal,
// entirely client-driven dashboard — everything here is fetched on the
// client via TanStack Query anyway. Keeping standard rendering instead.
const nextConfig: NextConfig = {
  // Keep the Postgres driver out of the bundle: it's a Node library that the
  // route handlers load at runtime, only when DATABASE_URL is set. Bundling
  // it would make it a hard build-time dependency again.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
