import { median, quantile } from "d3-array";
import { BRANDS, getBrand } from "@/lib/brands/config";
import type { SourcedRow } from "@/lib/analytics/derive";
import { bidi, eur, monthKey, monthLabel } from "@/lib/analytics/format";

/**
 * Data shaping for the parallel-sets chart: categorical flow across ordered
 * axes, one ribbon per distinct combination of category values.
 *
 * Everything here is pure — the component only turns the result into SVG — so
 * the awkward parts (quantile banding, node ordering, ribbon stacking) can be
 * exercised without a DOM.
 */

/** Separator for composite keys. U+241F is never going to show up in a resort name. */
const KEY_SEP = "␟";

/* ------------------------------------------------------------------ *
 * Operator colour
 * ------------------------------------------------------------------ */

/**
 * Operator identity colour, brand colour by default.
 *
 * Three brands ship blues that are not separable as a categorical scale, so
 * they are overridden here rather than in lib/brands/config.ts — the brand
 * colour is still correct for a logo chip, it just can't carry identity in a
 * chart. Measured as CIELAB ΔE, including Viénot CVD simulation:
 *
 *   pingwin #1C86C4 vs skideal #139CD8 — normal ΔE 9.4  (floor 15)
 *   clubmed #0A3D62 vs belambra #9C1368 — deutan ΔE 3.8 (floor 8)
 *
 * With the overrides below the worst pair of all six is ΔE 12.4 under
 * deuteranopia and 41.5 under normal vision, so every operator stays
 * distinguishable. Colour is still never the only channel: each band is
 * labelled and the table view lists every ribbon.
 */
export const OPERATOR_COLOR_OVERRIDES: Record<string, string> = {
  /** Brand #1C86C4 — lifted away from Skideal's near-identical blue. */
  pingwin: "#4FA3DC",
  /** Brand #139CD8 — moved off blue entirely; violet is the free hue here. */
  skideal: "#7A4BC4",
  /** Brand #9C1368 — lightened, or it collapses onto Club Med's navy for deutans. */
  belambra: "#D4578F",
};

/** Fallback for a source with no brand entry at all. */
const UNKNOWN_OPERATOR_COLOR = "#8DA2B2";

export function operatorColor(slug: string): string {
  return OPERATOR_COLOR_OVERRIDES[slug] ?? getBrand(slug)?.color ?? UNKNOWN_OPERATOR_COLOR;
}

export function operatorName(slug: string): string {
  return getBrand(slug)?.name ?? slug;
}

/* ------------------------------------------------------------------ *
 * Price per person per night
 * ------------------------------------------------------------------ */

/**
 * Stay length for a row, falling back to the operator's fixed duration where it
 * has one (Club Med always sells 7 nights). Same rule as SeasonCurve: rows
 * where neither resolves are dropped rather than guessed.
 */
export function nightsFor(row: SourcedRow): number | undefined {
  return row.nights ?? getBrand(row.source)?.defaultNights;
}

export interface PricedRow {
  row: SourcedRow;
  nights: number;
  /** Price per person per night — the only basis on which a 3-night break and a
   *  full week can share a price band. */
  perNight: number;
}

export interface PricedRows {
  priced: PricedRow[];
  /** Rows with no resolvable stay length. Surfaced, never silently swallowed. */
  dropped: number;
}

export function pricedRows(rows: SourcedRow[]): PricedRows {
  const priced: PricedRow[] = [];
  let dropped = 0;

  for (const row of rows) {
    const nights = nightsFor(row);
    if (!nights || nights <= 0) {
      dropped += 1;
      continue;
    }
    priced.push({ row, nights, perNight: row.priceEur / nights });
  }

  return { priced, dropped };
}

/* ------------------------------------------------------------------ *
 * Price bands
 * ------------------------------------------------------------------ */

export interface PriceBand {
  id: string;
  /** Short enough to sit beside a node bar, e.g. "Budget ≤€95/n". */
  label: string;
  /** Plain name without the range, for tooltips and tables. */
  name: string;
  /** Inclusive lower bound, €/person/night. */
  min: number;
  /** Exclusive upper bound; null on the top band. */
  max: number | null;
}

