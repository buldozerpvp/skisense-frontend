# SkiSense frontend — working notes

Next 16 (App Router, Turbopack) · React 19 · MUI 6 · Material React Table 3 ·
TanStack Query 5 · Zustand · framer-motion 14 · d3-scale/shape/array/interpolate.
Runs on **:3001** because the backend owns :3000.

**The code carries no comments.** Names, folders and named constants say what
things are; this file says why they are that way. Anything surprising enough
to need explaining belongs here, not above the line that surprised you. The
only comments left in the tree are `eslint-disable` directives, which are
instructions to a tool rather than prose.

**Every function is `export const name = () => {}`.** No `function` keyword
anywhere, including inside component bodies and inside the theme bootstrap
string. A `const` is not hoisted, so a helper has to appear above its first
use in the same scope.

## How the tree is laid out

```
app/                     Next routes only — pages and API handlers, nothing else
features/
  offers/                browsing and comparing every tracked departure
    filtering/           the filter surfaces, desktop and phone
    offer-detail/        one offer, in full: panel, price history
    inclusions/          what a price actually buys — board, flights, lift pass
  resorts/               the resort card, its map, the catalogue
    hotels/              hotel photos and where a hotel stands
  brands/                operator pages, hero, tiles
    clubmed/             the one operator with page content of its own
  analytics/             the fold, the scrubber, the cards
    charts/              the hand-rolled SVG charts themselves
  prices/                the API, the database and the query hooks everything reads
  app-shell/             header, phone shell, theme, viewport
shared/
  design/                tokens and the MUI theme
  charts/                chart primitives, palette, motion and sizing hooks
  format/                money, percentages, dates
```

Every feature holds `components/`, `hooks/`, `lib/` and `constants.ts` as it
needs them, and a feature may contain another feature: `offers/filtering` is a
feature inside `offers` with exactly the same shape. A folder earns the nesting
when it has its own vocabulary — filtering has filter templates and value
pickers that nothing else uses.

**Nothing crosses sideways into another feature's internals.** A feature reads
another feature's `lib`, `hooks` or `constants`; it does not reach into a
sub-feature of a sibling. `shared/` holds what three or more features need and
nothing that belongs to one.

## Where the data comes from

The browser calls this app's own route handlers, `/api/prices/latest` and
`/api/prices/all` (`app/api/prices`), which read the Postgres (Neon) rows the
collector uploads. That is what lets Vercel serve the site without the
collector machine being reachable from the internet.

- No `DATABASE_URL`? The routes **proxy the local NestJS backend on :3000**, so
  development works with no setup at all.
- `NEXT_PUBLIC_API_BASE_URL` overrides everything and points the browser
  straight at a backend (e.g. a LAN address) — the route handlers are skipped.
- `features/prices/lib/databaseClient.ts` caches the pg Pool on `globalThis`: a new pool per request
  would exhaust the connection limit on serverless. Use Neon's **pooled**
  string, the host with `-pooler` in it.
- Responses carry `s-maxage=300, stale-while-revalidate=86400`. Prices change
  once a night, so the CDN answers repeat visits and the database is left
  alone — which is what keeps Neon's free egress allowance comfortable.

## Build and performance

- **React Compiler is on** (`reactCompiler: true`). It memoises components and
  hooks at build time, which suits a page where every chart recomputes scales
  from the same rows.
- **`OffersTable` opts out with `"use no memo"`.** Material React Table v3
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
- Design tokens live in `shared/design/tokens.ts`; the MUI theme only maps them.
  Change a colour or font there, nowhere else. Tailwind mirrors a subset in the
  `@theme` block of `app/globals.css`.

## Light and dark

One palette per mode in `shared/design/tokens.ts`, reached three ways:

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

## The brand mark

`features/app-shell/components/SkiSenseMark.tsx` is the logo as inline SVG, and it is what
the headers render — not the PNG, which stays only for the favicon and
share cards. Inline, because the mark has to change with the theme: on white
it is a deep navy flake with ice-blue bars, and on the dark ground that navy
goes to a smudge, so the two inks swap — an alpine white flake with the navy
in the bars. Dimming the light version instead leaves a grey logo on a navy
page.

- The fills are `COLORS.markFlake` / `COLORS.markBars`, so the swap happens in
  the browser when `data-theme` changes: no re-render, no theme context,
  nothing passed down.
