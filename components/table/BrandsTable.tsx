"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_SortingState,
  type MRT_VisibilityState,
} from "material-react-table";
import {
  Box,
  Chip,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Link as MuiLink,
  MenuItem,
  TextField,
  InputAdornment,
  Stack,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { COLORS } from "@/lib/design/tokens";
import {
  fitsParty,
  paxOf,
  pricePerPerson,
  totalPrice,
  type PartyChoice,
} from "@/lib/table/pricing";
import { countryBadge } from "@/lib/table/countries";
import { useResortCard } from "@/lib/resorts/useResortCard";
import { FLIGHT_FILTER_LABEL, flightStatus, inclusionsFor, type FlightStatus } from "@/lib/offers/inclusions";
import { BOARD_ICON, BOARD_LABEL, BOARD_ORDER, boardFor, type BoardBasis } from "@/lib/offers/board";
import {
  DEFAULT_PROPERTY_TYPES,
  PROPERTY_TYPE_ICON,
  PROPERTY_TYPE_LABEL,
  hotelLabelOf,
  hotelLabels,
  propertyTypeOf,
} from "@/lib/table/hotels";
import { MultiSelectFilter, isOneOf } from "./MultiSelectFilter";
import { shortDate } from "@/lib/analytics/format";
import { matchesQuery } from "@/lib/table/search";
import { useLatestOffers } from "@/lib/query/usePrices";
import { useAppStore } from "@/lib/store/useAppStore";
import { BRANDS, getBrand } from "@/lib/brands/config";
import type { OfferStatus, PriceRow, PropertyType } from "@/lib/brands/types";
import { DateRangeFilter, isWithinDateRange, type DateRangeValue } from "./DateRangeFilter";
import {
  NumberRangeFilter,
  isWithinNumberRange,
  type NumberRangeValue,
} from "./NumberRangeFilter";
import { FilterTemplateBar } from "./FilterTemplateBar";
import {
  buildBuiltInTemplates,
  deleteTemplate,
  loadActiveTemplateId,
  loadSavedTemplates,
  saveTemplate,
  storeActiveTemplateId,
  type FilterTemplate,
} from "@/lib/table/filterTemplates";

/** One price row, tagged with which brand (backend source) it came from. */
type CombinedOfferRow = PriceRow & { brandSlug: string };

// Only Club Med ever sets anything but `default`, which is why the column this
// feeds is hidden until someone asks for it.
const STATUS_LABEL: Record<OfferStatus, { label: string; color: "success" | "warning" | "default" }> = {
  green: { label: "Best price", color: "success" },
  orange: { label: "Limited", color: "warning" },
  default: { label: "Standard", color: "default" },
};

// Soonest departure first. "Clear" restores this rather than dropping the sort
// altogether, so the table never falls back to the order the sources happened
// to be fetched in.
const DEFAULT_SORTING: MRT_SortingState = [{ id: "date", desc: false }];

/**
 * The table opens on catered places. Apartments, residences and chalets are a
 * different kind of holiday and would otherwise sit in the same price list
 * looking like cheap hotels.
 */
const DEFAULT_FILTERS: MRT_ColumnFiltersState = [
  { id: "propertyType", value: DEFAULT_PROPERTY_TYPES },
  // Most visitors are flying from Tel Aviv, so the table opens on the
  // packages that carry the flight. Belambra (accommodation only) and the
  // Ofir Tours rows whose inclusions vary sit behind one click.
  { id: "flights", value: ["included"] satisfies FlightStatus[] },
];

const DAY_MS = 86_400_000;

/** The return date, for showing a stay as a range rather than one date. */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Stay length for a row. Snapshots taken before the backend recorded `nights`
 * fall back to the source's fixed duration where one exists (Club Med always
 * requests 7-night stays); otherwise we show nothing rather than invent a number.
 */
function resolveNights(row: CombinedOfferRow): number | undefined {
  return row.nights ?? getBrand(row.brandSlug)?.defaultNights;
}

/** Sorted, de-duplicated dropdown options for a column. */
function toOptions(values: (string | undefined)[]): { label: string; value: string }[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
}

/**
 * The combined offers table: every operator's latest snapshot as one price list.
 *
 * The same component serves the home page and every brand page — a brand page
 * only sets `selectedBrands` in the store, which scopes the rows and drops the
 * Brand column. Filters, saved views and the party-size picker therefore live
 * here rather than in either page, so the two can't drift apart.
 */