/** Names for 2, 3 and 4 bands. More than four and we fall back to "Q1…Qn". */
const BAND_NAMES: Record<number, string[]> = {
  2: ["Cheaper half", "Pricier half"],
  3: ["Budget", "Mid", "Premium"],
  4: ["Budget", "Mid", "Upper", "Premium"],
};

function bandNames(count: number): string[] {
  return BAND_NAMES[count] ?? Array.from({ length: count }, (_, i) => `Q${i + 1}`);
}

/**
 * Equal-count price bands from the quantiles of price per person per night.
 *
 * Quantiles rather than equal-width buckets: ski prices are long-tailed, and
 * equal widths would put nearly every offer in one bucket and leave the top
 * bands empty, which tells the reader nothing about who is cheap.
 */
export function quantileBands(values: number[], count = 4): PriceBand[] {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const names = bandNames(count);
  if (sorted.length === 0) {
    return [{ id: "band-0", label: names[0] ?? "All", name: names[0] ?? "All", min: 0, max: null }];
  }

  // Interior cut points only; the outer edges are the data's own min and max.
  const cuts: number[] = [];
  for (let i = 1; i < count; i += 1) {
    const cut = quantile(sorted, i / count);
    if (cut !== undefined) cuts.push(cut);
  }

  // Ties collapse bands — with 700 offers at the same price per night there may
  // genuinely be fewer than `count` distinct bands, and inventing empty ones
  // would draw gaps the data doesn't have.
  const edges = [...new Set(cuts)].sort((a, b) => a - b);

  const bands: PriceBand[] = [];
  let lower = sorted[0];
  edges.forEach((edge, i) => {
    bands.push(makeBand(i, edges.length + 1, lower, edge));
    lower = edge;
  });
  bands.push(makeBand(edges.length, edges.length + 1, lower, null));
  return bands;
}

function makeBand(index: number, total: number, min: number, max: number | null): PriceBand {
  const name = bandNames(total)[index] ?? `Q${index + 1}`;
  const range = max === null ? `>${eur(min)}/n` : index === 0 ? `≤${eur(max)}/n` : `${eur(min)}–${eur(max)}/n`;
  return { id: `band-${index}`, label: `${name} ${range}`, name, min, max };
}

/** The band a price falls in. Bands are contiguous, so the first fit wins. */
export function bandFor(perNight: number, bands: PriceBand[]): PriceBand {
  for (const band of bands) {
    if (band.max === null || perNight < band.max) return band;
  }
  return bands[bands.length - 1];
}

/* ------------------------------------------------------------------ *
 * Dimensions
 * ------------------------------------------------------------------ */

export type PsDimensionId = "operator" | "country" | "nights" | "band" | "resort" | "month";

/** Who sells what, where, for how long, at what price level. */
export const DEFAULT_DIMENSIONS: PsDimensionId[] = ["operator", "country", "nights", "band"];

interface DimensionSpec {
  title: string;
  /** Stable value id for this row on this dimension. */
  value: (entry: PricedRow, bands: PriceBand[]) => string;
  /** What the reader sees. Hebrew runs are bidi-isolated here, once. */
  label: (entry: PricedRow, bands: PriceBand[]) => string;
  /** Category order within the axis. Lower sorts first. */
  rank?: (value: string, count: number) => number;
}

