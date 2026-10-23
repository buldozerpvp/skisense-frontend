import { snapshots } from "./client";
import type { SourceOffers, SourceOfferHistory } from "@/lib/brands/types";

/**
 * The newest stored day for every source.
 *
 * `$sort` then `$group` with `$first` is the standard "latest per key" shape:
 * it rides the { source, dayIso } index rather than scanning.
 */
export async function latestPerSource(): Promise<SourceOffers[]> {
  const collection = await snapshots();
  const docs = await collection
    .aggregate<{ _id: string; day: string; rows: SourceOffers["data"] }>([
      { $sort: { source: 1, dayIso: -1 } },
      { $group: { _id: "$source", day: { $first: "$day" }, rows: { $first: "$rows" } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return docs.map((d) => ({ source: d._id, day: d.day, data: d.rows }));
}

/** Every stored day for every source, oldest first — what the trend charts fold. */
export async function historyPerSource(): Promise<SourceOfferHistory[]> {
  const collection = await snapshots();
  const docs = await collection
    .aggregate<{ _id: string; days: { day: string; data: SourceOffers["data"] }[] }>([
      { $sort: { source: 1, dayIso: 1 } },
      { $group: { _id: "$source", days: { $push: { day: "$day", data: "$rows" } } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return docs.map((d) => ({ source: d._id, days: d.days }));
}
