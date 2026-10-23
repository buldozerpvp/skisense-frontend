import { MongoClient, type Collection } from "mongodb";
import type { PriceRow } from "@/lib/brands/types";

/** One stored document: a whole day's rows for one source. Written by the backend. */
export interface DaySnapshot {
  _id: string;
  source: string;
  /** DD-MM-YYYY */
  day: string;
  /** YYYY-MM-DD — the sortable form. */
  dayIso: string;
  collectedAt: Date;
  rows: PriceRow[];
}

/**
 * A MongoClient that survives between serverless invocations.
 *
 * Vercel reuses a warm function instance for consecutive requests, so the
 * client is cached on globalThis: creating one per request would open a new
 * connection pool every time and exhaust the cluster's connection limit.
 */
const globalForMongo = globalThis as unknown as { _skisenseMongo?: Promise<MongoClient> };

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const existing = globalForMongo._skisenseMongo;
  if (existing) return existing;
  const created = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 }).connect();
  globalForMongo._skisenseMongo = created;
  return created;
}

export async function snapshots(): Promise<Collection<DaySnapshot>> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB ?? "skisense").collection<DaySnapshot>("snapshots");
}
