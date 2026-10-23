"use client";

import { useState, type ReactNode } from "react";
import { Paper, Stack, Typography, ToggleButton, ToggleButtonGroup, Box } from "@mui/material";
import { motion } from "framer-motion";

export interface TableColumn<T> {
  header: string;
  /** Right-align numeric columns and give them tabular figures. */
  numeric?: boolean;
  render: (row: T) => ReactNode;
}

interface ChartCardProps<T> {
  title: string;
  /** One line on how to read the chart, or what the number actually means. */
  subtitle?: string;
  /** Shown instead of the chart when there's nothing to draw. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Dim rather than unmount while refetching — a skeleton flash causes layout jump. */
  isFetching?: boolean;
  tableRows?: T[];
  tableColumns?: TableColumn<T>[];
  children: ReactNode;
}

/**
 * Shell for every chart: title, the chart/table switch, and the empty state.
 *
 * The table view isn't optional polish — the aqua "cheaper" fill sits just under
 * 3:1 on white, and a readable text equivalent is what makes that legal.
 */
export function ChartCard<T>({
  title,
  subtitle,
  isEmpty = false,
  emptyMessage = "Not enough data yet",
  isFetching = false,
  tableRows,
  tableColumns,
  children,
}: ChartCardProps<T>) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const hasTable = Boolean(tableRows && tableColumns);

  return (
    // Animates on mount, not on scroll-into-view: these cards start empty and
    // grow when the query resolves, and a scroll-triggered entrance could leave
    // a populated card stuck at opacity 0.
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {hasTable && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, next) => next && setView(next)}
              aria-label={`${title} view`}
            >
              <ToggleButton value="chart" aria-label="Chart view" sx={{ px: 1.5, py: 0.25, fontSize: 12 }}>
                Chart
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view" sx={{ px: 1.5, py: 0.25, fontSize: 12 }}>
                Table
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>

        <Box sx={{ mt: 2, opacity: isFetching ? 0.55 : 1, transition: "opacity 150ms linear" }}>
          {isEmpty ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </Box>
          ) : view === "chart" ? (
            children
          ) : (
            <DataTable rows={tableRows ?? []} columns={tableColumns ?? []} />
          )}
        </Box>
      </Paper>
    </motion.div>
  );
}

function DataTable<T>({ rows, columns }: { rows: T[]; columns: TableColumn<T>[] }) {
  return (
    <Box sx={{ maxHeight: 320, overflow: "auto" }}>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <Box component="thead">
          <Box component="tr">
            {columns.map((column) => (
              <Box
                component="th"
                key={column.header}
                scope="col"
                sx={{
                  textAlign: column.numeric ? "right" : "left",
                  p: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontWeight: 600,
                  position: "sticky",
                  top: 0,
                  bgcolor: "background.paper",
                }}
              >
                {column.header}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row, i) => (
            <Box component="tr" key={i}>
              {columns.map((column) => (
                <Box
                  component="td"
                  key={column.header}
                  sx={{
                    textAlign: column.numeric ? "right" : "left",
                    fontVariantNumeric: column.numeric ? "tabular-nums" : undefined,
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {column.render(row)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
