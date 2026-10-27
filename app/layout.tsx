import type { Metadata } from "next";
import { Box } from "@mui/material";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/layout/TopBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { FONT_STYLESHEET_HREF, themeVariablesCss } from "@/lib/design/tokens";
import { THEME_INIT_SCRIPT } from "@/lib/design/useThemeMode";
import { ResortCard } from "@/components/resorts/ResortCard";

// Next picks up app/icon.png, app/apple-icon.png and app/favicon.ico
// automatically, so the tab icon needs no manual <link> tags here.
export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

/** The frame every route shares: fonts, the client providers, header and footer. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Webfonts load from Google; the stacks in tokens.ts fall back to
            system fonts if they don't arrive. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_STYLESHEET_HREF} />
        {/* Both palettes as CSS variables, and the one script that picks a
            side before anything paints — without it a visitor who prefers
            dark gets a white flash on every navigation. */}
        <style dangerouslySetInnerHTML={{ __html: themeVariablesCss() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          {/* Header and footer live here so every page, brand pages included,
              gets the same frame. */}
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            <TopBar />
            <Box component="main" sx={{ flex: 1 }}>
              {children}
            </Box>
            <SiteFooter />
          </Box>
          {/* One card for the whole app: every resort name on every screen
              opens this same dialog. */}
          <ResortCard />
        </Providers>
      </body>
    </html>
  );
}
