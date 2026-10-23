import { latestPerSource } from "@/lib/db/queries";
import { serveOrProxy } from "../route-helpers";

// The Postgres driver is a Node library, not an edge one.
export const runtime = "nodejs";
// Prices change once a night, but a deployed page should never serve a day-old
// cache after a refresh — let the client's staleTime do the throttling.
export const dynamic = "force-dynamic";

/** GET /api/prices/latest — the newest day of offers for each source. */
export async function GET() {
  return serveOrProxy(latestPerSource, "/prices/fetch-latest-offers");
}