- The paths were traced from the original artwork rather than redrawn, so the
  silhouette is the drawing itself. The flake path is the whole figure and the
  bars are painted on top of it — keep that order or the bars vanish under it.
- `public/skisense-logo.svg` is the same mark as a standalone file, carrying
  both themes in its own `prefers-color-scheme` block for anything outside
  React. 4 KB against the PNG's 165 KB.

## Three traps that looked like design problems

- **`borderRadius: 4` in `sx` is 48px, not 4px.** MUI multiplies a bare
  number by `theme.shape.borderRadius`, which is `RADIUS.md` = 12 here. Every
  mobile card had been written as `4` and was rendering as a 48px bubble with
  14px of padding inside it, so text ran into the curve — the resort dialog
  was at `5`, which is 60px. They all take explicit token pixels now
  (`` borderRadius: `${RADIUS.lg}px` ``). Pick the radius by the element:
  xl (24) for a dialog, lg (16) for a card, md (12) for a tile, sm (8) for a
  bar, pill for an action — and keep padding at or above the radius so no
  line meets a corner.
- **`overflow-x: hidden` on `html`/`body` kills `position: sticky`.** It makes
  that element a scroll container, so a sticky descendant sticks to *it*, not
  to the viewport: the desktop header, and the theme switch in it, scrolled
  away halfway down the page. `overflow-x: clip` stops sideways scrolling
  without creating a scroll container. Never put `hidden` back.
- **CSP enforces host rules on redirect targets.** Commons'
  `Special:FilePath` used to redirect to `upload.wikimedia.org` and now lands
  on `thumb.wikimedia.org`; only the old host was in `img-src`, so every
  resort photo was blocked by our own header and the card showed a grey
  panel — with the photo credit underneath it, which is what makes this look
  like missing data rather than a blocked request. `img-src` now allows any
  `*.wikimedia.org` host rather than a list that rots the next time they move
  the files.
- **Every form control is 16px minimum**, set once in `app/globals.css`.
  WebKit — every browser on iOS, Chrome included — zooms the page in on a
  focused control under 16px and leaves it scaled, and the bar is cleared per
  field, so one input written smaller deep inside a sheet brings the lurch
  back on its own. The floor is deliberately **not** scoped to touch: a rule
  that only holds on phones is one nobody can see breaking, since the field
  looks fine on the machine it was written on and zooms on the device it
  ships to. The `[class]` in the selector is load-bearing — MUI writes sizes
  as a single emotion class, which outranks a bare `input` selector, so
  without it the floor loses to every field in the app and silently does
  nothing. The desktop table's date filters were sized for 13px and had to
  grow (`DateRangeFilter` 158px each, Dates column 336) or the native control
  clips to `mm/dd/y`. The viewport `maximum-scale=1` "fix" works by taking
  pinch-zoom away from everyone.
- A scroll region that ends at a fixed action bar gets a short gradient over
  its bottom edge, hung off the scroll *frame* rather than the content. A card
  that stops dead against the bar reads as clipped rather than as "more below".

## The phone app

Below 900px the site is a different app, not a squeezed table. The shell is
exactly one viewport tall and the page never scrolls: `MobileShell` is
`height: 100dvh; overflow: hidden`, every strip of chrome is `flex: 0 0 auto`,
and the single scrolling region is the list itself (`flex: 1; min-height: 0;
overflow-y: auto`). Sticky positioning is not enough — it pins the header but
lets the search box and the filter chips slide away under it. If you add a
screen, keep that shape or the whole page starts scrolling again.

`Responsive`
(`features/app-shell/components/Responsive.tsx`) picks a tree once `useIsMobile()` knows
the viewport — it returns `null` on the server, and the placeholder frame is
deliberate: guessing desktop flashes the eleven-column table onto a phone.
`TopBar` and `SiteFooter` hide at the same breakpoint, because `MobileShell`
brings its own header and bottom bar.

- **Two destinations** in the bottom bar, Offers and Brands. Analytics is a
  pill in the top bar on every screen — a place you visit, not a place you
  browse from, and two tabs keep both targets wide.
- **`features/offers/lib/offerModel.ts`** flattens a snapshot row into everything a phone
  row shows (label, badge, total, per person, overnight move) once, because a
  phone row has no columns to resolve cells from. The move comes from
  `buildHomeModel`, looked up by the same `source|resortId|hotel|date|nights`
  key, and stays null until the history query lands — the list must not wait
  for it.
