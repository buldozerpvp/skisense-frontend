import pg, { type Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { _skisensePool?: Pool };

export const databaseUrl = (): string => {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
};

export const isDbConfigured = (): boolean => {
  return databaseUrl().length > 0;
};

const getPool = (): Pool => {
  const existing = globalForDb._skisensePool;
  if (existing) return existing;

  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const created = new pg.Pool({ connectionString: url, max: 2 });
  globalForDb._skisensePool = created;
  return created;
};

export const query = async <T extends QueryResultRow>(sql: string): Promise<T[]> => {
  const result = await getPool().query<T>(sql);
  return result.rows;
};
