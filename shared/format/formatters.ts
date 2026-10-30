const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const eur = (value: number): string => {
  return EUR.format(value);
};

export const eurDelta = (value: number): string => {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${EUR.format(Math.abs(value))}`;
};

export const pct = (value: number, digits = 1): string => {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
};

export const trendGlyph = (value: number): string => {
  if (value < 0) return "▼";
  if (value > 0) return "▲";
  return "–";
};

export const bidi = (text: string): string => {
  return `⁨${text}⁩`;
};

export const offerLabel = (resort: string, departure: string): string => {
  return `${bidi(resort)} · ${shortDate(departure)}`;
};

export const truncateLabel = (text: string, max: number): string => {
  const bare = text.replace(/[⁨⁩]/g, "");
  if (bare.length <= max) return text;
  return bidi(`${bare.slice(0, max - 1)}…`);
};

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });

const parseIso = (day: string): Date => {
  return new Date(`${day}T00:00:00Z`);
};

export const shortDate = (day: string): string => {
  return DAY_MONTH.format(parseIso(day));
};

export const monthLabel = (day: string): string => {
  return MONTH_YEAR.format(parseIso(day));
};

export const monthKey = (day: string): string => {
  return day.slice(0, 7);
};

export const dateValue = (day: string): number => {
  return parseIso(day).getTime();
};
