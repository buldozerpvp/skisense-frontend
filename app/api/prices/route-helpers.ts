import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";

/**
 * Where to get prices when no database is configured.
 *
 * Locally there's a NestJS backend on :3000 holding the same data as JSON
 * files, so a dev machine with no connection string keeps working: the route
 * proxies to it instead of erroring. On Vercel there is no such fallback —
 * a missing DATABASE_URL there is a misconfiguration and should say so.
 */
const LOCAL_BACKEND = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3000";

/**
 * Let the CDN answer repeat visits instead of the database.
 *
 * Prices change once a night, so five minutes of shared cache costs nothing in
 * freshness and keeps a burst of visitors from each pulling the full history
 * out of Postgres — which is the number that eats a free tier's egress
 * allowance. `stale-while-revalidate` means the first visitor after the window
 * still gets an instant answer while the refresh happens behind them.
 */
const PRICE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
} as const;

/**
 * Answers a price request from the database, or from the local backend when no
 * database is configured.
 *
 * Both failure paths return JSON instead of throwing: an uncaught error in a
 * route handler becomes an opaque 500, and the client's error state can only
 * show something useful if the detail survives. 503 means there was nothing to
 * ask, 502 means the database answered badly.
 */
export async function serveOrProxy<T>(
  fromDatabase: () => Promise<T>,
  backendPath: string
): Promise<NextResponse> {
  if (!isDbConfigured()) {
    try {
      const res = await fetch(`${LOCAL_BACKEND}${backendPath}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`backend responded ${res.status}`);
      return NextResponse.json(await res.json());
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "No price source available: DATABASE_URL isn't set and the local backend isn't reachable.",
          detail: String(e),
        },
        { status: 503 }
      );
    }
  }

  try {
    return NextResponse.json(await fromDatabase(), { headers: PRICE_CACHE_HEADERS });
  } catch (e) {
    return NextResponse.json({ error: "Database query failed", detail: String(e) }, { status: 502 });
  }
}
