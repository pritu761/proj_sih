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
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
