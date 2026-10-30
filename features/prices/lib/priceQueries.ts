import { query } from "@/features/prices/lib/databaseClient";
import type { PriceRow, SourceOffers, SourceOfferHistory } from "@/features/prices/lib/priceTypes";

interface OfferRecord {
  source: string;
  day: string;
  resortId: string;
  resort: string;
  resortKey: string | null;
  hotel: string | null;
  hotelKey: string | null;
  propertyType: string | null;
  board: string | null;
  country: string;
  date: string;
  nights: number;
  priceEur: number;
  pax: number;
  status: string;
  url: string | null;
  departsFrom: string | null;
  transfers: boolean | null;
  flights: boolean | null;
  airline: string | null;
  baggageKg: number | null;
  cabinKg: number | null;
  liftPassDays: number | null;
  liftPass: boolean | null;
}

const SELECT_COLUMNS = `
  o.source,
  to_char(o.collected_on, 'DD-MM-YYYY') as day,
  o.resort_id        as "resortId",
  o.resort,
  o.resort_key       as "resortKey",
  o.hotel,
  o.hotel_key        as "hotelKey",
  o.property_type    as "propertyType",
  o.board,
  o.country,
  to_char(o.departure, 'YYYY-MM-DD') as date,
  o.nights,
  o.price_eur::float8 as "priceEur",
  o.pax,
  o.status,
  o.url,
  o.departs_from       as "departsFrom",
  o.transfers,
  o.flights,
  o.airline,
  o.baggage_kg::float8 as "baggageKg",
  o.cabin_kg::float8   as "cabinKg",
  o.lift_pass_days     as "liftPassDays",
  o.lift_pass          as "liftPass"`;

const toPriceRow = (r: OfferRecord): PriceRow => {
  return {
    resortId: r.resortId,
    resort: r.resort,
    resortKey: r.resortKey ?? undefined,
    hotel: r.hotel ?? undefined,
    hotelKey: r.hotelKey ?? undefined,
    propertyType: (r.propertyType as PriceRow["propertyType"]) ?? undefined,
    board: r.board ?? undefined,
    country: r.country,
    date: r.date,
    nights: r.nights === 0 ? undefined : r.nights,
    priceEur: r.priceEur,
    pax: r.pax,
    status: r.status as PriceRow["status"],
    url: r.url ?? undefined,
    departsFrom: r.departsFrom ?? undefined,
    transfers: r.transfers ?? undefined,
    flights: r.flights ?? undefined,
    airline: r.airline ?? undefined,
    baggageKg: r.baggageKg ?? undefined,
    cabinKg: r.cabinKg ?? undefined,
    liftPassDays: r.liftPassDays ?? undefined,
    liftPass: r.liftPass ?? undefined,
  };
};

export const latestPerSource = async (): Promise<SourceOffers[]> => {
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
};

export const historyPerSource = async (): Promise<SourceOfferHistory[]> => {
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
    let day = entry.days[entry.days.length - 1];
    if (!day || day.day !== row.day) {
      day = { day: row.day, data: [] };
      entry.days.push(day);
    }
    day.data.push(toPriceRow(row));
  }
  return [...bySource.values()];
};
