import { NextResponse } from "next/server";
import { isDbConfigured } from "@/features/prices/lib/databaseClient";

const LOCAL_BACKEND = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3000";

const PRICE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
} as const;

export const serveOrProxy = async <T>(fromDatabase: () => Promise<T>, backendPath: string): Promise<NextResponse> => {
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
};
