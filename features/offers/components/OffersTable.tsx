"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleFullScreenButton,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_PaginationState,
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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
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
import { pct as formatPct, shortDate } from "@/shared/format/formatters";
import { buildSeriesIndex, offerKey } from "@/features/analytics/lib/deriveSeries";
import { useChartColors, changeColor } from "@/shared/charts/lib/palette";
import { PriceSparkline, type SparklinePoint } from "@/features/offers/components/PriceSparkline";
import {
  COLUMN_ORDER,
  COLUMN_WIDTH,
  BOTTOM_BAR_MIN_PX,
  GLASS_BLUR,
  FILTER_ROW_ATTR,
  PAGE_SIZE,
  PINNED_COLUMNS,
  SCROLL_CHUNK,
  SCROLL_REACH_PX,
  PRICE_COLUMNS,
  PRICE_TINT_PCT,
  UNCHANGED_PCT,
} from "@/features/offers/constants";
import { matchesWords, queryWords, searchHaystack } from "@/features/offers/lib/offerSearch";
import { useAllOffers, useLatestOffers } from "@/features/prices/hooks/usePrices";
import { buildOffers, type Offer } from "@/features/offers/lib/offerModel";
import { OfferPanel } from "@/features/offers/offer-detail/components/OfferPanel";
import { FiltersToggle } from "@/features/offers/components/FiltersToggle";
import { TableSearch } from "@/features/offers/components/TableSearch";
import { useFilterRow } from "@/features/offers/hooks/useFilterRow";
import { filterRowPaperSx } from "@/features/offers/lib/filterRowSx";
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

const priceBlockSx = (columnId: string, surface: "head" | "body") => {
  if (!PRICE_COLUMNS.includes(columnId)) return {};
  const tint = PRICE_TINT_PCT[surface];
  return {
    textAlign: "center" as const,
    ...(surface === "body" ? { justifyContent: "center" } : {}),
    bgcolor:
      surface === "head"
        ? `color-mix(in srgb, ${COLORS.brand} ${tint}%, ${COLORS.frost})`
        : `color-mix(in srgb, ${COLORS.brand} ${tint}%, transparent)`,
    boxShadow:
      columnId === "total"
        ? `inset 1px 0 0 ${COLORS.borderStrong}, inset -1px 0 0 ${COLORS.inkFaint}`
        : `inset -1px 0 0 ${COLORS.borderStrong}`,
  };
};

