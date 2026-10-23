"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import type { MRT_ColumnFiltersState, MRT_SortingState } from "material-react-table";
import type { FilterTemplate } from "@/lib/table/filterTemplates";

interface FilterTemplateBarProps {
  templates: FilterTemplate[];
  activeId: string;
  columnFilters: MRT_ColumnFiltersState;
  sorting: MRT_SortingState;
  onApply: (id: string) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

/**
 * Saved views for the offers table. Applying one sets the column filters and
 * sort order together, so a whole way of looking at the data is one click.
 */
export function FilterTemplateBar({
  templates,
  activeId,
  columnFilters,
  sorting,
  onApply,
  onSave,
  onDelete,
  onClear,
}: FilterTemplateBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const active = useMemo(() => templates.find((t) => t.id === activeId), [templates, activeId]);
  const hasFilters = columnFilters.length > 0 || sorting.length > 0;

  const commit = () => {
    if (!draftName.trim()) return;
    onSave(draftName);
    setDraftName("");
    setDialogOpen(false);
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
        <TextField
          select
          size="small"
          label="Saved view"
          value={activeId}
          onChange={(e) => onApply(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.name}
            </MenuItem>
          ))}
        </TextField>

        <Tooltip title="Save the current filters and sorting as a view">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<BookmarkAddOutlinedIcon />}
              disabled={!hasFilters}
              onClick={() => setDialogOpen(true)}
            >
              Save view
            </Button>
          </span>
        </Tooltip>

        {active && !active.builtIn && (
          <Tooltip title="Delete this saved view">
            <IconButton size="small" onClick={() => onDelete(active.id)} aria-label="Delete saved view">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {hasFilters && (
          <Button size="small" onClick={onClear}>
            Clear
          </Button>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save this view</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            placeholder="e.g. France · 7 nights · cheapest"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            sx={{ mt: 1 }}
            helperText={`${columnFilters.length} filter(s), ${sorting.length} sort rule(s)`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={commit} disabled={!draftName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
