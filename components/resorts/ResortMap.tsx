"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import "leaflet/dist/leaflet.css";
import { COLORS, RADIUS } from "@/lib/design/tokens";
import { useThemeMode } from "@/lib/design/useThemeMode";

/** Close enough to see the valley, far enough to see where in the range it is. */
const DEFAULT_ZOOM = 9;

/**
 * The resort as a dot on a real map.
 *
 * Leaflet is loaded on demand rather than imported at module scope: it reaches
 * for `window` as it initialises, so a static import breaks the server render
 * of any page that can open this card.
 *
 * OpenStreetMap's tiles are a light-mode raster. Rather than swap tile
 * providers in dark mode, they are inverted and hue-rotated back — the result
 * sits on a dark ground without a second provider, a second attribution or a
 * second set of CSP entries.
 */
export function ResortMap({
  lat,
  lon,
  name,
  height,
  zoom,
  interactive = true,
}: {
  lat: number;
  lon: number;
  name: string;
  height: number | string;
  zoom?: number;
  /** False for the small preview, so a page scroll doesn't become a map zoom. */
  interactive?: boolean;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const { mode } = useThemeMode();

  useEffect(() => {
    const node = holder.current;
    if (!node) return;

    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current) return;

      map = L.map(node, {
        center: [lat, lon],
        zoom: zoom ?? DEFAULT_ZOOM,
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: interactive,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // A plain circle rather than Leaflet's default pin: the pin is a PNG
      // shipped with the package, and it goes missing behind a CDN or a
      // rewritten asset path. A vector marker has nothing to fetch.
      L.circleMarker([lat, lon], {
        radius: 8,
        color: "#FFFFFF",
        weight: 2.5,
        fillColor: "#4E9BD8",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(name, { direction: "top", offset: [0, -10] });

      // The container is sized by CSS, which Leaflet cannot see until after
      // the first paint; without this the tiles render into a zero-height box.
      setTimeout(() => map?.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lon, name, zoom, interactive]);

  return (
    <Box
      ref={holder}
      role="img"
      aria-label={`Map showing the location of ${name}`}
      sx={{
        height,
        width: "100%",
        borderRadius: `${RADIUS.md}px`,
        overflow: "hidden",
        bgcolor: COLORS.frost,
        border: `1px solid ${COLORS.border}`,
        // Leaflet paints its own white panes and controls; in dark mode the
        // whole map is inverted and the hue spun back so water stays blue.
        "& .leaflet-container": { background: COLORS.frost },
        "& .leaflet-tile-pane": mode === "dark" ? { filter: "invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92)" } : {},
        "& .leaflet-control-attribution": {
          background: "color-mix(in srgb, var(--ss-surface) 80%, transparent)",
          color: COLORS.inkFaint,
          fontSize: 9.5,
          "& a": { color: COLORS.brand },
        },
        "& .leaflet-bar a": {
          background: COLORS.surface,
          color: COLORS.ink,
          borderColor: COLORS.border,
        },
        "& .leaflet-bar a:hover": { background: COLORS.frost },
      }}
    />
  );
}
