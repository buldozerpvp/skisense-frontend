"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { COLORS } from "@/shared/design/tokens";
import { buildPhotoUrl, photoSourceUrl, type ResortPhoto } from "@/features/resorts/lib/resortCatalogue";
import { HOTEL_PHOTO_WIDTH_PX } from "@/features/resorts/hotels/constants";

export interface CarouselPhoto extends ResortPhoto {
  caption?: string;
}

export const PhotoCarousel = ({
  photos,
  height = 190,
  note,
}: {
  photos: CarouselPhoto[];
  height?: number;
  note?: string;
}) => {
  const strip = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState<number | null>(null);

  useEffect(() => {
    const node = strip.current;
    if (!node) return;
    const onScroll = () => {
      const width = node.clientWidth || 1;
      setIndex(Math.round(node.scrollLeft / width));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  if (photos.length === 0) return null;

  const scrollTo = (next: number) => {
    const node = strip.current;
    if (!node) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <Box sx={{ position: "relative" }}>
        <Box
          ref={strip}
          sx={{
            display: "flex",
            height,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            bgcolor: COLORS.frost,
          }}
        >
          {photos.map((photo, i) => (
            <Box
              key={photo.file}
              component="button"
              type="button"
              onClick={() => setFull(i)}
              aria-label={`Open photo ${i + 1} of ${photos.length} full screen`}
              sx={{
                flex: "0 0 100%",
                width: "100%",
                height: "100%",
                scrollSnapAlign: "start",
                p: 0,
                border: "none",
                bgcolor: "transparent",
                cursor: "zoom-in",
              }}
            >
              <Box
                component="img"
                src={buildPhotoUrl(photo, HOTEL_PHOTO_WIDTH_PX)}
                alt={photo.caption ?? "Photo"}
                loading={i === 0 ? "eager" : "lazy"}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </Box>
          ))}
        </Box>

        {photos.length > 1 && (
          <>
            <Arrow side="left" onClick={() => scrollTo(index - 1)} disabled={index === 0} />
            <Arrow side="right" onClick={() => scrollTo(index + 1)} disabled={index === photos.length - 1} />
            <Box sx={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 0.7 }}>
              {photos.map((photo, i) => (
                <Box
                  key={photo.file}
                  sx={{
                    width: i === index ? 16 : 6,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: i === index ? "#F2F8FC" : "rgba(242,248,252,0.5)",
                    transition: "width 160ms ease",
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Box>

      {(note || photos[index]) && (
        <Typography sx={{ px: 2, pt: 0.8, fontSize: 10.5, color: COLORS.inkFaint, lineHeight: 1.5 }}>
          {note ? `${note} · ` : ""}
          {photos[index]?.caption ? `${photos[index].caption} · ` : ""}
          {photos[index] && (
            <>
              {photos[index].author && photos[index].author !== "Unknown" ? `${photos[index].author} · ` : ""}
              <Box
                component="a"
                href={photoSourceUrl(photos[index])}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: COLORS.brand, textDecoration: "none" }}
              >
                {photos[index].licence}
              </Box>{" "}
              via Wikimedia Commons
            </>
          )}
        </Typography>
      )}

      <FullScreen photos={photos} at={full} onClose={() => setFull(null)} onMove={setFull} />
    </>
  );
};

const Arrow = ({ side, onClick, disabled }: { side: "left" | "right"; onClick: () => void; disabled: boolean }) => {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      sx={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [side]: 6,
        width: 32,
        height: 32,
        color: "#F2F8FC",
        bgcolor: "rgba(4,12,20,0.45)",
        opacity: disabled ? 0 : 1,
        pointerEvents: disabled ? "none" : "auto",
        "&:hover": { bgcolor: "rgba(4,12,20,0.7)" },
      }}
    >
      {side === "left" ? <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} /> : <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />}
    </IconButton>
  );
};

const FullScreen = ({
  photos,
  at,
  onClose,
  onMove,
}: {
  photos: CarouselPhoto[];
  at: number | null;
  onClose: () => void;
  onMove: (next: number) => void;
}) => {
  useEffect(() => {
    if (at === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onMove(Math.min(photos.length - 1, at + 1));
      if (event.key === "ArrowLeft") onMove(Math.max(0, at - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, photos.length, onMove]);

  if (at === null) return null;
  const photo = photos[at];

  return (
    <Dialog
      fullScreen
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: "#04080E", backgroundImage: "none" } } }}
    >
      <Box sx={{ position: "relative", width: "100%", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box
          component="img"
          src={buildPhotoUrl(photo, 2000)}
          alt={photo.caption ?? "Photo"}
          sx={{ maxWidth: "100%", maxHeight: "100dvh", objectFit: "contain" }}
        />

        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{ position: "absolute", top: 12, right: 12, color: "#F2F8FC", bgcolor: "rgba(4,12,20,0.5)" }}
        >
          <CloseRoundedIcon />
        </IconButton>

        {photos.length > 1 && (
          <>
            <IconButton
              onClick={() => onMove(Math.max(0, at - 1))}
              disabled={at === 0}
              aria-label="Previous photo"
              sx={{ position: "absolute", left: 8, color: "#F2F8FC", bgcolor: "rgba(4,12,20,0.5)", opacity: at === 0 ? 0.25 : 1 }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>
            <IconButton
              onClick={() => onMove(Math.min(photos.length - 1, at + 1))}
              disabled={at === photos.length - 1}
              aria-label="Next photo"
              sx={{ position: "absolute", right: 8, color: "#F2F8FC", bgcolor: "rgba(4,12,20,0.5)", opacity: at === photos.length - 1 ? 0.25 : 1 }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>
          </>
        )}

        <Typography
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            fontSize: 11,
            color: "rgba(242,248,252,0.8)",
            background: "linear-gradient(to top, rgba(4,8,14,0.9), transparent)",
            textAlign: "center",
          }}
        >
          {at + 1} / {photos.length}
          {photo.caption ? ` · ${photo.caption}` : ""} ·{" "}
          {photo.author && photo.author !== "Unknown" ? `${photo.author} · ` : ""}
          {photo.licence} via Wikimedia Commons
        </Typography>
      </Box>
    </Dialog>
  );
};
