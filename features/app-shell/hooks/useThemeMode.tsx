"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "@/shared/design/tokens";

export type ThemePreference = ThemeMode | "system";

const STORAGE_KEY = "skisense.theme.v1";

export const THEME_INIT_SCRIPT = `(()=>{try{const p=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});const m=p==='light'||p==='dark'?p:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`;

interface ThemeModeValue {
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

const systemMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const storedPreference = (): ThemePreference => {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
};

export const ThemeModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ThemeMode>("light");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = storedPreference();
    setPreferenceState(saved);
    setResolved(saved === "system" ? systemMode() : saved);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setResolved(query.matches ? "dark" : "light");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [preference]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(next === "system" ? systemMode() : next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  const value = useMemo<ThemeModeValue>(
    () => ({ mode: resolved, preference, setPreference, toggle }),
    [resolved, preference, setPreference, toggle],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = (): ThemeModeValue => {
  const value = useContext(ThemeModeContext);
  if (!value) throw new Error("useThemeMode must be used inside <ThemeModeProvider>");
  return value;
};