const DIMENSION_SPECS: Record<PsDimensionId, DimensionSpec> = {
  operator: {
    title: "Operator",
    value: (e) => e.row.source,
    label: (e) => operatorName(e.row.source),
    // House order, so the operator axis doesn't reshuffle when a filter changes.
    rank: (value) => {
      const i = BRANDS.findIndex((b) => b.slug === value);
      return i === -1 ? BRANDS.length : i;
    },
  },
  country: {
    title: "Country",
    value: (e) => e.row.country,
    label: (e) => bidi(e.row.country),
    rank: (_value, count) => -count,
  },
  nights: {
    title: "Stay length",
    value: (e) => String(e.nights),
    label: (e) => `${e.nights} night${e.nights === 1 ? "" : "s"}`,
    // Nights are ordinal: 3 before 7, whatever the counts are.
    rank: (value) => Number(value),
  },
  band: {
    title: "Price band",
    value: (e, bands) => bandFor(e.perNight, bands).id,
    label: (e, bands) => bandFor(e.perNight, bands).label,
    // Cheapest at the top, so "cheap end" is a place on the chart.
    rank: (value) => Number(value.replace("band-", "")),
  },
  resort: {
    title: "Resort",
    value: (e) => e.row.resortId,
    label: (e) => bidi(e.row.resort),
    rank: (_value, count) => -count,
  },
  month: {
    title: "Departure month",
    value: (e) => monthKey(e.row.date),
    label: (e) => monthLabel(e.row.date),
    rank: (value) => Number(value.replace("-", "")),
  },
};

export function dimensionTitle(id: PsDimensionId): string {
  return DIMENSION_SPECS[id].title;
}

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

export interface PsNode {
  dimension: PsDimensionId;
  /** Stable id — the React key, and what `onSelect` reports. */
  value: string;
  label: string;
  count: number;
  /** Offers / total, 0..1. */
  share: number;
}

export interface PsAxis {
  id: PsDimensionId;
  title: string;
  nodes: PsNode[];
}

export interface PsRibbon {
  /** Stable identity across re-renders: the full tuple, joined. */
  key: string;
  /** One value id per axis, in axis order. */
  values: string[];
  /** One display label per axis, in axis order. */
  labels: string[];
  count: number;
  /** Operator slug, which is what the ribbon is coloured by. */
  operator: string;
  color: string;
  medianPerNight: number;
  share: number;
}

export interface PsModel {
  axes: PsAxis[];
  ribbons: PsRibbon[];
  /** Offers that made it into the diagram. */
  total: number;
  /** Offers with no resolvable stay length, excluded. */
  dropped: number;
  bands: PriceBand[];
}

export interface BuildOptions {
  /** Number of quantile price bands. Four (quartiles) by default. */
  bandCount?: number;
}

/**
 * Rows -> axes + ribbons.
 *
 * A ribbon is one *complete* path through every axis, not a pairwise link
 * between neighbours: that is what lets a hover trace "Club Med → France →
 * 7 nights → Premium" as a single thing, which is the whole question the chart
 * answers. Pairwise links would break that path at every axis.
 */
