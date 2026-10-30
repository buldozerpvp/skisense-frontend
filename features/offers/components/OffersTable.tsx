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
import { COLORS } from "@/shared/design/tokens";
import {
  fitsParty,
  paxOf,
  pricePerPerson,
  totalPrice,
  type PartyChoice,
} from "@/features/offers/lib/pricing";
import { countryBadge } from "@/features/offers/lib/countryBadge";
import { useResortCard } from "@/features/resorts/hooks/useResortCard";
import { FLIGHT_FILTER_LABEL, flightStatus, inclusionsFor, type FlightStatus } from "@/features/offers/inclusions/lib/packageInclusions";
import { BOARD_ICON, BOARD_LABEL, BOARD_ORDER, boardFor, type BoardBasis } from "@/features/offers/inclusions/lib/board";
import {
  DEFAULT_PROPERTY_TYPES,
  PROPERTY_TYPE_ICON,
  PROPERTY_TYPE_LABEL,
  hotelLabelOf,
  hotelLabels,
  propertyTypeOf,
} from "@/features/offers/lib/hotelLabels";
import { MultiSelectFilter, isOneOf } from "@/features/offers/filtering/components/MultiSelectFilter";
import { shortDate } from "@/shared/format/formatters";
import { matchesQuery } from "@/features/offers/lib/offerSearch";
import { useAllOffers, useLatestOffers } from "@/features/prices/hooks/usePrices";
import { buildOffers, type Offer } from "@/features/offers/lib/offerModel";
import { OfferPanel } from "@/features/offers/offer-detail/components/OfferPanel";
import { useOffersBrowsing } from "@/features/offers/hooks/useOffersBrowsing";
import { BRANDS, getBrand } from "@/features/brands/constants";
import type { OfferStatus, PriceRow, PropertyType } from "@/features/prices/lib/priceTypes";
import { DateRangeFilter, isWithinDateRange, type DateRangeValue } from "@/features/offers/filtering/components/DateRangeFilter";
import {
  NumberRangeFilter,
  isWithinNumberRange,
  type NumberRangeValue,
} from "@/features/offers/filtering/components/NumberRangeFilter";
import { FilterTemplateBar } from "@/features/offers/filtering/components/FilterTemplateBar";
import {
  buildBuiltInTemplates,
  deleteTemplate,
  loadActiveTemplateId,
  loadSavedTemplates,
  saveTemplate,
  storeActiveTemplateId,
  type FilterTemplate,
} from "@/features/offers/filtering/lib/filterTemplates";

type BrandedPriceRow = PriceRow & { brandSlug: string };

const STATUS_LABEL: Record<OfferStatus, { label: string; color: "success" | "warning" | "default" }> = {
  green: { label: "Best price", color: "success" },
  orange: { label: "Limited", color: "warning" },
  default: { label: "Standard", color: "default" },
};

const DEFAULT_SORTING: MRT_SortingState = [{ id: "date", desc: false }];

const DEFAULT_FILTERS: MRT_ColumnFiltersState = [
  { id: "propertyType", value: DEFAULT_PROPERTY_TYPES },
  { id: "flights", value: ["included"] satisfies FlightStatus[] },
];

const DAY_MS = 86_400_000;

const addDays = (date: string, days: number): string => {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
};

const resolveNights = (row: BrandedPriceRow): number | undefined => {
  return row.nights ?? getBrand(row.brandSlug)?.defaultNights;
};

const toOptions = (values: (string | undefined)[]): { label: string; value: string }[] => {
  return [...new Set(values.filter((v): v is string => Boolean(v)))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
};

export const OffersTable = () => {
  "use no memo";

  const { data, isLoading } = useLatestOffers();
  const history = useAllOffers();
  const [openOfferKey, setOpenOfferKey] = useState<string | null>(null);
  const selectedBrands = useOffersBrowsing((s) => s.selectedBrands);
  const searchText = useOffersBrowsing((s) => s.searchText);
  const setSearchText = useOffersBrowsing((s) => s.setSearchText);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING);
  const [party, setParty] = useState<PartyChoice>(2);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");

  const matchingRows = useMemo<BrandedPriceRow[]>(() => {
    let all: BrandedPriceRow[] =
      data?.flatMap((source) => source.data.map((row) => ({ ...row, brandSlug: source.source }))) ?? [];

    if (selectedBrands.length > 0) {
      all = all.filter((r) => selectedBrands.includes(r.brandSlug));
    }
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

  const partyCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of matchingRows) {
      const pax = paxOf(row);
      counts.set(pax, (counts.get(pax) ?? 0) + 1);
    }
    return counts;
  }, [matchingRows]);

  const rows = useMemo(
    () => matchingRows.filter((row) => fitsParty(row, party)),
    [matchingRows, party]
  );

  const detailOffers = useMemo(() => buildOffers(data, history.data), [data, history.data]);
  const openOffer = useMemo(
    () => detailOffers.find((offer) => offer.key === openOfferKey) ?? null,
    [detailOffers, openOfferKey]
  );

  const resortOptions = useMemo(() => toOptions(matchingRows.map((r) => r.resort)), [matchingRows]);
  const countryOptions = useMemo(
    () => toOptions(matchingRows.map((r) => r.country)),
    [matchingRows]
  );
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

  const columns = useMemo<MRT_ColumnDef<BrandedPriceRow>[]>(
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
        filterFn: (row, id, value) => isOneOf(row.getValue<string>(id), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={resortOptions} />,
        Cell: ({ row }) => {
          const badge = countryBadge(row.original.country);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
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
        id: "hotel",
        header: "Hotel",
        size: 240,
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
        size: 336,
        Cell: ({ row }) => {
          const { date } = row.original;
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
        filterFn: (row, id, value) => isOneOf(String(row.getValue<number>(id)), value),
        Filter: ({ column }) => <MultiSelectFilter column={column} options={paxOptions} />,
      },
      {
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

  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    brandSlug: true,
    country: true,
    status: false,
  });

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
    enableColumnActions: false,
    enableGlobalFilter: false, 
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableColumnResizing: false,
    enableColumnDragging: false,
    enableColumnOrdering: false,
    layoutMode: "grid",
    initialState: {
      density: "compact",
      showColumnFilters: true,
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiTableContainerProps: { sx: { maxHeight: 560 } },
    muiTableHeadProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadRowProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadCellProps: {
      sx: {
        bgcolor: COLORS.frost,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 104,
        pt: 1.5,
        pb: 1,
        px: 1.25,
        "& .Mui-TableHeadCell-Content": { width: "100%", alignItems: "flex-start", minHeight: 30 },
        "& .Mui-TableHeadCell-Content-Labels": { width: "100%", gap: 0.25 },
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
    muiTableBodyRowProps: ({ row }) => {
      const offer = row.original as BrandedPriceRow | undefined;
      if (!offer?.resortId) return {};
      return {
        onClick: () => setOpenOfferKey(offerDetailKey(offer)),
        sx: {
          cursor: "pointer",
          "&:hover td": { bgcolor: COLORS.frost },
        },
      };
    },
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

  return (
    <>
      <MaterialReactTable table={table} />
      <OfferPanel
        offer={openOffer}
        siblings={detailOffers}
        surface="drawer"
        onClose={() => setOpenOfferKey(null)}
        onPick={(offer: Offer) => setOpenOfferKey(offer.key)}
      />
    </>
  );
};

const offerDetailKey = (row: BrandedPriceRow): string => {
  return [
    row.brandSlug,
    row.resortId,
    row.hotel ?? "",
    row.date,
    row.nights ?? "?",
    row.priceEur,
  ].join("|");
};
