"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  Badge,
  Box,
  Button,
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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
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
  FILTER_ROW_WIDTH,
  HEADER_CONTENT_MIN_PX,
  HEADER_HEIGHT_PX,
  PAGE_SIZE,
  PINNED_COLUMNS,
  WIDTH_KEY_BY_COLUMN_ID,
  SCROLL_CHUNK,
  SCROLL_REACH_PX,
  PRICE_COLUMNS,
  PRICE_TINT_PCT,
  UNCHANGED_PCT,
} from "@/features/offers/constants";
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

const priceBlockSx = (columnId: string, surface: "head" | "body") => {
  if (!PRICE_COLUMNS.includes(columnId)) return {};
  const tint = PRICE_TINT_PCT[surface];
  return {
    textAlign: "center" as const,
    justifyContent: "center",
    ...(surface === "head"
      ? {
          "& .Mui-TableHeadCell-Content": { width: "100%", justifyContent: "center", alignItems: "center" },
          "& .Mui-TableHeadCell-Content-Labels": { width: "auto", justifyContent: "center" },
          "& .Mui-TableHeadCell-Content-Wrapper": { textAlign: "center" as const },
        }
      : {}),
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
    zIndex: surface === "head" ? 4 : 3,
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
  const setSearchText = useOffersBrowsing((s) => s.setSearchText);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING);
  const [party, setParty] = useState<PartyChoice>(2);
  // The button answers at once and the table catches up. Toggling the filter
  // row rebuilds every column definition, because the widths change, and that
  // re-renders every visible cell — around 150 rows by 15 columns — so the
  // click used to sit there for half a second before the button even looked
  // pressed. `filtersWanted` is what the button draws itself from, so it flips
  // immediately; `showColumnFilters` is what the table reads, and it moves
  // inside a transition React is free to interrupt.
  const [filtersWanted, setFiltersWanted] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [, startFilterTransition] = useTransition();

  const applyShowFilters = useCallback((next: boolean) => {
    setFiltersWanted(next);
    startFilterTransition(() => setShowColumnFilters(next));
  }, []);
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

  // The filter row needs wider columns, but a width that lives in the column
  // definitions makes every toggle rebuild all fifteen of them and re-render
  // every visible cell. MRT reads widths from `columnSizing` instead, which
  // only rewrites CSS variables on the table element — no definition is
  // touched, no cell re-renders, and opening the filters is immediate.
  const columnSizing = useMemo(() => {
    const sizing: Record<string, number> = {};
    for (const [columnId, key] of Object.entries(WIDTH_KEY_BY_COLUMN_ID)) {
      sizing[columnId] = showColumnFilters
        ? FILTER_ROW_WIDTH[key] ?? COLUMN_WIDTH[key]
        : COLUMN_WIDTH[key];
    }
    return sizing;
  }, [showColumnFilters]);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: rowMode === "scroll" ? SCROLL_CHUNK : PAGE_SIZE });
    scrollRef.current?.scrollTo({ top: 0 });
  }, [rowMode, columnFilters, sorting, searchText, party]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    state: { isLoading, columnFilters, sorting, columnVisibility, showColumnFilters, pagination, columnSizing },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onShowColumnFiltersChange: (updater: boolean | ((prev: boolean) => boolean)) =>
      applyShowFilters(typeof updater === "function" ? updater(filtersWanted) : updater),
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
    muiTableContainerProps: { ref: scrollRef, onScroll: handleScroll, sx: { maxHeight: 560 } },
    muiTableHeadProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadRowProps: { sx: { bgcolor: COLORS.frost } },
    muiTableHeadCellProps: ({ column }) => ({
      sx: {
        bgcolor: COLORS.frost,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: showColumnFilters ? HEADER_HEIGHT_PX.withFilters : HEADER_HEIGHT_PX.bare,
        pt: showColumnFilters ? 1.5 : 0.5,
        pb: showColumnFilters ? 1 : 0.5,
        px: 1.25,
        "& .Mui-TableHeadCell-Content": {
          width: "100%",
          alignItems: "flex-start",
          minHeight: showColumnFilters ? HEADER_CONTENT_MIN_PX.withFilters : HEADER_CONTENT_MIN_PX.bare,
        },
        "& .Mui-TableHeadCell-Content-Labels": { width: "100%", gap: 0.25 },
        "& .Mui-TableHeadCell-Content-Wrapper": {
          fontSize: 13.5,
          fontWeight: 700,
          letterSpacing: "0.01em",
          lineHeight: 1.25,
          whiteSpace: showColumnFilters ? "normal" : "nowrap",
          overflow: "visible",
          textOverflow: "clip",
        },
        "& .MuiCollapse-root": { width: "100%", marginTop: "auto" },
        "& .MuiInputBase-root": { fontSize: 13 },
        "& .MuiFormLabel-root": { fontSize: 12 },
        ...priceBlockSx(column.id, "head"),
        ...pinnedSx(column.id, "head"),
      },
    }),
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
          bgcolor: COLORS.surface,
          "&:hover": { bgcolor: COLORS.frost },
          "&:focus-visible": { outline: `2px solid ${COLORS.brand}`, outlineOffset: "-2px" },
        },
      };
    },
    muiFilterTextFieldProps: { placeholder: "Filter" },
    muiTopToolbarProps: { sx: { bgcolor: COLORS.frost, borderBottom: `1px solid ${COLORS.border}` } },
    muiBottomToolbarProps: {
      sx: {
        bgcolor: COLORS.frost,
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
        <Badge badgeContent={columnFilters.length} color="primary" overlap="rectangular">
          <Button
            size="small"
            variant={filtersWanted ? "contained" : "outlined"}
            startIcon={<FilterListRoundedIcon fontSize="small" />}
            onClick={() => applyShowFilters(!filtersWanted)}
            sx={{ borderRadius: 999 }}
          >
            Filters
          </Button>
        </Badge>
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
