import { query } from "./client";
import type { PriceRow, SourceOffers, SourceOfferHistory } from "@/lib/brands/types";

/**
 * One row as the database returns it.
 *
 * Dates come back through `to_char` rather than as Date objects: the app
 * works in plain YYYY-MM-DD strings throughout, and letting the driver build
 * Date objects would re-introduce the timezone slips that turn a Saturday
 * departure into Friday night for anyone west of Greenwich.
 */
interface OfferRecord {
  source: string;
  day: string;
  resortId: string;
  resort: string;
  resortKey: string | null;
  hotel: string | null;
  board: string | null;
  country: string;
  date: string;
  nights: number;
  priceEur: number;
  pax: number;
  status: string;
  url: string | null;
}

const SELECT_COLUMNS = `
  o.source,
  to_char(o.collected_on, 'DD-MM-YYYY') as day,
  o.resort_id        as "resortId",
  o.resort,
  o.resort_key       as "resortKey",
  o.hotel,
  o.board,
  o.country,
  to_char(o.departure, 'YYYY-MM-DD') as date,
  o.nights,
  o.price_eur::float8 as "priceEur",
  o.pax,
  o.status,
  o.url`;

/** Database record -> the PriceRow shape the frontend already speaks. */
function toPriceRow(r: OfferRecord): PriceRow {
  return {
    resortId: r.resortId,
    resort: r.resort,
    // Nulls and the 0-nights placeholder become `undefined`, which is what the
    // existing fallbacks (brand.defaultNights, "—") already check for.
    resortKey: r.resortKey ?? undefined,
    hotel: r.hotel ?? undefined,
    board: r.board ?? undefined,
    country: r.country,
    date: r.date,
    nights: r.nights === 0 ? undefined : r.nights,
    priceEur: r.priceEur,
    pax: r.pax,
    status: r.status as PriceRow["status"],
    url: r.url ?? undefined,
  };
}

/** The newest stored day for every source. */
export async function latestPerSource(): Promise<SourceOffers[]> {
  const rows = await query<OfferRecord>(`
    with newest as (
      select source, max(collected_on) as collected_on from offers group by source
    )
    select ${SELECT_COLUMNS}
    from offers o
    join newest n on n.source = o.source and n.collected_on = o.collected_on
    order by o.source, o.departure
  `);

  const bySource = new Map<string, SourceOffers>();
  for (const row of rows) {
    let entry = bySource.get(row.source);
    if (!entry) {
      entry = { source: row.source, day: row.day, data: [] };
      bySource.set(row.source, entry);
    }
    entry.data.push(toPriceRow(row));
  }
  return [...bySource.values()];
}

/** Every stored day for every source, oldest first — what the trend charts fold. */
export async function historyPerSource(): Promise<SourceOfferHistory[]> {
  const rows = await query<OfferRecord>(`
    select ${SELECT_COLUMNS}
    from offers o
    order by o.source, o.collected_on, o.departure
  `);

  const bySource = new Map<string, SourceOfferHistory>();
  for (const row of rows) {
    let entry = bySource.get(row.source);
    if (!entry) {
      entry = { source: row.source, days: [] };
      bySource.set(row.source, entry);
    }
    // Rows arrive grouped by day thanks to the ORDER BY, so a new day is
    // always a new bucket rather than a lookup.
    let day = entry.days[entry.days.length - 1];
    if (!day || day.day !== row.day) {
      day = { day: row.day, data: [] };
      entry.days.push(day);
    }
    day.data.push(toPriceRow(row));
  }
  return [...bySource.values()];
}
