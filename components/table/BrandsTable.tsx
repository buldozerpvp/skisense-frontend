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
  Stack,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { COLORS } from "@/lib/design/tokens";
import {
  PARTY_SIZES,
  fitsParty,
  paxOf,
  pricePerPerson,
  totalPrice,
  type PartyChoice,
} from "@/lib/table/pricing";
import { countryBadge } from "@/lib/table/countries";
import { shortDate } from "@/lib/analytics/format";
import { useLatestOffers } from "@/lib/query/usePrices";
import { useAppStore } from "@/lib/store/useAppStore";
import { BRANDS, getBrand } from "@/lib/brands/config";
import type { OfferStatus, PriceRow } from "@/lib/brands/types";
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

const STATUS_LABEL: Record<OfferStatus, { label: string; color: "success" | "warning" | "default" }> = {
  green: { label: "Best price", color: "success" },
  orange: { label: "Limited", color: "warning" },
  default: { label: "Standard", color: "default" },
};

const DEFAULT_SORTING: MRT_SortingState = [{ id: "date", desc: false }];

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

export function BrandsTable() {
  const { data, isLoading } = useLatestOffers();
  const selectedBrands = useAppStore((s) => s.selectedBrands);
  const searchText = useAppStore((s) => s.searchText);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
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
    const query = searchText.trim().toLowerCase();
    if (query) {
      all = all.filter(
        (r) =>
          r.resort.toLowerCase().includes(query) ||
          r.country.toLowerCase().includes(query) ||
          (r.hotel?.toLowerCase().includes(query) ?? false)
      );
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
  const hotelOptions = useMemo(() => toOptions(matchingRows.map((r) => r.hotel)), [matchingRows]);
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
    setColumnFilters([]);
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
        filterVariant: "multi-select",
        filterSelectOptions: BRANDS.map((b) => ({ label: b.name, value: b.slug })),
      },
      {
        accessorKey: "resort",
        header: "Resort",
        size: 190,
        // Autocomplete rather than a plain select: the list runs to hundreds of
        // properties once every source is live, so it needs type-ahead.
        filterVariant: "autocomplete",
        filterSelectOptions: resortOptions,
        // The flag and three-letter code ride along with the resort so the
        // country reads at a glance without spending a whole column on it.
        Cell: ({ row }) => {
          const badge = countryBadge(row.original.country);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
              <Box component="span" sx={{ minWidth: 0 }}>
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
        accessorKey: "hotel",
        header: "Hotel",
        size: 220,
        filterVariant: "autocomplete",
        filterSelectOptions: hotelOptions,
        Cell: ({ row }) => {
          const { hotel, url, board } = row.original;
          const label = hotel ?? "—";
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
        size: 130,
        filterVariant: "multi-select",
        filterSelectOptions: countryOptions,
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
        filterVariant: "multi-select",
        filterSelectOptions: nightsOptions,
        // Options are strings so they survive a round trip through a saved
        // view; the accessor stays numeric so sorting still works.
        filterFn: (row, id, value) => {
          const selected = value as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(String(row.getValue<number>(id)));
        },
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
        filterVariant: "multi-select",
        filterSelectOptions: paxOptions,
        // Same string round-trip as Nights, so a saved view survives a reload.
        filterFn: (row, id, value) => {
          const selected = value as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(String(row.getValue<number>(id)));
        },
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
        accessorKey: "status",
        header: "Status",
        size: 126,
        filterVariant: "select",
        filterSelectOptions: Object.entries(STATUS_LABEL).map(([value, { label }]) => ({ label, value })),
        Cell: ({ cell }) => {
          const { label, color } = STATUS_LABEL[cell.getValue<OfferStatus>()];
          return <Chip label={label} size="small" color={color} variant="outlined" />;
        },
      },
    ],
    [resortOptions, countryOptions, nightsOptions, hotelOptions, paxOptions, party]
  );

  // Visibility is user state, so it lives in a state hook with its own setter.
  // Passing a `useMemo` object into `state` froze it: every toggle in the
  // show/hide panel was overwritten on the next render, so nothing moved.
  //
  // Country is off by default because the resort cell already carries the flag
  // and code; it stays one click away in the show/hide panel.
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    brandSlug: true,
    country: false,
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
            {PARTY_SIZES.map((n) => (
              <MenuItem key={n} value={String(n)} disabled={!partyCounts.get(n)}>
                {n} {n === 1 ? "person" : "people"} ({partyCounts.get(n) ?? 0})
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
