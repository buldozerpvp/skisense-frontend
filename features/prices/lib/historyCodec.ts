import type { PriceRow, SourceOfferHistory } from "@/features/prices/lib/priceTypes";

export const PACKED_HISTORY_FORMAT = "ss-history-v1";

type Kind = "s" | "n" | "b" | "j";
type Cell = number | string | boolean | null;

export interface PackedHistory {
  format: typeof PACKED_HISTORY_FORMAT;
  strings: string[];
  fields: string[];
  kinds: Kind[];
  metas: Cell[][];
  sources: { source: string; days: { day: string; rows: number[] }[] }[];
}

const VARYING: (keyof PriceRow)[] = ["priceEur", "status"];

const kindOf = (seen: Set<string>): Kind => {
  if (seen.size === 1) {
    const only = [...seen][0];
    if (only === "string") return "s";
    if (only === "number") return "n";
    if (only === "boolean") return "b";
  }
  return "j";
};

export const packHistory = (history: SourceOfferHistory[]): PackedHistory => {
  const types = new Map<string, Set<string>>();
  for (const source of history) {
    for (const snapshot of source.days) {
      for (const row of snapshot.data) {
        for (const [field, value] of Object.entries(row)) {
          if (value === undefined || value === null || VARYING.includes(field as keyof PriceRow)) continue;
          const seen = types.get(field) ?? new Set<string>();
          seen.add(typeof value);
          types.set(field, seen);
        }
      }
    }
  }
  const fields = [...types.keys()];
  const kinds = fields.map((field) => kindOf(types.get(field) ?? new Set()));

  const strings: string[] = [];
  const stringIndex = new Map<string, number>();
  const intern = (value: string): number => {
    let index = stringIndex.get(value);
    if (index === undefined) {
      index = strings.length;
      strings.push(value);
      stringIndex.set(value, index);
    }
    return index;
  };

  const metas: Cell[][] = [];
  const metaIndex = new Map<string, number>();
  const metaOf = (row: PriceRow): number => {
    const record = row as unknown as Record<string, unknown>;
    const cells: Cell[] = fields.map((field, i) => {
      const value = record[field];
      if (value === undefined || value === null) return null;
      switch (kinds[i]) {
        case "s":
          return intern(value as string);
        case "b":
          return value ? 1 : 0;
        case "n":
          return value as number;
        default:
          return JSON.stringify(value);
      }
    });
    const key = JSON.stringify(cells);
    let index = metaIndex.get(key);
    if (index === undefined) {
      index = metas.length;
      metas.push(cells);
      metaIndex.set(key, index);
    }
    return index;
  };

  return {
    format: PACKED_HISTORY_FORMAT,
    strings,
    fields,
    kinds,
    metas,
    sources: history.map((source) => ({
      source: source.source,
      days: source.days.map((snapshot) => ({
        day: snapshot.day,
        rows: snapshot.data.flatMap((row) => [metaOf(row), row.priceEur, intern(row.status)]),
      })),
    })),
  };
};

export const isPackedHistory = (value: unknown): value is PackedHistory => {
  return typeof value === "object" && value !== null && (value as PackedHistory).format === PACKED_HISTORY_FORMAT;
};

export const unpackHistory = (packed: PackedHistory): SourceOfferHistory[] => {
  const { strings, fields, kinds } = packed;
  const bases = packed.metas.map((cells) => {
    const base: Record<string, unknown> = {};
    for (let i = 0; i < fields.length; i += 1) {
      const cell = cells[i];
      if (cell === null) continue;
      switch (kinds[i]) {
        case "s":
          base[fields[i]] = strings[cell as number];
          break;
        case "b":
          base[fields[i]] = cell === 1;
          break;
        case "n":
          base[fields[i]] = cell;
          break;
        default:
          base[fields[i]] = JSON.parse(cell as string);
      }
    }
    return base;
  });

  return packed.sources.map((source) => ({
    source: source.source,
    days: source.days.map((snapshot) => {
      const data: PriceRow[] = [];
      const rows = snapshot.rows;
      for (let i = 0; i < rows.length; i += 3) {
        data.push({ ...bases[rows[i]], priceEur: rows[i + 1], status: strings[rows[i + 2]] } as unknown as PriceRow);
      }
      return { day: snapshot.day, data };
    }),
  }));
};
