import { historyPerSource } from "@/lib/db/queries";
import { serveOrProxy } from "../route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/prices/all — every stored day of offers, per source. */
export async function GET() {
  return serveOrProxy(historyPerSource, "/prices/fetch-all-offers");
}
