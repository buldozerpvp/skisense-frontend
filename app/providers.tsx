"use client";

import { useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { makeQueryClient } from "@/lib/query/client";
import { buildTheme } from "@/lib/theme";
import { ThemeModeProvider, useThemeMode } from "@/lib/design/useThemeMode";

/**
 * Every client-side provider the app needs, in the order they have to nest.
 *
 * MUI's cache provider is outermost because emotion has to collect its styles
 * before the theme renders anything, or the first paint flashes unstyled. The
 * QueryClient is created inside useState so each browser session builds its
 * own: a module-level client would be created once per server process and
 * shared across visitors.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeModeProvider>
      <ThemedProviders>{children}</ThemedProviders>
    </ThemeModeProvider>
  );
}

/**
 * Everything below the theme choice.
 *
 * Split out so the MUI theme can be rebuilt when the mode changes: emotion
 * needs a new theme object, while the rest of the app recolours through the
 * CSS variables without re-rendering at all.
 */
function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const [queryClient] = useState(() => makeQueryClient());
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
