import { latestPerSource } from "@/features/prices/lib/priceQueries";
import { serveOrProxy } from "@/features/prices/lib/apiResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async () => {
  return serveOrProxy(latestPerSource, "/prices/fetch-latest-offers");
};
