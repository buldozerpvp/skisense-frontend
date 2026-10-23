import type { MRT_ColumnFiltersState, MRT_SortingState } from "material-react-table";

/** A saved view of the offers table: which rows are shown and in what order. */
export interface FilterTemplate {
  id: string;
  name: string;
  columnFilters: MRT_ColumnFiltersState;
  sorting: MRT_SortingState;
  /** Built-ins ship with the app and can't be deleted. */
  builtIn?: boolean;
}

const TEMPLATES_KEY = "skisense.offers.templates.v1";
const ACTIVE_KEY = "skisense.offers.activeTemplate.v1";

/** Country names arrive from the sources in Hebrew. */
export const COUNTRY_FRANCE = "צרפת";

/**
 * 1 January to 25 March of the coming season. Computed rather than hard-coded
 * so the built-in template still points at a real ski season next year.
 */
export function upcomingSeasonRange(today = new Date()): [string, string] {
  // From June onwards the interesting season is the one starting this winter,
  // so its January falls in the following calendar year.
  const year = today.getUTCMonth() >= 5 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
  return [`${year}-01-01`, `${year}-03-25`];
}

/** Templates that ship with the app. */
export function buildBuiltInTemplates(today = new Date()): FilterTemplate[] {
  const [from, to] = upcomingSeasonRange(today);
  return [
    {
      id: "builtin:france-week",
      name: "France · 7 nights · Jan–Mar (cheapest first)",
      builtIn: true,
      sorting: [{ id: "priceEur", desc: false }],
      columnFilters: [
        { id: "country", value: [COUNTRY_FRANCE] },
        { id: "nights", value: ["7"] },
        { id: "date", value: [from, to] },
      ],
    },
  ];
}

function readJson<T>(key: string, fallback: T): T {
  // Storage can throw in private mode or when site data is blocked.
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience; losing it shouldn't break the table.
  }
}

export function loadSavedTemplates(): FilterTemplate[] {
  return readJson<FilterTemplate[]>(TEMPLATES_KEY, []);
}

/** Adds or replaces a template by name, returning the new list. */
export function saveTemplate(
  name: string,
  columnFilters: MRT_ColumnFiltersState,
  sorting: MRT_SortingState
): FilterTemplate[] {
  const trimmed = name.trim();
  const existing = loadSavedTemplates();
  const template: FilterTemplate = {
    id: `saved:${trimmed.toLowerCase()}`,
    name: trimmed,
    columnFilters,
    sorting,
  };
  const next = [...existing.filter((t) => t.id !== template.id), template].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  writeJson(TEMPLATES_KEY, next);
  return next;
}

export function deleteTemplate(id: string): FilterTemplate[] {
  const next = loadSavedTemplates().filter((t) => t.id !== id);
  writeJson(TEMPLATES_KEY, next);
  return next;
}

/** The template to re-apply on the next visit, so a chosen view sticks. */
export function loadActiveTemplateId(): string {
  return readJson<string>(ACTIVE_KEY, "");
}

export function storeActiveTemplateId(id: string): void {
  writeJson(ACTIVE_KEY, id);
}
