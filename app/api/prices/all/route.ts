import { historyPerSource } from "@/lib/db/queries";
import { serveOrProxy } from "../route-helpers";

// Both for the same reasons as ../latest/route.ts: the Postgres driver is a
// Node library, and a cached response would hide the overnight scrape.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/prices/all — every stored day of offers, per source. */
export async function GET() {
  return serveOrProxy(historyPerSource, "/prices/fetch-all-offers");
}
