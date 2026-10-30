"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import "leaflet/dist/leaflet.css";
import { COLORS, RADIUS } from "@/shared/design/tokens";
import { useThemeMode } from "@/features/app-shell/hooks/useThemeMode";
import { RESORT_MAP_ZOOM } from "@/features/resorts/constants";

export const ResortMap = ({
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
  interactive?: boolean;
}) => {
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
        zoom: zoom ?? RESORT_MAP_ZOOM,
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

      L.circleMarker([lat, lon], {
        radius: 8,
        color: "#FFFFFF",
        weight: 2.5,
        fillColor: "#4E9BD8",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(name, { direction: "top", offset: [0, -10] });

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
};
