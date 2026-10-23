const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function eur(value: number): string {
  return EUR.format(value);
}

/** Signed euro delta, e.g. "−€240" / "+€85". */
export function eurDelta(value: number): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${EUR.format(Math.abs(value))}`;
}

export function pct(value: number, digits = 1): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** ▼ for a drop, ▲ for a rise — so the colour is never the only signal. */
export function trendGlyph(value: number): string {
  if (value < 0) return "▼";
  if (value > 0) return "▲";
  return "–";
}

/**
 * Several Club Med resort and country names come back in Hebrew. Dropping an
 * RTL run into an LTR label ("Charlevoix · 14 Feb") reorders the surrounding
 * text unless the run is isolated, so wrap it in FSI…PDI.
 */
export function bidi(text: string): string {
  return `⁨${text}⁩`;
}

/** Resort + departure date, safe to render next to left-to-right chrome. */
export function offerLabel(resort: string, departure: string): string {
  return `${bidi(resort)} · ${shortDate(departure)}`;
}

/** Trims to a maximum length without cutting inside a bidi isolate. */
export function truncateLabel(text: string, max: number): string {
  const bare = text.replace(/[⁨⁩]/g, "");
  if (bare.length <= max) return text;
  return `${bare.slice(0, max - 1)}…`;
}

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });

function parseIso(day: string): Date {
  // Parsed as UTC so the rendered label never shifts by a timezone.
  return new Date(`${day}T00:00:00Z`);
}

/** "2026-12-20" -> "20 Dec" */
export function shortDate(day: string): string {
  return DAY_MONTH.format(parseIso(day));
}

/** "2026-12-20" -> "Dec 26" */
export function monthLabel(day: string): string {
  return MONTH_YEAR.format(parseIso(day));
}

/** "2026-12-20" -> "2026-12" (heatmap / grouping bucket) */
export function monthKey(day: string): string {
  return day.slice(0, 7);
}

export function dateValue(day: string): number {
  return parseIso(day).getTime();
}
