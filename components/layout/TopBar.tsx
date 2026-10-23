"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  TextField,
  InputAdornment,
  Box,
  Button,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useAppStore } from "@/lib/store/useAppStore";
import { APP_LOGO_ALT, APP_LOGO_SRC, APP_NAME } from "@/lib/branding";
import { COLORS, FONT_DISPLAY } from "@/lib/design/tokens";

const LOGO_SIZE = 34;

/** Sticky, frosted header. The search box only appears where there's a table to search. */
export function TopBar() {
  const pathname = usePathname();
  const searchText = useAppStore((s) => s.searchText);
  const setSearchText = useAppStore((s) => s.setSearchText);

  const isHome = pathname === "/";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(10px)",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", py: 1, minHeight: 64 }}>
          <Stack component={Link} href="/" direction="row" spacing={1.25} alignItems="center">
            <Image src={APP_LOGO_SRC} alt={APP_LOGO_ALT} width={LOGO_SIZE} height={LOGO_SIZE} priority />
            <Box>
              <Typography
                sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: 1.1 }}
              >
                {APP_NAME}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.inkFaint, letterSpacing: "0.04em" }}>
                Ski price tracker
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1.5 }}>
            {isHome ? (
              <TextField
                size="small"
                placeholder="Search resorts, countries…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ minWidth: { xs: 200, sm: 280 }, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: COLORS.inkFaint }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            ) : (
              <Button component={Link} href="/" size="small" startIcon={<ArrowBackRoundedIcon />}>
                All brands
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
