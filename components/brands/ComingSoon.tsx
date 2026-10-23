"use client";

import Image from "next/image";
import Link from "next/link";
import { Box, Typography, Button, Stack } from "@mui/material";
import AcUnitRoundedIcon from "@mui/icons-material/AcUnitRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import type { Brand } from "@/lib/brands/config";
import { COLORS, RADIUS } from "@/lib/design/tokens";

/** Placeholder for a brand whose collector isn't live yet. */
export function ComingSoon({ brand }: { brand: Brand }) {
  return (
    <Stack
      spacing={2}
      alignItems="center"
      sx={{
        minHeight: "48vh",
        justifyContent: "center",
        textAlign: "center",
        borderRadius: `${RADIUS.xl}px`,
        border: "1px dashed",
        borderColor: COLORS.borderStrong,
        bgcolor: COLORS.frost,
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 76,
          height: 76,
          borderRadius: "50%",
          overflow: "hidden",
          bgcolor: brand.logoSrc ? "#fff" : brand.color,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 22,
          boxShadow: "0 10px 30px -18px rgba(12,39,66,0.6)",
        }}
      >
        {brand.logoSrc ? (
          <Image src={brand.logoSrc} alt={`${brand.name} logo`} fill sizes="76px" className="object-cover" />
        ) : (
          brand.initials
        )}
      </Box>

      <Stack direction="row" spacing={0.75} alignItems="center">
        <AcUnitRoundedIcon fontSize="small" sx={{ color: COLORS.skySoft }} />
        <Typography variant="h5">{brand.name}</Typography>
      </Stack>

      <Typography color="text.secondary" sx={{ maxWidth: 440 }}>
        We&apos;re still wiring up {brand.name}&apos;s prices. As soon as the first snapshot lands,
        its offers appear here and in the combined table.
      </Typography>

      <Button component={Link} href="/" variant="contained" startIcon={<ArrowBackRoundedIcon />} sx={{ mt: 1 }}>
        Back to all brands
      </Button>
    </Stack>
  );
}
