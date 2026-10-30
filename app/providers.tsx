"use client";

import { useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { makeQueryClient } from "@/features/prices/lib/queryClient";
import { buildTheme } from "@/shared/design/theme";
import { ThemeModeProvider, useThemeMode } from "@/features/app-shell/hooks/useThemeMode";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeModeProvider>
      <ThemedProviders>{children}</ThemedProviders>
    </ThemeModeProvider>
  );
};

const ThemedProviders = ({ children }: { children: React.ReactNode }) => {
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
};