const pinnedSx = (columnId: string, surface: "head" | "body") => {
  if (!PINNED_COLUMNS.includes(columnId)) return {};
  return {
    bgcolor: surface === "head" ? COLORS.frost : "inherit",
    ...(surface === "body" ? { backdropFilter: GLASS_BLUR } : {}),
    opacity: 1,
    zIndex: surface === "head" ? 4 : 3,
    '&[data-pinned="true"]': { "&:before": { backgroundColor: "transparent", boxShadow: "none" } },
  };
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
  const chartColors = useChartColors();
  const [openOfferKey, setOpenOfferKey] = useState<string | null>(null);
  const selectedBrands = useOffersBrowsing((s) => s.selectedBrands);
  const searchText = useOffersBrowsing((s) => s.searchText);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING);
  const [party, setParty] = useState<PartyChoice>(2);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");

  const brandRows = useMemo<BrandedPriceRow[]>(() => {
    const all: BrandedPriceRow[] =
      data?.flatMap((source) => source.data.map((row) => ({ ...row, brandSlug: source.source }))) ?? [];
    return selectedBrands.length > 0 ? all.filter((r) => selectedBrands.includes(r.brandSlug)) : all;
  }, [data, selectedBrands]);

  const haystacks = useMemo(
    () =>
      brandRows.map((r) => {
        const badge = countryBadge(r.country);
        return searchHaystack(r.resort, r.hotel, r.board, r.country, badge.name, badge.code);
      }),
    [brandRows]
  );

  const matchingRows = useMemo<BrandedPriceRow[]>(() => {
    const words = queryWords(searchText);
    if (words.length === 0) return brandRows;
    return brandRows.filter((_, i) => matchesWords(words, haystacks[i]));
  }, [brandRows, haystacks, searchText]);

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

  const watchedByKey = useMemo(() => {
    if (!history.data) return new Map<string, { points: SparklinePoint[]; movePct: number | null }>();
    const index = buildSeriesIndex(history.data);
    const watched = new Map<string, { points: SparklinePoint[]; movePct: number | null }>();
    for (const [key, series] of index.byKey) {
      const points = series.points.map((point) => ({ day: point.day, total: point.priceEur }));
      const first = points[0]?.total ?? 0;
      const last = points[points.length - 1]?.total ?? 0;
      watched.set(key, {
        points,
        movePct: points.length > 1 && first > 0 ? ((last - first) / first) * 100 : null,
      });
    }
    return watched;
  }, [history.data]);

  const watchedFor = useCallback(
    (row: BrandedPriceRow) =>
      watchedByKey.get(offerKey(row.brandSlug, row.resortId, row.date, row.nights)) ?? null,
    [watchedByKey]
  );
  const openOffer = useMemo(
    () => detailOffers.find((offer) => offer.key === openOfferKey) ?? null,
    [detailOffers, openOfferKey]
  );

  const resortOptions = useMemo(() => toOptions(brandRows.map((r) => r.resort)), [brandRows]);
  const countryOptions = useMemo(
    () => toOptions(brandRows.map((r) => r.country)),
    [brandRows]
  );
  const labels = useMemo(() => hotelLabels(brandRows), [brandRows]);
  const hotelOptions = useMemo(
    () => toOptions(brandRows.map((r) => hotelLabelOf(r, labels))),
    [brandRows, labels]
  );
  const typeOptions = useMemo(() => {
    const present = new Set(brandRows.map((r) => propertyTypeOf(r)));
    return (Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[])
      .filter((t) => present.has(t))
      .map((t) => ({ label: `${PROPERTY_TYPE_ICON[t]} ${PROPERTY_TYPE_LABEL[t]}`, value: t }));
  }, [brandRows]);
  const paxOptions = useMemo(
    () =>
      [...new Set(brandRows.map((r) => paxOf(r)))]
        .sort((a, b) => a - b)
        .map((n) => ({ label: `${n} ${n === 1 ? "person" : "people"}`, value: String(n) })),
    [brandRows]
  );
  const nightsOptions = useMemo(
    () =>
      [...new Set(brandRows.map((r) => resolveNights(r)).filter((n): n is number => Boolean(n)))]
        .sort((a, b) => a - b)
        .map((n) => ({ label: `${n} nights`, value: String(n) })),
    [brandRows]
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
        size: COLUMN_WIDTH["brand"],
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
        size: COLUMN_WIDTH["resort"],
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
        size: COLUMN_WIDTH["hotel"],
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
        size: COLUMN_WIDTH["country"],
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
        size: COLUMN_WIDTH["dates"],
        Cell: ({ row }) => {
          const { date } = row.original;
          const nights = resolveNights(row.original);
          return (
            <Box>
              <Box className="tabular" sx={{ fontWeight: 600 }}>
                {shortDate(date)}
                {nights ? ` → ${shortDate(addDays(date, nights))}` : ""}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
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
        size: COLUMN_WIDTH["nights"],
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
        size: COLUMN_WIDTH["type"],
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
        size: COLUMN_WIDTH["pax"],
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
        size: COLUMN_WIDTH["total"],
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
        size: COLUMN_WIDTH["perPerson"],
        accessorFn: (row) => pricePerPerson(row, party === "any" ? paxOf(row) : party),
        sortingFn: "basic",
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <Box className="tabular" sx={{ fontWeight: 600 }}>
            €
            {pricePerPerson(
              row.original,
              party === "any" ? paxOf(row.original) : party
            ).toLocaleString()}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              each
            </Typography>
          </Box>
        ),
      },
      {
        id: "change",
        header: "Since first seen",
        size: COLUMN_WIDTH["change"],
        enableColumnFilter: false,
        accessorFn: (row) => watchedFor(row)?.movePct ?? null,
        sortingFn: (a, b, id) => {
          const left = a.getValue<number | null>(id);
          const right = b.getValue<number | null>(id);
          if (left === null) return right === null ? 0 : 1;
          if (right === null) return -1;
          return left - right;
        },
        Cell: ({ row }) => {
          if (history.isLoading) {
            return (
              <Typography variant="caption" color="text.disabled">
                …
              </Typography>
            );
          }
          const watched = watchedFor(row.original);
          const move = watched?.movePct ?? null;
          const settled = move !== null && Math.abs(move) < UNCHANGED_PCT;
          return (
            <Tooltip
              title={
                watched
                  ? `${watched.points.length} ${watched.points.length === 1 ? "night" : "nights"} watched`
                  : "Not seen on an earlier night yet."
              }
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <PriceSparkline points={watched?.points ?? []} movePct={move} />
                <Box
                  className="tabular"
                  sx={{
                    fontSize: 12.5,
                    fontWeight: settled ? 400 : 600,
                    color:
                      move === null || settled ? COLORS.inkFaint : changeColor(move, chartColors),
                  }}
                >
                  {move === null ? "—" : settled ? "0%" : formatPct(move)}
                </Box>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        id: "open",
        header: "",
        size: COLUMN_WIDTH["open"],
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
        size: COLUMN_WIDTH["board"],
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
        size: COLUMN_WIDTH["flights"],
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
        size: COLUMN_WIDTH["status"],
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
    [
      resortOptions,
      countryOptions,
      nightsOptions,
      hotelOptions,
      paxOptions,
      typeOptions,
      labels,
      party,
      watchedFor,
      history.isLoading,
      chartColors,
    ]
  );

  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    brandSlug: true,
    country: true,
    pax: false,
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

  // Two ways through a long result set. Scrolling is the default because the
  // question is almost always "what else is there" rather than "what is on
  // page four"; paging stays because a fixed page is the only way to hold a
  // place while comparing. Both run off the same client-side row model — the
  // scroll mode simply grows the page until the rows run out.
  const [rowMode, setRowMode] = useState<"scroll" | "pages">("scroll");
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: SCROLL_CHUNK,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const resultShape = { rowMode, columnFilters, sorting, searchText, party };
  const [shownShape, setShownShape] = useState(resultShape);
  const shapeChanged = (Object.keys(resultShape) as (keyof typeof resultShape)[]).some(
    (key) => resultShape[key] !== shownShape[key]
  );
  if (shapeChanged) {
    setShownShape(resultShape);
    setPagination({ pageIndex: 0, pageSize: rowMode === "scroll" ? SCROLL_CHUNK : PAGE_SIZE });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [rowMode, columnFilters, sorting, searchText, party]);

  // rows.length is the unfiltered total, so it only ever over-estimates what
  // is left: the guard stops the page growing forever, and the row model
  // still decides how many of those rows a filter lets through.
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (rowMode !== "scroll") return;
      const el = event.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_REACH_PX) return;
      setPagination((prev) =>
        prev.pageSize >= rows.length
          ? prev
          : { pageIndex: prev.pageIndex, pageSize: prev.pageSize + SCROLL_CHUNK }
      );
    },
    [rowMode, rows.length]
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    state: { isLoading, columnFilters, sorting, columnVisibility, showColumnFilters: true, pagination },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onShowColumnFiltersChange: (updater: boolean | ((prev: boolean) => boolean)) => {
      const filterRow = useFilterRow.getState();
      filterRow.setOpen(typeof updater === "function" ? updater(filterRow.open) : updater);
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    enableBottomToolbar: true,
    enableGrouping: true,
    enableColumnActions: false,
    enableGlobalFilter: false, 
    enableColumnFilters: true,
    enableStickyHeader: true,
    enableDensityToggle: false,
    enableColumnPinning: true,
    renderToolbarInternalActions: ({ table: instance }) => (
      <>
        <MRT_ShowHideColumnsButton table={instance} />
        <MRT_ToggleFullScreenButton table={instance} />
      </>
    ),
    enableColumnResizing: false,
    enableColumnDragging: false,
    enableColumnOrdering: false,
    layoutMode: "grid",
    initialState: {
      density: "compact",
      columnOrder: COLUMN_ORDER,
      columnPinning: { left: PINNED_COLUMNS },
    },
    muiTablePaperProps: {
      sx: {
        ...filterRowPaperSx,
        position: "relative",
        isolation: "isolate",
        bgcolor: "transparent",
        backgroundImage: "none",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          zIndex: -1,
          borderRadius: "inherit",
          bgcolor: COLORS.glass,
          backdropFilter: GLASS_BLUR,
          pointerEvents: "none",
        },
      },
    },
    muiTableContainerProps: { ref: scrollRef, onScroll: handleScroll, sx: { maxHeight: 560 } },
    muiTableHeadProps: { sx: { bgcolor: COLORS.frost, opacity: 1 } },
    muiTableHeadRowProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadCellProps: ({ column }) => {
      const centred = PRICE_COLUMNS.includes(column.id);
      return {
        sx: {
          bgcolor: COLORS.frost,
          display: "flex",
          flexDirection: "column",
          px: 1.25,
          "& .Mui-TableHeadCell-Content": {
            width: "100%",
            ...(centred ? { justifyContent: "center" } : {}),
          },
          "& .Mui-TableHeadCell-Content-Labels": {
            width: centred ? "auto" : "100%",
            gap: 0.25,
            ...(centred ? { justifyContent: "center" } : {}),
          },
          "& .Mui-TableHeadCell-Content-Wrapper": {
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: "0.01em",
            lineHeight: 1.25,
            overflow: "visible",
            textOverflow: "clip",
            ...(centred ? { textAlign: "center" as const } : {}),
          },
          "& .MuiInputBase-root": { fontSize: 13 },
          "& .MuiFormLabel-root": { fontSize: 12 },
          ...priceBlockSx(column.id, "head"),
          ...pinnedSx(column.id, "head"),
        },
      };
    },
    muiTableBodyCellProps: ({ column }) => ({
      sx: {
        fontSize: 13.5,
        px: 1.25,
        ...priceBlockSx(column.id, "body"),
        ...pinnedSx(column.id, "body"),
      },
    }),
    muiTableBodyRowProps: ({ row }) => {
      const offer = row.original as BrandedPriceRow | undefined;
      if (!offer?.resortId) return {};
      const open = () => setOpenOfferKey(offerDetailKey(offer));
      return {
        onClick: open,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if ((event.target as HTMLElement).closest("a, button")) return;
          event.preventDefault();
          open();
        },
        tabIndex: 0,
        role: "button",
        "aria-label": `Open ${offer.hotel ?? offer.resort}, departing ${offer.date}`,
        sx: {
          cursor: "pointer",
          bgcolor: "transparent",
          "&:hover": { bgcolor: `color-mix(in srgb, ${COLORS.frost} 75%, transparent)` },
          "&:focus-visible": { outline: `2px solid ${COLORS.brand}`, outlineOffset: "-2px" },
        },
      };
    },
    muiFilterTextFieldProps: { placeholder: "Filter" },
    muiTopToolbarProps: {
      sx: {
        bgcolor: `color-mix(in srgb, ${COLORS.frost} 70%, transparent)`,
        borderBottom: `1px solid ${COLORS.border}`,
      },
    },
    muiBottomToolbarProps: {
      sx: {
        bgcolor: `color-mix(in srgb, ${COLORS.frost} 70%, transparent)`,
        borderTop: `1px solid ${COLORS.border}`,
        minHeight: `${BOTTOM_BAR_MIN_PX}px`,
        "& > .MuiBox-root": { py: 0.25 },
        "& .MuiTablePagination-root": { minHeight: 0, px: 1, py: 0 },
      },
    },
    muiPaginationProps: { showFirstButton: true, showLastButton: true },
    renderBottomToolbarCustomActions: () => (
      <ToggleButtonGroup
        exclusive
        size="small"
        value={rowMode}
        onChange={(_, next: "scroll" | "pages" | null) => next && setRowMode(next)}
        sx={{
          ml: 1,
          "& .MuiToggleButton-root": {
            borderRadius: 999,
            px: 1.5,
            py: 0.25,
            fontSize: 12.5,
            textTransform: "none",
          },
        }}
      >
        <ToggleButton value="scroll">Endless scroll</ToggleButton>
        <ToggleButton value="pages">Pages</ToggleButton>
      </ToggleButtonGroup>
    ),
    renderTopToolbarCustomActions: () => (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
        <FiltersToggle count={columnFilters.length} />
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
        <TableSearch />
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

  useEffect(() => {
    const paper = table.refs.tablePaperRef;
    const apply = (open: boolean) =>
      paper.current?.setAttribute(FILTER_ROW_ATTR, open ? "open" : "closed");
    apply(useFilterRow.getState().open);
    return useFilterRow.subscribe((state) => apply(state.open));
  }, [table]);

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
