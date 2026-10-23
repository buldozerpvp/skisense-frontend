import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";

/**
 * Where to get prices when no database is configured.
 *
 * Locally there's a NestJS backend on :3000 holding the same data as JSON
 * files, so a dev machine with no connection string keeps working: the route
 * proxies to it instead of erroring. On Vercel there is no such fallback —
 * a missing MONGODB_URI there is a misconfiguration and should say so.
 */
const LOCAL_BACKEND = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3000";

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
    return NextResponse.json(await fromDatabase());
  } catch (e) {
    return NextResponse.json({ error: "Database query failed", detail: String(e) }, { status: 502 });
  }
}