- **One filter store** (`useOfferFilters`) for every screen, so narrowing on
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

## Opening an offer

A row is the offer, so clicking anywhere on it opens the offer — on both
surfaces. `features/offers/offer-detail/components/OfferPanel.tsx` renders one tree in two shells:
full screen on a phone (`surface="sheet"`), a 440px panel on the right of the
table on a desktop (`surface="drawer"`). Two copies of that content would have
drifted apart by the second change, so there is only one.

- The desktop table builds its detail model with `buildOffers` from the
  same query the phone uses, and finds the clicked offer by key.
  **`offerDetailKey` in `OffersTable` must stay character-for-character the
  same expression as `key` in `features/offers/lib/offerModel.ts`** — they are built from
  the same snapshot rows by different paths, and the day they disagree the
  drawer opens empty.
- **The resort name keeps its own click**, with `stopPropagation`, because the
  resort and the offer are two different questions. Everywhere else on the row
  opens the offer.
- Grouping is on, and a group header row carries no offer: `muiTableBodyRowProps`
  returns `{}` for a row whose `original` has no `resortId`, so the header is
  not clickable and cannot open someone else's price.

## One offer's price history

Tapping an offer opens the sheet, and under the resort chips sits
`features/offers/offer-detail/components/OfferPriceHistory.tsx` — what *this* offer has cost on every
night it was collected: this operator, this property, this departure, this
stay length. It replaced a row of bare bars with no axis, no dates and no way
to read a value off it.

- **Only collected nights are drawn**, as dots with straight segments between
  them. A missed night widens the gap rather than inventing a reading, because
  a hole in collection drawn as a point becomes a price move that never
  happened.
- **The y axis does not start at zero**, and the visible span has a floor. A
  EUR 4,500 holiday that moved EUR 80 is a flat line against a zero baseline,
  and a EUR 5 wobble on a collapsed domain is a cliff.
- **The line is coloured by the net move**, aqua down and red up - the change
  pair, never used here for level. Taps anywhere in a point's column select
  that night, since a 2px dot is not a thumb target.
- The "Show every night" list is the readable equivalent of the line, the same
  relief the desktop charts get from `ChartCard`'s table view.

## The resort card

Every resort name — in the phone list, in the offer sheet, in the desktop
table — opens one dialog (`features/resorts/components/ResortCard.tsx`), mounted once in
`app/layout.tsx` and opened through the `useResortCard` store rather than
threaded down as props.

- **`features/resorts/lib/resortCatalogue.ts`** is the catalogue, keyed by `resortKey`, with
  a photo, coordinates, a one-line description and the stats. Every field is
  optional and a missing figure renders a dash: "we don't know" and "zero" are
  different statements, and a resort with no photo still gets a usable card.
- **Photos are Wikimedia Commons files** chosen for a snowy wide shot. The
  credit line under the picture is the licence condition, not decoration —
  don't remove it. `buildPhotoUrl()` goes through `Special:FilePath`, which
  redirects to upload.wikimedia.org, so both hosts are in the CSP's `img-src`.
- **Two statistics caveats, written up in the file's header.** `pisteKm` for a
  resort inside a linked area is its own sector where a source separates it and
  the whole domain where none does (`linkedArea` names it); Les Gets and
  Morzine overlap and must not be added. `snowfallCm` comes from OnTheSnow's
  report-built averages, which undercount, and is left out entirely for
  Bulgaria, Andorra, Georgia and North Macedonia where the published figures
  are plainly reporting gaps. The card says so under the number.
- **The map is Leaflet with OpenStreetMap tiles**, imported dynamically because
  Leaflet touches `window` as it initialises. The marker is a `circleMarker`,
  not the default pin — the pin is a PNG inside the package and goes missing
  behind a rewritten asset path. Dark mode inverts the tile pane and spins the
  hue back rather than adding a second tile provider. `invalidateSize()` after
  a tick is required: the container is sized by CSS, which Leaflet cannot see
  during the first paint.
- Satellite villages (Arc 1800, Arc 2000, Peisey-Vallandry, Marilleva) carry
  `sharesCardWith` and show their parent's card under their own name.

## Hotel photos