export function BrandsTable() {
  // Opt this component out of React Compiler.
  //
  // Material React Table v3 builds its instance with useMaterialReactTable and
  // mutates that instance's options during render. The compiler assumes
  // render is pure, caches the state object it was handed, and the table then
  // never sees isLoading go false — it sits on skeleton rows forever, with its
  // loading overlay swallowing every click on the filters. Everything else in
  // the app is compiled; this one component is not.
  "use no memo";

  const { data, isLoading } = useLatestOffers();
  const selectedBrands = useAppStore((s) => s.selectedBrands);
  const searchText = useAppStore((s) => s.searchText);
  const setSearchText = useAppStore((s) => s.setSearchText);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING);
  // The size of party being shopped for. Offers are sold per room, so this
  // picks which offers are bookable at all — not just how a total is divided.
  const [party, setParty] = useState<PartyChoice>(2);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");

  const matchingRows = useMemo<CombinedOfferRow[]>(() => {
    let all: CombinedOfferRow[] =
      data?.flatMap((source) => source.data.map((row) => ({ ...row, brandSlug: source.source }))) ?? [];

    if (selectedBrands.length > 0) {
      all = all.filter((r) => selectedBrands.includes(r.brandSlug));
    }
    // Every word typed has to appear somewhere in the row, in any field and
    // in any order — see lib/table/search.ts. The English country name and
    // its code join the haystack because the stored country is Hebrew, and
    // "andorra" is what someone types.
    const query = searchText.trim();
    if (query) {
      all = all.filter((r) => {
        const badge = countryBadge(r.country);
        return matchesQuery(
          query,
          r.resort,
          r.hotel,
          r.board,
          r.country,
          badge.name,
          badge.code
        );
      });
    }
    return all;
  }, [data, selectedBrands, searchText]);

  // How many offers each party size has, so the picker can say so up front
  // rather than emptying the table without explanation.
  const partyCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of matchingRows) {
      const pax = paxOf(row);
      counts.set(pax, (counts.get(pax) ?? 0) + 1);
    }
    return counts;
  }, [matchingRows]);

  // An offer priced for two isn't a deal for four: operators sell a room, so
  // the picker chooses which offers exist, not how one total is divided.
  const rows = useMemo(
    () => matchingRows.filter((row) => fitsParty(row, party)),
    [matchingRows, party]
  );

  // Dropdown options come from the data itself, so new resorts and countries
  // appear as soon as a source starts returning them.
  const resortOptions = useMemo(() => toOptions(matchingRows.map((r) => r.resort)), [matchingRows]);
  const countryOptions = useMemo(
    () => toOptions(matchingRows.map((r) => r.country)),
    [matchingRows]
  );
  // One name per property, shared by every operator that sells it.
  const labels = useMemo(() => hotelLabels(matchingRows), [matchingRows]);
  const hotelOptions = useMemo(
    () => toOptions(matchingRows.map((r) => hotelLabelOf(r, labels))),
    [matchingRows, labels]
  );
  const typeOptions = useMemo(() => {
    const present = new Set(matchingRows.map((r) => propertyTypeOf(r)));
    return (Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[])
      .filter((t) => present.has(t))
      .map((t) => ({ label: `${PROPERTY_TYPE_ICON[t]} ${PROPERTY_TYPE_LABEL[t]}`, value: t }));
  }, [matchingRows]);
  const paxOptions = useMemo(
    () =>
      [...new Set(matchingRows.map((r) => paxOf(r)))]
        .sort((a, b) => a - b)
        .map((n) => ({ label: `${n} ${n === 1 ? "person" : "people"}`, value: String(n) })),
    [matchingRows]
  );
  const nightsOptions = useMemo(
    () =>
      [...new Set(matchingRows.map((r) => resolveNights(r)).filter((n): n is number => Boolean(n)))]
        .sort((a, b) => a - b)
        .map((n) => ({ label: `${n} nights`, value: String(n) })),
    [matchingRows]
  );

  // Load saved views, and re-apply whichever was last in use.
  //
  // Hydrating from localStorage has to happen after mount: reading it during
  // render would break the server pass and cause a hydration mismatch, so the
  // set-state-in-effect rule is knowingly waived for this block.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const all = [...buildBuiltInTemplates(), ...loadSavedTemplates()];
    setTemplates(all);
    const lastUsed = loadActiveTemplateId();
    const match = all.find((t) => t.id === lastUsed);
    if (match) {
      setActiveTemplateId(match.id);
      setColumnFilters(match.columnFilters);
      setSorting(match.sorting);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const applyTemplate = useCallback(
    (id: string) => {
      setActiveTemplateId(id);
      storeActiveTemplateId(id);
      const template = templates.find((t) => t.id === id);
      if (!template) return;
      setColumnFilters(template.columnFilters);
      setSorting(template.sorting);
    },
    [templates]
  );

  const handleSave = useCallback(
    (name: string) => {
      const next = saveTemplate(name, columnFilters, sorting);
      setTemplates([...buildBuiltInTemplates(), ...next]);
      const saved = next.find((t) => t.name === name.trim());
      if (saved) {
        setActiveTemplateId(saved.id);
        storeActiveTemplateId(saved.id);
      }
    },
    [columnFilters, sorting]
  );

  const handleDelete = useCallback((id: string) => {
    const next = deleteTemplate(id);
    setTemplates([...buildBuiltInTemplates(), ...next]);
    setActiveTemplateId("");
    storeActiveTemplateId("");
  }, []);

  const handleClear = useCallback(() => {
    setColumnFilters(DEFAULT_FILTERS);
    setSorting(DEFAULT_SORTING);
    setActiveTemplateId("");
    storeActiveTemplateId("");
  }, []);

  const columns = useMemo<MRT_ColumnDef<CombinedOfferRow>[]>(
    () => [
      {
        accessorKey: "brandSlug",
        header: "Brand",
        size: 150,
        Cell: ({ cell }) => {
          const brand = getBrand(cell.getValue<string>());
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                src={brand?.logoSrc}
                sx={{ bgcolor: brand?.color, width: 28, height: 28, fontSize: 11 }}
              >
                {brand?.initials}
              </Avatar>
              <Typography variant="body2">{brand?.name ?? cell.getValue<string>()}</Typography>
            </Box>
          );
        },
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => (
          <MultiSelectFilter
            column={column}
            options={BRANDS.map((b) => ({ label: b.name, value: b.slug }))}
          />
        ),
      },
      {
        accessorKey: "resort",
        header: "Resort",
        size: 190,
        // Hundreds of entries once every source is live, so the filter has a
        // search box of its own — see MultiSelectFilter.
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={resortOptions} />,
        // The flag and three-letter code ride along with the resort so the
        // country reads at a glance without spending a whole column on it.
        Cell: ({ row }) => {
          const badge = countryBadge(row.original.country);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
              {/* The name is the handle for the resort card: photo, where it
                  is, and how much piste and snow it has. */}
              <Box
                component="button"
                type="button"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  useResortCard.getState().open(row.original.resortKey, row.original.resort);
                }}
                sx={{
                  minWidth: 0,
                  p: 0,
                  border: "none",
                  bgcolor: "transparent",
                  color: "inherit",
                  font: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationColor: "transparent",
                  textUnderlineOffset: 3,
                  "&:hover": { textDecorationColor: COLORS.brand },
                }}
              >
                {row.original.resort}
              </Box>
              <Tooltip title={badge.name}>
                <Box
                  component="span"
                  aria-label={badge.name}
                  sx={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                    px: 0.6,
                    py: 0.1,
                    borderRadius: 1,
                    bgcolor: COLORS.frost,
                    border: `1px solid ${COLORS.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    color: "text.secondary",
                  }}
                >
                  <span aria-hidden>{badge.flag}</span>
                  {badge.code}
                </Box>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        // The property, kept out of the resort name so that grouping by resort
        // actually groups. Links to the offer when the operator gives us one.
        id: "hotel",
        header: "Hotel",
        size: 240,
        // The shared name, so one hotel reads and filters as one hotel however
        // its operator spelled it.
        accessorFn: (row) => hotelLabelOf(row, labels) ?? "",
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={hotelOptions} />,
        Cell: ({ row }) => {
          const { url, board } = row.original;
          const label = hotelLabelOf(row.original, labels) ?? "—";
          return (
            <Box>
              {url ? (
                <MuiLink
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ color: "text.primary", fontWeight: 500 }}
                >
                  {label}
                </MuiLink>
              ) : (
                label
              )}
              {board && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {board}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: "country",
        header: "Country",
        size: 150,
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => (
          <MultiSelectFilter
            column={column}
            options={countryOptions.map((o) => {
              const badge = countryBadge(o.value);
              return { ...o, label: `${badge.flag} ${badge.name}`.trim() };
            })}
          />
        ),
        Cell: ({ cell }) => {
          const badge = countryBadge(cell.getValue<string>());
          return `${badge.flag} ${badge.name}`.trim();
        },
      },
      {
        accessorKey: "date",
        header: "Dates",
        // Wide enough for the two date inputs of the range filter.
        size: 240,
        // A stay is a range, not a point: showing the return date saves the
        // reader doing date arithmetic against the nights column.
        Cell: ({ row }) => {
          const { date } = row.original;
          // Same fallback as the Nights column: older snapshots predate the
          // field, and the operator's fixed stay length fills the gap.
          const nights = resolveNights(row.original);
          return (
            <Box>
              <Box className="tabular" sx={{ fontWeight: 600 }}>
                {shortDate(date)}
                {nights ? ` → ${shortDate(addDays(date, nights))}` : ""}
              </Box>
              <Typography variant="caption" color="text.secondary" className="tabular">
                {date}
              </Typography>
            </Box>
          );
        },
        filterFn: (row, id, value) =>
          isWithinDateRange(row.getValue<string>(id), value as DateRangeValue | undefined),
        Filter: ({ column }) => <DateRangeFilter column={column} />,
      },
      {
        id: "nights",
        header: "Nights",
        size: 150,
        // Operators sell different trip lengths — a 3-night break and a week
        // aren't comparable on price alone, so this column earns its place.
        accessorFn: (row) => resolveNights(row) ?? 0,
        Cell: ({ row }) => {
          const nights = resolveNights(row.original);
          return nights ? `${nights}` : "—";
        },
        sortingFn: "basic",
        filterFn: (row, id, value) => isOneOf(String(row.getValue<number>(id)), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={nightsOptions} />,
      },
      {
        // Catered or self-catering. Apartments and chalets are hidden until
        // asked for, because they aren't comparable with a half-board hotel.
        id: "propertyType",
        header: "Type",
        size: 150,
        accessorFn: (row) => propertyTypeOf(row),
        Cell: ({ row }) => {
          const type = propertyTypeOf(row.original);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <span aria-hidden>{PROPERTY_TYPE_ICON[type]}</span>
              {PROPERTY_TYPE_LABEL[type]}
            </Box>
          );
        },
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={typeOptions} />,
      },
      {
        // How many people the operator sells this offer for. It's the unit the
        // price is quoted in, so it belongs on the row, not just in the picker.
        id: "pax",
        header: "People",
        size: 120,
        accessorFn: (row) => paxOf(row),
        sortingFn: "basic",
        Cell: ({ row }) => {
          const pax = paxOf(row.original);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <span aria-hidden>{pax === 1 ? "🧍" : "👥"}</span>
              <Box component="span" className="tabular">
                {pax}
              </Box>
            </Box>
          );
        },
        // Values are strings so a saved view survives a reload; the accessor
        // stays numeric so sorting still works.
        filterFn: (row, id, value) => isOneOf(String(row.getValue<number>(id)), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={paxOptions} />,
      },
      {
        // What the booking actually costs. Operators quote in different units,
        // so this is the one figure that means the same thing on every row.
        id: "total",
        header: "Total",
        size: 158,
        accessorFn: (row) => totalPrice(row),
        sortingFn: "basic",
        Cell: ({ row }) => (
          <Box>
            <Box className="tabular" sx={{ fontWeight: 700 }}>
              €{totalPrice(row.original).toLocaleString()}
            </Box>
            <Typography variant="caption" color="text.secondary">
              for {paxOf(row.original)}
            </Typography>
          </Box>
        ),
        filterFn: (row, id, value) =>
          isWithinNumberRange(row.getValue<number>(id), value as NumberRangeValue | undefined),
        Filter: ({ column }) => <NumberRangeFilter column={column} prefix="€" />,
      },
      {
        // The total split between the people it was sold for. With a size
        // picked that's every row's own party; on "any size" it's each row's.
        id: "perPerson",
        header: party === "any" ? "Each" : `Each (÷${party})`,
        size: 128,
        accessorFn: (row) => pricePerPerson(row, party === "any" ? paxOf(row) : party),
        sortingFn: "basic",
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <Box className="tabular">
            €
            {pricePerPerson(
              row.original,
              party === "any" ? paxOf(row.original) : party
            ).toLocaleString()}
          </Box>
        ),
      },
      {
        id: "open",
        header: "Open",
        size: 72,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => {
          const { url, resort, hotel } = row.original;
          if (!url) {
            // Rows collected before deep links existed simply have none; the
            // next nightly run fills them in.
            return (
              <Typography variant="caption" color="text.disabled">
                —
              </Typography>
            );
          }
          return (
            <Tooltip title="Open this offer on the operator's site">
              <IconButton
                size="small"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${hotel ?? resort} on the operator's site`}
              >
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      },
      {
        id: "board",
        header: "Meals",
        size: 140,
        accessorFn: (row) => boardFor(row.brandSlug, row.board),
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => (
          <MultiSelectFilter
            column={column}
            options={BOARD_ORDER.map((board) => ({ label: BOARD_LABEL[board], value: board }))}
          />
        ),
        // The operator's own words on hover: "ארוחת בוקר" and "Half board"
        // are the same thing, and only one of them is in the row.
        Cell: ({ row }) => {
          const board = boardFor(row.original.brandSlug, row.original.board) as BoardBasis;
          return (
            <Tooltip title={row.original.board ?? "The operator does not state the board on this offer."}>
              <Box component="span" sx={{ fontSize: 12.5, color: board === "unknown" ? COLORS.inkFaint : COLORS.ink }}>
                {BOARD_ICON[board]} {BOARD_LABEL[board]}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        id: "flights",
        header: "Package",
        size: 150,
        accessorFn: (row) => flightStatus(row.brandSlug, row.flights),
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => (
          <MultiSelectFilter
            column={column}
            options={(["included", "land-only", "unknown"] as FlightStatus[]).map((state) => ({
              label: FLIGHT_FILTER_LABEL[state],
              value: state,
            }))}
          />
        ),
        // What the price buys, in one cell: the operator's own answer on
        // flights, with the detail on hover.
        Cell: ({ row }) => {
          const state = flightStatus(row.original.brandSlug, row.original.flights);
          const detail = inclusionsFor(row.original.brandSlug);
          const colour =
            state === "included" ? COLORS.positive : state === "land-only" ? COLORS.inkMuted : COLORS.accent;
          return (
            <Tooltip title={detail?.note ?? "We have not established what this price includes."}>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: colour, fontSize: 12.5 }}>
                {state === "included" ? "✈" : state === "land-only" ? "🏨" : "?"} {FLIGHT_FILTER_LABEL[state]}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 126,
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => (
          <MultiSelectFilter
            column={column}
            options={Object.entries(STATUS_LABEL).map(([value, { label }]) => ({ label, value }))}
          />
        ),
        Cell: ({ cell }) => {
          const { label, color } = STATUS_LABEL[cell.getValue<OfferStatus>()];
          return <Chip label={label} size="small" color={color} variant="outlined" />;
        },
      },
    ],
    [resortOptions, countryOptions, nightsOptions, hotelOptions, paxOptions, typeOptions, labels, party]
  );

  // Visibility is user state, so it lives in a state hook with its own setter.
  // Passing a `useMemo` object into `state` froze it: every toggle in the
  // show/hide panel was overwritten on the next render, so nothing moved.
  //
  // Country is off by default because the resort cell already carries the flag
  // and code; it stays one click away in the show/hide panel.
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    brandSlug: true,
    // Country earns its place: the same hotel name occurs in several, and the
    // flag in the resort cell is a hint rather than something you can filter.
    country: true,
    // Status is a Club Med urgency flag the other five don't set, so it sits
    // in the show/hide panel rather than taking a column from everyone.
    status: false,
  });

  // On a brand page every row is the same operator, so the Brand column would
  // just repeat the page title. Route changes adjust it; a manual toggle after
  // that is the user's and is left alone.
  const onBrandPage = selectedBrands.length === 1;
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setColumnVisibility((prev) =>
      prev.brandSlug === !onBrandPage ? prev : { ...prev, brandSlug: !onBrandPage }
    );
  }, [onBrandPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const table = useMaterialReactTable({
    columns,
    data: rows,
    state: { isLoading, columnFilters, sorting, columnVisibility },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    enableGrouping: true,
    // The per-column kebab menu only repeats sorting and filtering, and it
    // squeezes the headers — sort arrows and the filter row stay.
    enableColumnActions: false,
    enableGlobalFilter: false, // search lives in the top bar instead
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    // The resize and reorder handles cost ~40px of every header, which was
    // squeezing the labels into "Ni…" and "Sta…". The per-column widths below
    // are already tuned, so neither handle earns its space.
    enableColumnResizing: false,
    enableColumnDragging: false,
    enableColumnOrdering: false,
    // Honour those widths literally instead of stretching columns to fill.
    layoutMode: "grid",
    initialState: {
      density: "compact",
      showColumnFilters: true,
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiTableContainerProps: { sx: { maxHeight: 560 } },
    // The sticky header must be fully opaque, header row and filter row alike,
    // or body rows scroll through it.
    muiTableHeadProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadRowProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadCellProps: {
      sx: {
        bgcolor: COLORS.frost,
        // The header is a column: label on top, filter pinned to the bottom.
        // Without this the taller filters (the two date inputs, the price
        // range) centred themselves and every header row sat at a different
        // height.
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 104,
        pt: 1.5,
        pb: 1,
        px: 1.25,
        "& .Mui-TableHeadCell-Content": { width: "100%", alignItems: "flex-start", minHeight: 30 },
        "& .Mui-TableHeadCell-Content-Labels": { width: "100%", gap: 0.25 },
        // Let a header read in full rather than clipping to an ellipsis.
        "& .Mui-TableHeadCell-Content-Wrapper": {
          fontSize: 13.5,
          fontWeight: 700,
          letterSpacing: "0.01em",
          whiteSpace: "normal",
          overflow: "visible",
          textOverflow: "clip",
        },
        "& .MuiCollapse-root": { width: "100%", marginTop: "auto" },
        "& .MuiInputBase-root": { fontSize: 13 },
        "& .MuiFormLabel-root": { fontSize: 12 },
      },
    },
    muiTableBodyCellProps: { sx: { fontSize: 13.5, px: 1.25 } },
    // The column name sits directly above every filter, so repeating it inside
    // the input only made the placeholder truncate.
    muiFilterTextFieldProps: { placeholder: "Filter" },
    muiTopToolbarProps: { sx: { bgcolor: COLORS.frost, borderBottom: `1px solid ${COLORS.border}` } },
    muiBottomToolbarProps: { sx: { bgcolor: COLORS.frost, borderTop: `1px solid ${COLORS.border}` } },
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
        <FilterTemplateBar
          templates={templates}
          activeId={activeTemplateId}
          columnFilters={columnFilters}
          sorting={sorting}
          onApply={applyTemplate}
          onSave={handleSave}
          onDelete={handleDelete}
          onClear={handleClear}
        />
        {/* Searching sits with the filters it works alongside, rather than
            in the page header away from the rows it affects. */}
        <TextField
          size="small"
          placeholder="Search resort, hotel, country…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ width: { xs: 190, sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: COLORS.inkFaint }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Tooltip title="Operators sell a room, not a seat. This shows only the offers priced for a party of this size.">
          <TextField
            select
            size="small"
            label="Travelling"
            value={String(party)}
            onChange={(e) => setParty(e.target.value === "any" ? "any" : Number(e.target.value))}
            sx={{ width: 170 }}
          >
            <MenuItem value="any">Any size ({matchingRows.length})</MenuItem>
            {/* Only sizes an operator actually sells — a greyed-out "5 people"
                every night is just noise. The list grows by itself if a
                source starts returning family rooms. */}
            {[...partyCounts.keys()].sort((a, b) => a - b).map((n) => (
              <MenuItem key={n} value={String(n)}>
                {n} {n === 1 ? "person" : "people"} ({partyCounts.get(n)})
              </MenuItem>
            ))}
          </TextField>
        </Tooltip>
      </Stack>
    ),
    renderEmptyRowsFallback: () => (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          {rows.length === 0 && matchingRows.length > 0
            ? `No operator sells a package for ${party} people right now — try another party size.`
            : "No offers match these filters — try clearing them or widening the date range."}
        </Typography>
      </Box>
    ),
  });

  return <MaterialReactTable table={table} />;
}
