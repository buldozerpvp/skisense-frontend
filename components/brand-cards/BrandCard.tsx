"use client";

import Link from "next/link";
import { Card, CardActionArea, Box, Typography, Chip } from "@mui/material";
import { motion } from "framer-motion";
import type { Brand } from "@/lib/brands/config";

export function BrandCard({ brand, index }: { brand: Brand; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      style={{ height: "100%" }}
    >
      <Card sx={{ height: "100%" }}>
        <CardActionArea
          component={Link}
          href={`/brands/${brand.slug}`}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            p: 2.5,
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: brand.color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            {brand.initials}
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {brand.name}
          </Typography>
          {brand.hasContent ? (
            <Chip label="Live data" color="success" size="small" variant="outlined" sx={{ width: "fit-content" }} />
          ) : (
            <Chip label="Coming soon" size="small" variant="outlined" sx={{ width: "fit-content" }} />
          )}
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
