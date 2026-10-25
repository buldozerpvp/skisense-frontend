# SkiSense frontend — working notes

Next 16 (App Router, Turbopack) · React 19 · MUI 6 · Material React Table 3 ·
TanStack Query 5 · Zustand · framer-motion 14 · d3-scale/shape/array/interpolate.
Runs on **:3001** because the backend owns :3000 (`lib/api/config.ts`).

## Where the data comes from

The browser calls this app's own route handlers, `/api/prices/latest` and
`/api/prices/all` (`app/api/prices`), which read the Postgres (Neon) rows the
collector uploads. That is what lets Vercel serve the site without the
collector machine being reachable from the internet.

- No `DATABASE_URL`? The routes **proxy the local NestJS backend on :3000**, so
  development works with no setup at all.
- `NEXT_PUBLIC_API_BASE_URL` overrides everything and points the browser
  straight at a backend (e.g. a LAN address) — the route handlers are skipped.
- `lib/db/client.ts` caches the pg Pool on `globalThis`: a new pool per request
  would exhaust the connection limit on serverless. Use Neon's **pooled**
  string, the host with `-pooler` in it.
- Responses carry `s-maxage=300, stale-while-revalidate=86400`. Prices change
  once a night, so the CDN answers repeat visits and the database is left
  alone — which is what keeps Neon's free egress allowance comfortable.

## Build and performance

- **React Compiler is on** (`reactCompiler: true`). It memoises components and
  hooks at build time, which suits a page where every chart recomputes scales
  from the same rows.
- **`BrandsTable` opts out with `"use no memo"`.** Material React Table v3
  mutates its instance options during render; compiled, it never sees
  `isLoading` go false and sits on skeleton rows with its loading overlay
  swallowing every click. Leave that directive in place until MRT supports
  the compiler, and re-test the table in a **production build** after touching
  it — the bug does not appear with `next dev`.
- Security headers (CSP, frame-ancestors, nosniff, Permissions-Policy) are set
  in `next.config.ts`. The CSP allows inline styles and scripts because
  emotion and Next's hydration bootstrap need them; tightening that means
  nonces and giving up static rendering.

## Layout

- `app/page.tsx` — hero, brand tiles, the combined offers table, then analytics.
- `app/brands/[slug]` — brand hero, **the offers table first**, then that
  brand's own analytics. A brand with no stored snapshot shows a plain
  "no prices collected yet" note instead of a page of zeroes.
- Design tokens live in `lib/design/tokens.ts`; the MUI theme only maps them.
  Change a colour or font there, nowhere else. Tailwind mirrors a subset in the
  `@theme` block of `app/globals.css`.

## Light and dark

One palette per mode in `lib/design/tokens.ts`, reached three ways:

- **`COLORS`** is the palette as CSS variables (`var(--ss-ink)`). Use it in
  `sx` and inline styles — the browser resolves it, so a component written
  against it switches theme with no re-render and no theme plumbing.
- **`LIGHT_COLORS` / `DARK_COLORS` / `PALETTES[mode]`** are the literal hex
  values, for the two places that need a real colour: the MUI theme, which
  runs `alpha()` over them, and the charts, which hand them to d3.
- **`themeVariablesCss()`** emits both sets; `app/layout.tsx` injects it, and
  an inline script sets `data-theme` on `<html>` before first paint. Without
  that script a visitor who prefers dark gets a white flash on every page.

Rules worth keeping:

- **Charts call `useChartColors()`**, never the module-scope `CHART_COLORS`
  (which is the light palette frozen at import time, kept only for non-React
  callers). Anything memoised from it lists `colors` in its deps.
- Dark is **not** the light palette inverted: surfaces get *lighter* as they
  come forward, the ground is deep navy rather than black (the aqua vibrates
  on true black), and the accent and data pair are lifted until they clear
  4.5:1 on `surface`.
- **No fixed `#fff` or `rgba(255,255,255,…)` for a surface.** Use
  `color-mix(in srgb, ${COLORS.surface} N%, transparent)` for a translucent
  one — a fixed white turns into a pale grey card with unreadable labels in
  dark mode, which is exactly how the hero tiles broke.
