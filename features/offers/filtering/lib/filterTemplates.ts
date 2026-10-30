import type { MRT_ColumnFiltersState, MRT_SortingState } from "material-react-table";

export interface FilterTemplate {
  id: string;
  name: string;
  columnFilters: MRT_ColumnFiltersState;
  sorting: MRT_SortingState;
  builtIn?: boolean;
}

const TEMPLATES_KEY = "skisense.offers.templates.v1";
const ACTIVE_KEY = "skisense.offers.activeTemplate.v1";

export const COUNTRY_FRANCE = "צרפת";

export const upcomingSeasonRange = (today = new Date()): [string, string] => {
  const year = today.getUTCMonth() >= 5 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
  return [`${year}-01-01`, `${year}-03-25`];
};

export const buildBuiltInTemplates = (today = new Date()): FilterTemplate[] => {
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
};

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
};

export const loadSavedTemplates = (): FilterTemplate[] => {
  return readJson<FilterTemplate[]>(TEMPLATES_KEY, []);
};

export const saveTemplate = (name: string, columnFilters: MRT_ColumnFiltersState, sorting: MRT_SortingState): FilterTemplate[] => {
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
};

export const deleteTemplate = (id: string): FilterTemplate[] => {
  const next = loadSavedTemplates().filter((t) => t.id !== id);
  writeJson(TEMPLATES_KEY, next);
  return next;
};

export const loadActiveTemplateId = (): string => {
  return readJson<string>(ACTIVE_KEY, "");
};

export const storeActiveTemplateId = (id: string): void => {
  writeJson(ACTIVE_KEY, id);
};
