import type { Metadata } from "next";
import { Box } from "@mui/material";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/layout/TopBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { FONT_STYLESHEET_HREF } from "@/lib/design/tokens";

// Next picks up app/icon.png, app/apple-icon.png and app/favicon.ico
// automatically, so the tab icon needs no manual <link> tags here.
export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* Webfonts load from Google; the stacks in tokens.ts fall back to
            system fonts if they don't arrive. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_STYLESHEET_HREF} />
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
        </Providers>
      </body>
    </html>
  );
}
