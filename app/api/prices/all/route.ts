import { historyPerSource } from "@/features/prices/lib/priceQueries";
import { serveOrProxy } from "@/features/prices/lib/apiResponses";
import { packHistory } from "@/features/prices/lib/historyCodec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async () => {
  return serveOrProxy(historyPerSource, "/prices/fetch-all-offers", packHistory);
};
