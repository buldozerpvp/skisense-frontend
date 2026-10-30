import type { Metadata } from "next";
import { Box } from "@mui/material";
import "./globals.css";
import { Providers } from "@/app/providers";
import { TopBar } from "@/features/app-shell/components/TopBar";
import { SiteFooter } from "@/features/app-shell/components/SiteFooter";
import { APP_NAME, APP_TAGLINE } from "@/features/app-shell/constants";
import { FONT_STYLESHEET_HREF, themeVariablesCss } from "@/shared/design/tokens";
import { THEME_INIT_SCRIPT } from "@/features/app-shell/hooks/useThemeMode";
import { ResortCard } from "@/features/resorts/components/ResortCard";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_STYLESHEET_HREF} />
                <style dangerouslySetInnerHTML={{ __html: themeVariablesCss() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>
                    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            <TopBar />
            <Box component="main" sx={{ flex: 1 }}>
              {children}
            </Box>
            <SiteFooter />
          </Box>
                    <ResortCard />
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
