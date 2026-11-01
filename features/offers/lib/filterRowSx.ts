import {
  FILTER_ROW_ATTR,
  FILTER_ROW_WIDTH,
  HEADER_CONTENT_MIN_PX,
  HEADER_HEIGHT_PX,
  WIDTH_KEY_BY_COLUMN_ID,
} from "@/features/offers/constants";

const cssVarId = (id: string): string => id.replace(/[^a-zA-Z0-9]/g, "_");

const OPEN_WIDTHS: Record<string, string> = Object.fromEntries(
  Object.entries(WIDTH_KEY_BY_COLUMN_ID).flatMap(([columnId, key]) => {
    const width = FILTER_ROW_WIDTH[key];
    if (width === undefined) return [];
    const id = cssVarId(columnId);
    return [
      [`--header-${id}-size`, `${width} !important`],
      [`--col-${id}-size`, `${width} !important`],
    ];
  })
);

const HEAD = "& .MuiTableCell-head";

export const filterRowPaperSx = {
  [HEAD]: {
    justifyContent: "center",
    minHeight: HEADER_HEIGHT_PX.bare,
    pt: 0.5,
    pb: 0.5,
  },
  [`${HEAD} .Mui-TableHeadCell-Content`]: {
    alignItems: "center",
    minHeight: HEADER_CONTENT_MIN_PX.bare,
  },
  [`${HEAD} .Mui-TableHeadCell-Content-Labels`]: { alignItems: "center" },
  [`${HEAD} .Mui-TableHeadCell-Content-Wrapper`]: { whiteSpace: "nowrap" },
  [`${HEAD} .MuiCollapse-root`]: { display: "none" },

  [`&[${FILTER_ROW_ATTR}="open"]`]: {
    [HEAD]: {
      justifyContent: "flex-start",
      minHeight: HEADER_HEIGHT_PX.withFilters,
      pt: 1.5,
      pb: 1,
    },
    [`${HEAD} .Mui-TableHeadCell-Content`]: {
      alignItems: "flex-start",
      minHeight: HEADER_CONTENT_MIN_PX.withFilters,
    },
    [`${HEAD} .Mui-TableHeadCell-Content-Labels`]: { alignItems: "flex-start" },
    [`${HEAD} .Mui-TableHeadCell-Content-Wrapper`]: { whiteSpace: "normal" },
    [`${HEAD} .MuiCollapse-root`]: { display: "block", width: "100%", marginTop: "auto" },
    "& table": OPEN_WIDTHS,
  },
};