The offer sheet opens with a `PhotoCarousel` (`features/resorts/hotels/components/`): swipe or
tap the arrows, tap a photo for full screen with arrow-key paging. Paging is
CSS scroll-snap, not a carousel library, and the dots follow the scroll offset
rather than the last button pressed.

What feeds it is the hard part. **`features/resorts/hotels/lib/hotelPhotos.ts` holds five
properties out of sixty-nine.** Freely-licensed photography of a three-star ski
hotel barely exists: a mountain is shot by thousands of visitors who upload
under open licences, a hotel's pictures are shot by the hotel. A full Commons
sweep matched English pubs called The Lion Hotel, a Marco Polo in Hong Kong,
icebergs in Greenland and a Styrian town hall. Every entry in that file was
confirmed by eye; **never add one on a name match**, because a wrong hotel
photo is a picture of a building the traveller will not be staying in, shown
beside the price they might pay for it.

Where a property has no photo of its own, its slot is taken by `HotelMap` —
a small inert map of where the place stands, tappable to a full-screen one you
can pan and zoom. That is the other thing you want to know about a hotel and
the one we can source honestly; a photo of the valley in the hotel's slot
would be a lie with a price next to it.

**`features/resorts/hotels/lib/hotelPlaces.ts` has building-level coordinates for 22 of the
69 properties**, geocoded through Nominatim and filtered twice: anything over
20 km from its resort was dropped (that is what stops "Rila" in Borovets
landing on the Rila Monastery), and so was any result whose OSM type was not
somewhere you can sleep — the raw sweep offered a drinking fountain, a
ski-lift pylon, a cinema and a deli counter. The other 47 fall back to the
resort centre and the caption says the pin is approximate. Do not remove that
caption to make the card look tidier.

Filling this out properly needs a licensed source — an affiliate content API
(Booking.com, Expedia) grants display rights, as does the hotels' own
permission, or photographs taken by whoever runs the site. The carousel reads
whatever that map holds, so adding a source later is a data job, not a UI one.

## The offers table

- **Hotels.** Rows share a `hotelKey` when they are the same property across
  operators (see Backend/src/hotels). `features/offers/lib/hotelLabels.ts` picks one display
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

## Board basis and room occupancy

`features/offers/inclusions/lib/board.ts` maps every spelling the six operators use —
`ארוחת בוקר`, `Half board`, `DPIND`, nothing at all — onto one scale
(room-only / breakfast / half-board / full-board / all-inclusive / unknown).
`unknown` is shown as "meals ?" rather than guessed: breakfast printed on a
room-only price is the kind of error someone books on.

- **Ofir Tours** prints the board on the card, in the span straight after the
  nights span. The old regex also swallowed the transfers badge and the party
  string, which is why stored snapshots have `board: "3 מבוגרים"` — fixed with
  a reject list, and the card's transfers badge is now stored too.
- **Club Med** states no board per offer and needs none: its winter villages
  are all-inclusive by construction, so that is a source-level default.
- **Belambra** already carries board codes; `AIIND`, `DPIND`, `DPRMIND`,
  `PCRMIND`, `LOC` all map.
- **Skideal, Pingwin and Issta all state the board — just not where the
  prices are.** Skideal prints the package on its `/site/<resort>/` page,
  Pingwin on each hotel page under "המחיר כולל", Issta on the results cards
  the collector already sweeps for hotel names. All three now arrive on the
  row; see the backend notes for how each is joined back on.
- **Pattern order in `board.ts` is the whole trick.** They are tested top to
  bottom, first hit wins, so every line must be narrower than the ones below
  it. `ארוחות בוקר וערב` is half board and contains the word for breakfast:
  tested after the breakfast line it reads as breakfast, and dinner quietly
  leaves the price. Same for `ארוחות בוקר, צהריים וערב`, which is full board
  and contains both. Operators also write the same meal several ways —
  Skideal pluralises and adds where it is served, Issta hyphenates and marks
  kosher half board, its package list says `B&B` — and the tests in the
  patterns' comment cover every spelling seen live.

