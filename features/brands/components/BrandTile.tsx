"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Brand } from "@/features/brands/constants";

interface BrandWidgetProps {
  brand: Brand;
  index?: number;
}

export const BrandTile = ({ brand, index = 0 }: BrandWidgetProps) => {
  const ringClass = brand.hasContent
    ? "ring-2 ring-sky/40 group-hover:ring-sky"
    : "ring-1 ring-border group-hover:ring-ink-muted/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/brands/${brand.slug}`}
        className="group flex w-28 flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_12px_30px_-18px_rgba(12,39,66,0.5)] sm:w-32"
      >
        <div
          className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white transition-all duration-200 sm:h-24 sm:w-24 ${ringClass}`}
          style={!brand.logoSrc ? { backgroundColor: brand.color } : undefined}
        >
          {brand.logoSrc ? (
            <Image
              src={brand.logoSrc}
              alt={`${brand.name} logo`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <span className="text-lg font-bold tracking-wide text-white">{brand.initials}</span>
          )}
        </div>

        <span className="text-center text-sm font-semibold text-ink">{brand.name}</span>

        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            brand.hasContent ? "bg-frost text-brand" : "bg-canvas text-ink-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              brand.hasContent ? "bg-positive animate-pulse" : "bg-ink-muted/40"
            }`}
          />
          {brand.hasContent ? "Live data" : "Coming soon"}
        </span>
      </Link>
    </motion.div>
  );
};
