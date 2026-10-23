# SkiSense frontend — working notes

Next 16 (App Router, Turbopack) · React 19 · MUI 6 · Material React Table 3 ·
TanStack Query 5 · Zustand · framer-motion 14 · d3-scale/shape/array/interpolate.
Runs on **:3001** because the backend owns :3000 (`lib/api/config.ts`).

## Where the data comes from

The browser calls this app's own route handlers, `/api/prices/latest` and
`/api/prices/all` (`app/api/prices`), which read the MongoDB Atlas snapshots
the collector uploads. That is what lets Vercel serve the site without the
collector machine being reachable from the internet.

- No `MONGODB_URI`? The routes **proxy the local NestJS backend on :3000**, so
  development works with no setup at all.
- `NEXT_PUBLIC_API_BASE_URL` overrides everything and points the browser
  straight at a backend (e.g. a LAN address) — the route handlers are skipped.
- `lib/mongo/client.ts` caches the MongoClient on `globalThis`: a new client
  per request would exhaust the cluster's connection limit on serverless.

## Layout

- `app/page.tsx` — hero, brand tiles, the combined offers table, then analytics.
- `app/brands/[slug]` — brand hero, **the offers table first**, then that
  brand's own analytics. A brand with no stored snapshot shows a plain
  "no prices collected yet" note instead of a page of zeroes.
- Design tokens live in `lib/design/tokens.ts`; the MUI theme only maps them.
  Change a colour or font there, nowhere else. Tailwind mirrors a subset in the
  `@theme` block of `app/globals.css`.

## Charts — house rules

All charts are hand-rolled SVG: d3 does the maths, React renders. Before
touching one, read `components/charts/MoversDumbbell.tsx` and `SeasonCurve.tsx`.

- Wrap every chart in `ChartCard` with a title, a how-to-read subtitle, and a
  **table view** (`tableRows`/`tableColumns`). The table is the accessibility
  relief for the aqua fill, which sits at 2.82:1 on white — not optional.
- Colour only from `lib/charts/palette.ts`. Aqua = cheaper, red = pricier, and
  that diverging pair is for price *change* only. The pair is CVD-validated
  (green/red fails at ΔE 4.1); do not re-tune it by eye.
- **Colour snaps, position tweens.** The scale passes through neutral, so a
  tweened fill reads "no change" mid-transition.
- Motion only through `useChartMotion()`; never hard-code a duration and never
  call `useReducedMotion` directly. Morph a path's `d` with `useAnimatedPath`
  (it interpolates points, not strings). Never use framer's `pathLength` on a
  changing `d` — it measures geometry on every change and only plays once.
- An attribute that appears in `animate` must **not** also be a static prop, or
  framer owns it and React's value is ignored (half the mark teleports).
- React keys are stable offer keys, never array indices — a filtered list
  recycles index 5 onto an unrelated offer and tweens between the two.
- Never animate axes, gridlines or reference lines: if the frame moves with the
  marks, nothing is measurable.
- Performance: ~700 offers. Budget ~150 framer-motion elements per page. Large
  sets get plain SVG with a CSS transform transition, or one combined path.

## Data

`lib/analytics/derive.ts` folds nightly snapshots into a `SeriesIndex`. An
offer's identity is `source|resortId|departure|nights` — stay length is part of
it because operators sell 3- and 7-night packages for the same hotel and date,
and merging them reports the swap as a price move.

Prices are per person. Compare **per night** (`nights ?? brand.defaultNights`)
whenever mixing operators, or short breaks look like bargains.

Rows carry `resort` (canonical English), `resortKey`, `hotel`, `board` and
`url`. Display the hotel separately; don't concatenate it into the resort.

The snapshot scrubber (`lib/store/useSnapshotCursor.ts`) slices the index by
day, so every chart below it rewinds together.
