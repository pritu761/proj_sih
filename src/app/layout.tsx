import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AICTE Sentinel | Integrated Complaint Monitoring",
    template: "%s · AICTE Sentinel",
  },
  description:
    "Central single source of truth for technical institution grievance monitoring, inter-bureau collision prevention, and statutory SLA compliance across AICTE Bureaus and Regional Offices.",
  keywords: [
    "AICTE",
    "grievance monitoring",
    "complaint dashboard",
    "SLA compliance",
    "overlap detection",
  ],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased relative min-h-screen">
        {/* Full-Page Background: AICTE Headquarters (All Pages) */}
        <div
          className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
          aria-hidden="true"
        >
          {/* Real AICTE Headquarters Building spanning full viewport */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.28] filter contrast-[1.08] saturate-[1.1] transition-opacity duration-700 dark:opacity-[0.38] dark:brightness-95 dark:contrast-125 dark:saturate-120"
            style={{
              backgroundImage: "url('/images/aicte-hq.webp')",
            }}
          />
          {/* Subtle atmospheric wash for reading comfort */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[var(--surface-bg)]/75 via-[var(--surface-bg)]/50 to-[var(--surface-bg)]/80 transition-colors duration-500 dark:from-[#070c16]/50 dark:via-[#070c16]/30 dark:to-[#070c16]/60"
          />
        </div>

        <div className="relative z-10 min-h-screen">
          <ThemeProvider>{children}</ThemeProvider>
        </div>
      </body>
    </html>
  );
}