- Shadows are a light-mode device. `DARK_SHADOWS` swaps them for a hairline
  edge, because a shadow on a dark ground is invisible.
- White on a brand-coloured gradient (`BrandHero`, `ComingSoon`) stays white
  in both themes — the ground under it is the brand colour, not the surface.

## The phone app

Below 900px the site is a different app, not a squeezed table. The shell is
exactly one viewport tall and the page never scrolls: `MobileShell` is
`height: 100dvh; overflow: hidden`, every strip of chrome is `flex: 0 0 auto`,
and the single scrolling region is the list itself (`flex: 1; min-height: 0;
overflow-y: auto`). Sticky positioning is not enough — it pins the header but
lets the search box and the filter chips slide away under it. If you add a
screen, keep that shape or the whole page starts scrolling again.

`Responsive`
(`components/mobile/Responsive.tsx`) picks a tree once `useIsMobile()` knows
the viewport — it returns `null` on the server, and the placeholder frame is
deliberate: guessing desktop flashes the eleven-column table onto a phone.
`TopBar` and `SiteFooter` hide at the same breakpoint, because `MobileShell`
brings its own header and bottom bar.

- **Two destinations** in the bottom bar, Offers and Brands. Analytics is a
  pill in the top bar on every screen — a place you visit, not a place you
  browse from, and two tabs keep both targets wide.
- **`lib/mobile/model.ts`** flattens a snapshot row into everything a phone
  row shows (label, badge, total, per person, overnight move) once, because a
  phone row has no columns to resolve cells from. The move comes from
  `buildHomeModel`, looked up by the same `source|resortId|hotel|date|nights`
  key, and stays null until the history query lands — the list must not wait
  for it.
- **One filter store** (`useMobileFilters`) for every screen, so narrowing on
  Brands is still narrowing when you switch to Offers. `null` on a
  multi-select means no filter, the same three states the desktop
  `MultiSelectFilter` uses.
- **Chips select, they don't deselect.** Tapping an operator chip while
  nothing is filtered sets that one operator. Emptying a chip group goes back
  to "all" rather than leaving a blank list with no way out.
- **Resort and Hotel are drill-in pickers** (`ValuePicker`), not chip rows:
  hundreds of values each. Select all / None live in the list *header*, never
  as list rows — inside the list is exactly what made the desktop All button
  report "1 selected". The hotel list is scoped to the chosen resorts.
- **A short result list explains itself.** When a search matches more than
  the filters allow through, the list says how many are hidden and offers one
  tap to clear. Silence there reads as a broken index.
- Analytics reads the same filtered set as the list. Its month band uses one
  hue at varying weight — the aqua/red pair means price *change*, and a dear
  month is not a month that rose.

## The offers table

- **Hotels.** Rows share a `hotelKey` when they are the same property across
  operators (see Backend/src/hotels). `lib/table/hotels.ts` picks one display
  name per key, so a hotel reads and filters as one hotel whatever each
  operator called it.
- **Property type** is hotel / club / apartment / chalet. The table opens
  filtered to hotels and clubs - self-catering isn't comparable with half
  board - through `DEFAULT_FILTERS`, which "Clear" restores rather than
  emptying.
- **Every multi-select filter is `MultiSelectFilter`**: it starts from "all"
  and lets you take values away, with All / None buttons and a search box past
  eight options. An empty value means no filter, so "All" just clears it.
- **Party size filters rows**, it does not divide a price: operators sell a
  room, so an offer priced for two is not a deal for four. The picker lists
  only sizes some operator actually sells.
- Country is shown by default, Status hidden (a Club Med urgency flag the
  other five never set). Visibility is state with a setter - passing a memo
  into `state` freezes the show/hide panel.

## Charts — house rules

All charts are hand-rolled SVG: d3 does the maths, React renders. Before
touching one, read `components/charts/MoversDumbbell.tsx` and `SeasonBand.tsx`.

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
