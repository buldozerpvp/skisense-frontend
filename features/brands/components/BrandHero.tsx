"use client";

import Image from "next/image";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { COLORS, FONT_DISPLAY, RADIUS } from "@/shared/design/tokens";
import type { Brand } from "@/features/brands/constants";

export interface BrandStat {
  label: string;
  value: string;
}

export const BrandHero = ({
  brand,
  slug,
  tagline,
  stats,
}: {
  brand?: Brand;
  slug: string;
  tagline?: string;
  stats: BrandStat[];
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: `${RADIUS.xl}px`,
        p: { xs: 3, md: 4 },
        color: "#fff",
        background: `linear-gradient(135deg, ${brand?.color ?? COLORS.brandDeep} 0%, ${COLORS.brandDeep} 55%, ${COLORS.brand} 100%)`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: -90,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.sky}66 0%, transparent 70%)`,
        }}
      />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ position: "relative" }}>
        {brand?.logoSrc && (
          <Box
            sx={{
              position: "relative",
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              bgcolor: "#fff",
              flexShrink: 0,
            }}
          >
            <Image src={brand.logoSrc} alt={`${brand.name} logo`} fill sizes="60px" className="object-cover" />
          </Box>
        )}
        <Box>
          <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 26, md: 32 } }}>
            {brand?.name ?? slug}
          </Typography>
          {tagline && <Typography sx={{ opacity: 0.8, mt: 0.25 }}>{tagline}</Typography>}
        </Box>
      </Stack>

      <Stack direction="row" sx={{ position: "relative", mt: 2.5, flexWrap: "wrap", gap: 1 }}>
        {stats.map((stat) => (
          <Chip
            key={stat.label}
            label={
              <span>
                <Box component="span" className="tabular" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Box>
                <Box component="span" sx={{ opacity: 0.75, ml: 0.75, fontWeight: 500 }}>
                  {stat.label}
                </Box>
              </span>
            }
            sx={{
              bgcolor: "rgba(255,255,255,0.14)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