- **Issta used to be unknown per offer, and the reason is still worth knowing.**
  Their feed has no board field, and the several rows a hotel has for one date
  — identical but for price — are **board baskets, not room grades**: for
  Vihren on 2027-01-28, the 1,009 and 1,079 per person match the breakfast and
  half-board grand totals exactly. `basisid=0` in the deep link means
  *breakfast*, not "any basis" (checked live), so the link can land on a board
  the price does not belong to. Boards could be recovered by matching prices
  against a details page per basket shape — not per offer — but that is not
  built.

Room occupancy is `pax`: the party the operator priced, not a capacity. The
sheet says so, because an offer sold for three is a different product from the
same room sold for two, never that price divided.

## What a price includes

Six operators quote a number for the same week and mean different things by
it, and none of them publish an "includes flights" field. `features/offers/inclusions/lib/packageInclusions.ts` records the answer per operator, with the evidence, in three
states — and `unknown` is a real state, because a wrong flight badge is one
someone books on.

- **Issta** and **Club Med**: flights from Tel Aviv, transfers and a lift pass,
  high confidence. Club Med was settled by experiment rather than by reading:
  the same calendar call for Tignes returns €5,660–5,836 varying by date with
  `departureCity: "TLV"` and a flat €4,802 for every date without it. Only a
  flight prices by date. Issta's own feed carries `DepartureCode: "TLV"` and
  `PackageType: 1` on all 605 live options, now stored per row as
  `departsFrom`.
- **Pingwin** and **Skideal**: flight and transfers included, lift pass varies.
  Pingwin sells some departures from **Haifa**, and Skideal never states a
  departure airport anywhere on its site — so neither gets an unqualified
  "from Tel Aviv".
- **Ofir Tours**: transfers on every listing, flights only on "full packages"
  by their own wording. Classified `unknown`, not `included`.
- **Belambra**: accommodation only. Their search has no departure city at all,
  so the price cannot vary by where you start.

**The offer's own page beats its operator's habit.** `offerInclusions(source,
offer.stated)` starts from the table above and overwrites whatever that one
offer actually stated — Ophir's promotion pages name both legs, the airline,
the baggage in the fare and the days of lift pass, so those rows answer
"flights included, from Tel Aviv" instead of inheriting the cautious `varies`
their cards earn. Stating anything lifts that offer's confidence to high: it
was read off the page the shopper is about to open. An unstated field is still
unstated — `flightStatus(source, undefined)` falls back to the operator.

**Skideal links are per resort.** `/site/<resort>/` is the only page that
lists departures; the package permalink and `/hotel/<slug>/` both render site
chrome and nothing to book (checked live 2026-10-27). Rows collected before
that date still carry the old links until the collector re-runs.

**The offers list opens filtered to flight-inclusive packages**, on both the
phone and the table. That hides about a fifth of the rows, so the chip for it
is always rendered even at its default — a default-on filter that is invisible
is a bug report waiting to happen.

Two unresolved data issues this turned up, both in the backend:
Belambra's self-catering (`LOC`) rows are priced **per accommodation**, not
per person, so they are stored in the wrong unit and undercut every other
operator; and Club Med's stored prices jumped ~40% between the 17 Oct snapshot
and a live call, which is either an October sale or a collection fault and is
worth a look.

## Charts — house rules

All charts are hand-rolled SVG: d3 does the maths, React renders. Before
touching one, read `features/analytics/charts/components/MoversDumbbell.tsx` and `SeasonBand.tsx`.

- Wrap every chart in `ChartCard` with a title, a how-to-read subtitle, and a
  **table view** (`tableRows`/`tableColumns`). The table is the accessibility
  relief for the aqua fill, which sits at 2.82:1 on white — not optional.
- Colour only from `shared/charts/lib/palette.ts`. Aqua = cheaper, red = pricier, and
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

`features/analytics/lib/deriveSeries.ts` folds nightly snapshots into a `SeriesIndex`. An
offer's identity is `source|resortId|departure|nights` — stay length is part of
it because operators sell 3- and 7-night packages for the same hotel and date,
and merging them reports the swap as a price move.

Prices are per person. Compare **per night** (`nights ?? brand.defaultNights`)
whenever mixing operators, or short breaks look like bargains.

Rows carry `resort` (canonical English), `resortKey`, `hotel`, `board` and
`url`. Display the hotel separately; don't concatenate it into the resort.

The snapshot scrubber (`features/analytics/hooks/useSnapshotCursor.ts`) slices the index by
day, so every chart below it rewinds together.

## Rules the code no longer states out loud

