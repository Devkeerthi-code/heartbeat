import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { PressSprings } from "@/components/motion/PressSprings";
import { THEME_BOOT_SCRIPT, THEME_COLORS } from "@/components/theme/theme";
import { ThemeHotkey } from "@/components/theme/ThemeHotkey";
import { Toaster } from "@/components/toast/Toaster";
import "./globals.css";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-mono", display: "swap" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Heartbeat — uptime alerts for free-tier sites", template: "%s · Heartbeat" },
  description:
    "Heartbeat checks your Vercel, Render and Railway projects every 5 minutes, emails you after two failed checks in a row, and gives you a public status page.",
  applicationName: "Heartbeat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: THEME_COLORS.light,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="overflow-x-clip">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <Toaster />
        <PressSprings />
        <ThemeHotkey />
      </body>
    </html>
  );
}
