"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemeMode } from "./tokens";

/** What a visitor has chosen. "system" means follow the OS setting. */
export type ThemePreference = ThemeMode | "system";

/** Where the choice is remembered. Versioned, so a format change can't poison it. */
const STORAGE_KEY = "skisense.theme.v1";

/**
 * Runs before first paint, inlined in the layout.
 *
 * Without it the server's light markup paints, then the client switches, and
 * a visitor who prefers dark gets a white flash on every navigation. Kept as
 * a string of plain ES5 so it can go straight into a `<script>` and cannot
 * throw in a browser with storage blocked.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var m=p==='light'||p==='dark'?p:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`;

interface ThemeModeValue {
  /** What is actually on screen. */
  mode: ThemeMode;
  /** What the visitor asked for, which may be "system". */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** Light ⇄ dark, leaving "system" behind. */
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

/** The OS setting, or light when it can't be read (SSR, old browsers). */
function systemMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The stored choice, or "system" when there isn't one. */
function storedPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    // Private windows and blocked site data throw on read; the OS setting is
    // a perfectly good answer, so this is not worth surfacing.
    return "system";
  }
}

/**
 * Holds the theme choice and keeps `data-theme` on `<html>` in step with it.
 *
 * The attribute is what the CSS variables in tokens.ts key off, so the whole
 * app recolours from that one write; the React state exists only for the
 * pieces that need a literal colour (the MUI theme and the charts).
 */
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  // Always start light on the server and on the first client render, so the
  // markup matches; the effect below immediately corrects it. The inline
  // script has already set the attribute, so nothing flashes meanwhile.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ThemeMode>("light");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = storedPreference();
    setPreferenceState(saved);
    setResolved(saved === "system" ? systemMode() : saved);
  }, []);

  // Follow the OS while the visitor hasn't picked a side.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setResolved(query.matches ? "dark" : "light");
    // Deliberately no sync() here. On mount this effect still sees the
    // initial "system", even when the effect above has just read a stored
    // choice from localStorage — calling sync() would overwrite that choice
    // with the OS setting, and a visitor who picked light on a dark machine
    // would be back in dark after every reload.
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
      // Storage can be unavailable; the choice still holds for this visit.
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
}

/**
 * The active theme mode.
 *
 * Only needed where a literal colour is required — the charts, which hand
 * colours to d3. Anything styled with `COLORS` follows the mode on its own.
 */
export function useThemeMode(): ThemeModeValue {
  const value = useContext(ThemeModeContext);
  if (!value) throw new Error("useThemeMode must be used inside <ThemeModeProvider>");
  return value;
}