export function buildParallelSets(
  rows: SourcedRow[],
  dimensions: PsDimensionId[] = DEFAULT_DIMENSIONS,
  options: BuildOptions = {}
): PsModel {
  const dims = dimensions.length > 0 ? dimensions : DEFAULT_DIMENSIONS;
  const { priced, dropped } = pricedRows(rows);
  const bands = quantileBands(
    priced.map((p) => p.perNight),
    options.bandCount ?? 4
  );

  // One pass: every row contributes to one node per axis and to one ribbon.
  const nodeCounts = dims.map(() => new Map<string, { label: string; count: number }>());
  const ribbonAcc = new Map<
    string,
    { values: string[]; labels: string[]; operator: string; perNight: number[] }
  >();

  for (const entry of priced) {
    const values: string[] = [];
    const labels: string[] = [];

    dims.forEach((id, axis) => {
      const spec = DIMENSION_SPECS[id];
      const value = spec.value(entry, bands);
      const label = spec.label(entry, bands);
      values.push(value);
      labels.push(label);

      const bucket = nodeCounts[axis].get(value);
      if (bucket) bucket.count += 1;
      else nodeCounts[axis].set(value, { label, count: 1 });
    });

    const key = values.join(KEY_SEP);
    let ribbon = ribbonAcc.get(key);
    if (!ribbon) {
      ribbon = { values, labels, operator: entry.row.source, perNight: [] };
      ribbonAcc.set(key, ribbon);
    }
    ribbon.perNight.push(entry.perNight);
  }

  const total = priced.length;

  const axes: PsAxis[] = dims.map((id, axis) => {
    const spec = DIMENSION_SPECS[id];
    const nodes: PsNode[] = [...nodeCounts[axis]].map(([value, { label, count }]) => ({
      dimension: id,
      value,
      label,
      count,
      share: total > 0 ? count / total : 0,
    }));

    nodes.sort((a, b) => {
      const rank = spec.rank;
      if (rank) {
        const diff = rank(a.value, a.count) - rank(b.value, b.count);
        if (diff !== 0) return diff;
      } else if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });

    return { id, title: spec.title, nodes };
  });

  const ribbons: PsRibbon[] = [...ribbonAcc].map(([key, r]) => ({
    key,
    values: r.values,
    labels: r.labels,
    count: r.perNight.length,
    operator: r.operator,
    color: operatorColor(r.operator),
    medianPerNight: median(r.perNight) ?? 0,
    share: total > 0 ? r.perNight.length / total : 0,
  }));

  // Thickest last so the big flows paint over the hairlines, not under them.
  ribbons.sort((a, b) => a.count - b.count);

  return { axes, ribbons, total, dropped, bands };
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export interface Point {
  x: number;
  y: number;
}

export interface PsNodeLayout extends PsNode {
  x: number;
  y0: number;
  y1: number;
  /** Axis index, so a click knows which dimension it came from. */
  axis: number;
}

export interface PsAxisLayout {
  id: PsDimensionId;
  title: string;
  x: number;
  nodes: PsNodeLayout[];
}

/** The four corners of one ribbon segment: source top, target top, target bottom, source bottom. */
export type PsSegment = [Point, Point, Point, Point];

export interface PsRibbonLayout {
  ribbon: PsRibbon;
  segments: PsSegment[];
}

export interface LayoutOptions {
  width: number;
  height: number;
  nodeWidth?: number;
  /** Gap between stacked categories on one axis. */
  nodePadding?: number;
  /** Floor on ribbon thickness, in px. See `thicknessFor`. */
  minThickness?: number;
}

export interface PsLayout {
  axes: PsAxisLayout[];
  ribbons: PsRibbonLayout[];
  /** Pixels per offer, before the small-ribbon floor. */
  scale: number;
  nodeWidth: number;
}

/**
 * Pixel thickness per ribbon, with a floor.
 *
 * Strict proportionality would be more honest in the abstract and useless in
 * practice: 98% of offers come from one operator, so a five-offer Pingwin
 * ribbon lands at a third of a pixel and simply isn't drawn — the reader can't
 * see it, can't hover it, and concludes it doesn't exist. Giving every ribbon
 * at least ~1.5px costs a couple of percent of area on the big flows and keeps
 * the small operators in the picture. Exact counts are on every label, in every
 * tooltip and in the table, so the floor never has to be read as a quantity.
 *
 * Node heights are then summed from these same thicknesses rather than from the
 * raw counts, which is what keeps ribbons lined up inside their bars.
 */
export function thicknessFor(
  ribbons: PsRibbon[],
  total: number,
  usable: number,
  minThickness: number
): Map<string, number> {
  const raw = total > 0 ? usable / total : 0;
  const floored = ribbons.map((r) => Math.max(r.count * raw, minThickness));
  const sum = floored.reduce((acc, value) => acc + value, 0);
  // Re-normalise so the stack still fills exactly the height it was given.
  const factor = sum > 0 ? usable / sum : 1;
  return new Map(ribbons.map((r, i) => [r.key, floored[i] * factor]));
}

export function layoutParallelSets(model: PsModel, options: LayoutOptions): PsLayout {
  const { width, height } = options;
  const nodeWidth = options.nodeWidth ?? 10;
  const nodePadding = options.nodePadding ?? 10;
  const axisCount = model.axes.length;

  if (axisCount === 0 || model.total === 0) {
    return { axes: [], ribbons: [], scale: 0, nodeWidth };
  }

  /**
   * One pixels-per-offer scale for every axis, not one per axis.
   *
   * Giving each axis the full height would make a ribbon of 40 offers thicker
   * on a two-category axis than on a six-category one, i.e. the same quantity
   * drawn at two different sizes in one picture. Instead the busiest axis sets
   * the scale and shorter stacks are centred, leaving honest whitespace.
   */
  const maxCategories = Math.max(...model.axes.map((a) => a.nodes.length));
  const usable = Math.max(height - (maxCategories - 1) * nodePadding, 1);
  const scale = usable / model.total;
  const thickness = thicknessFor(
    model.ribbons,
    model.total,
    usable,
    options.minThickness ?? 1.5
  );
  const thicknessOf = (ribbon: PsRibbon) => thickness.get(ribbon.key) ?? 0;

  const step = axisCount > 1 ? (width - nodeWidth) / (axisCount - 1) : 0;

  const axes: PsAxisLayout[] = model.axes.map((axis, a) => {
    const x = axisCount > 1 ? a * step : (width - nodeWidth) / 2;
    // Node height is the sum of the ribbons through it, so the bar is exactly
    // as tall as the flow it holds even where the floor above kicked in.
    const heights = new Map<string, number>();
    for (const ribbon of model.ribbons) {
      const value = ribbon.values[a];
      heights.set(value, (heights.get(value) ?? 0) + thicknessOf(ribbon));
    }

    const stackHeight = usable + Math.max(axis.nodes.length - 1, 0) * nodePadding;
    let y = (height - stackHeight) / 2;

    const nodes: PsNodeLayout[] = axis.nodes.map((node) => {
      const y0 = y;
      const y1 = y0 + (heights.get(node.value) ?? 0);
      y = y1 + nodePadding;
      return { ...node, x, y0, y1, axis: a };
    });

    return { id: axis.id, title: axis.title, x, nodes };
  });

  // Where each category sits in its axis — the sort keys below are index-based,
  // so a ribbon leaving a node lines up with the node it is heading for.
  const nodeIndex = model.axes.map((axis) => {
    const map = new Map<string, number>();
    axis.nodes.forEach((node, i) => map.set(node.value, i));
    return map;
  });
  const nodeByValue = axes.map((axis) => {
    const map = new Map<string, PsNodeLayout>();
    for (const node of axis.nodes) map.set(node.value, node);
    return map;
  });

  const indexAt = (ribbon: PsRibbon, axis: number) => nodeIndex[axis].get(ribbon.values[axis]) ?? 0;

  /**
   * Stack order inside a node, looking outwards from the axis being stacked.
   *
   * The side a ribbon leaves by is ordered by where it is going, and the side
   * it arrives on by where it came from. That is what keeps ribbons between two
   * axes from crossing each other needlessly — the crossings that remain are
   * real re-orderings in the data.
   */
  function sortKey(ribbon: PsRibbon, axis: number, direction: 1 | -1): number[] {
    const keys: number[] = [];
    for (let a = axis + direction; a >= 0 && a < axisCount; a += direction) {
      keys.push(indexAt(ribbon, a));
    }
    for (let a = axis - direction; a >= 0 && a < axisCount; a -= direction) {
      keys.push(indexAt(ribbon, a));
    }
    return keys;
  }

  function compare(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  /** Top edge of each ribbon where it meets `axis`, on the given side. */
  function offsetsFor(axis: number, direction: 1 | -1): Map<string, number> {
    const byNode = new Map<string, PsRibbon[]>();
    for (const ribbon of model.ribbons) {
      const value = ribbon.values[axis];
      const bucket = byNode.get(value);
      if (bucket) bucket.push(ribbon);
      else byNode.set(value, [ribbon]);
    }

    const offsets = new Map<string, number>();
    for (const [value, group] of byNode) {
      const node = nodeByValue[axis].get(value);
      if (!node) continue;
      const keyed = group
        .map((ribbon) => ({ ribbon, key: sortKey(ribbon, axis, direction) }))
        .sort((a, b) => compare(a.key, b.key) || a.ribbon.key.localeCompare(b.ribbon.key));

      let y = node.y0;
      for (const { ribbon } of keyed) {
        offsets.set(ribbon.key, y);
        y += thicknessOf(ribbon);
      }
    }
    return offsets;
  }

  const rightOffsets = model.axes.map((_, a) => (a < axisCount - 1 ? offsetsFor(a, 1) : new Map()));
  const leftOffsets = model.axes.map((_, a) => (a > 0 ? offsetsFor(a, -1) : new Map()));

  const ribbons: PsRibbonLayout[] = model.ribbons.map((ribbon) => {
    const depth = thicknessOf(ribbon);
    const segments: PsSegment[] = [];

    for (let a = 0; a < axisCount - 1; a += 1) {
      const y0 = rightOffsets[a].get(ribbon.key);
      const y1 = leftOffsets[a + 1].get(ribbon.key);
      if (y0 === undefined || y1 === undefined) continue;
      const x0 = axes[a].x + nodeWidth;
      const x1 = axes[a + 1].x;
      segments.push([
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x1, y: y1 + depth },
        { x: x0, y: y0 + depth },
      ]);
    }

    return { ribbon, segments };
  });

  return { axes, ribbons, scale, nodeWidth };
}

/* ------------------------------------------------------------------ *
 * Ribbon geometry
 * ------------------------------------------------------------------ */

/**
 * One ribbon segment as a closed path: an S-curve along the top, straight down
 * the far edge, an S-curve back along the bottom.
 *
 * Hand-rolled because d3-sankey isn't a dependency here, and a ribbon needs two
 * paired curves rather than the single link d3-shape's generators emit. The
 * control points sit at the horizontal midpoint, which is the standard sankey
 * curve: the ribbon leaves and arrives horizontally, so it reads as a flow into
 * the node bar rather than a line aimed at a point.
 */
export function ribbonPath(corners: PsSegment): string {
  const [sourceTop, targetTop, targetBottom, sourceBottom] = corners;
  const midTop = (sourceTop.x + targetTop.x) / 2;
  const midBottom = (sourceBottom.x + targetBottom.x) / 2;

  return [
    `M${r(sourceTop.x)},${r(sourceTop.y)}`,
    `C${r(midTop)},${r(sourceTop.y)} ${r(midTop)},${r(targetTop.y)} ${r(targetTop.x)},${r(targetTop.y)}`,
    `L${r(targetBottom.x)},${r(targetBottom.y)}`,
    `C${r(midBottom)},${r(targetBottom.y)} ${r(midBottom)},${r(sourceBottom.y)} ${r(sourceBottom.x)},${r(sourceBottom.y)}`,
    "Z",
  ].join("");
}

/** Whole ribbon: every segment in one `d`, so it animates and hits as one mark. */
export function ribbonPathAll(segments: PsSegment[]): string {
  return segments.map(ribbonPath).join("");
}

/** Flat corners at the source edge — the shape a ribbon grows out of on mount. */
export function seedSegments(segments: PsSegment[]): PsSegment[] {
  return segments.map(([sourceTop, , , sourceBottom]) => {
    const y = (sourceTop.y + sourceBottom.y) / 2;
    const point = { x: sourceTop.x, y };
    return [point, { ...point }, { ...point }, { ...point }] as PsSegment;
  });
}

export function lerpSegment(a: PsSegment, b: PsSegment, t: number): PsSegment {
  return [0, 1, 2, 3].map((i) => ({
    x: a[i].x + (b[i].x - a[i].x) * t,
    y: a[i].y + (b[i].y - a[i].y) * t,
  })) as PsSegment;
}

/** Half a pixel is plenty of precision and keeps the `d` strings short. */
function r(value: number): number {
  return Math.round(value * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

export interface PsSelection {
  dimension: PsDimensionId;
  value: string;
  label: string;
}

/** Does this ribbon pass through the given category? */
export function ribbonPassesThrough(ribbon: PsRibbon, axes: PsAxis[], selection: PsSelection): boolean {
  const axis = axes.findIndex((a) => a.id === selection.dimension);
  return axis !== -1 && ribbon.values[axis] === selection.value;
}