These used to live as comments above the functions that enforce them. The
functions are named for what they do; this is why they do it.

**Money is the total the booking costs.** Operators quote in different units —
Issta prices a party, Ophir Tours prices a person in a room of two or three —
so collectors store one per-person figure plus the party it assumes, and
`totalPrice()` multiplies back up. The per-person figure is never a headline;
nobody pays it. `perPersonPrice()` at any other party size is arithmetic, not
a bookable price: hotels don't charge four people twice what they charge two.

**Party size filters, it never divides.** Operators sell a room, so
"travelling four" means "offers sold for four", not "a couple's price split
four ways".

**Comparisons are per night.** Issta sells 3-night breaks and Club Med sells
weeks; ranked on total price the short break always wins and the chart is
measuring stay length.

**A booking's identity is source, resort, hotel, departure and nights.** Hotel
and nights are in it because they are part of what you buy: Issta lists four
Bansko rooms under one resort id, and Pingwin sells 3- and 7-night packages for
the same hotel and date. Merge either and the swap between two products is
reported as a price move.

**"Still on sale" is per operator, not global.** Operators don't collect on the
same night, so a single latest-day cutoff marks five of six sources sold out.

**The movers chart caps a resort at two rows.** Operators reprice a whole
resort at once, so an unfiltered ranking is six consecutive weeks at one resort
that all moved the same amount — six rows spending the card on one fact. It
ranks by percentage, not euros, so a €200 cut on a Bulgarian long weekend stays
in the running against a €2,000 swing on a Val d'Isère week.

**Search compares skeletons, not strings.** Nobody types the diacritics, nobody
matches an operator's capitalisation, and nobody remembers whether the hotel is
"Pas" or "Pass". Both sides lose accents, case and punctuation, and a doubled
letter collapses, so "pass" reaches "Pas" and "l'eclose" reaches "l eclose".
Every word typed must appear somewhere in the row; order does not matter.

**A missing figure renders a dash, never a zero.** "We don't know" and "zero"
are different statements, in the resort card's stats and everywhere else.

**Hebrew names are wrapped in bidi isolates.** Several resorts, hotels and
countries come back in Hebrew, and a right-to-left run dropped into an LTR
label ("Charlevoix · 14 Feb") reorders the text around it. `bidi()` wraps the
run in FSI…PDI; truncation measures the bare text and puts the isolates back,
because a truncated Hebrew name with no isolate causes the exact scrambling
the wrapper exists to prevent.

**Dates are built and parsed in UTC, and formatted en-GB.** A stay that
crosses a daylight-saving change, assembled by adding days to a local date,
comes home an hour early and prints the day before. The locale is pinned
because the operators publish day-first dates: letting the visitor's locale
decide would turn "14 Feb" into "Feb 14" on some screens and not others.

**The market index is a chained matched basket, not an average.** Averaging
every offer measures which offers exist: when the cheap departures sell out
the mean jumps although nothing got more expensive. Each step averages
per-offer price *ratios* over the offers present on both days and chains them
from 100, so a day with no overlap carries the index forward unchanged rather
than inventing a move. Ranks are likewise computed within a single day, for
the same reason.

**A move is measured against that offer's own previous observation**, not
against "yesterday", so a night a source failed to collect doesn't fabricate a
jump. Signed percentages always carry their sign, with U+2212 rather than a
hyphen so the minus is the same width as the plus; a bare "4.2%" reads as a
level.

**Stored UI state is read after mount, never during render.** Saved views, the
theme choice and the last-used filters all live in `localStorage`, which does
not exist on the server: reading it during render breaks the server pass and
mismatches on hydration. Every read is wrapped, because private windows and
blocked site data throw, and losing a saved view must never break the screen.

**The theme effect that follows the OS deliberately does not sync on mount.**
On the first run it still sees the initial `"system"`, even though the effect
beside it has already read a stored choice — syncing there would overwrite
that choice, and someone who picked light on a dark machine would be back in
dark after every reload.

**Every input is at least 16px.** WebKit zooms the page whenever a focused
control is smaller, which is the lurch that used to happen on tapping search.
`maximum-scale` would stop it by taking pinch-zoom away from everyone, so the
floor is set on the fields instead — and the desktop Dates column is sized to
fit two 16px date inputs, because a narrower one clips the native control to
"mm/dd/y".
