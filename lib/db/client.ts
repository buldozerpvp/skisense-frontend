import pg, { type Pool, type QueryResultRow } from "pg";

/**
 * A connection pool that survives between serverless invocations.
 *
 * Vercel reuses a warm function instance for consecutive requests, so the pool
 * is cached on globalThis: building one per request would open a new
 * connection every time and exhaust the database's connection limit.
 *
 * Use the POOLED connection string (Neon's `DATABASE_URL`, the one with
 * `-pooler` in the host). The unpooled one is for migrations and admin tools.
 */
const globalForDb = globalThis as unknown as { _skisensePool?: Pool };

/**
 * The pooled connection string, under either name a Neon/Vercel integration
 * may install it as. Empty when neither is set, which is the signal the price
 * routes use to fall back to the local backend.
 */
export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
}

/** Whether there is a database to read at all. */
export function isDbConfigured(): boolean {
  return databaseUrl().length > 0;
}

// Built on first use rather than at import time: a cold instance that only
// serves a proxied request should never open a connection it won't use.
function getPool(): Pool {
  const existing = globalForDb._skisensePool;
  if (existing) return existing;

  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  // TLS comes from the connection string's sslmode, which Neon's copied
  // string already carries. Serverless wants a small pool, not a big one:
  // every warm instance holds its own.
  const created = new pg.Pool({ connectionString: url, max: 2 });
  globalForDb._skisensePool = created;
  return created;
}

/** Runs one SQL statement and returns its rows. */
export async function query<T extends QueryResultRow>(sql: string): Promise<T[]> {
  const result = await getPool().query<T>(sql);
  return result.rows;
}
