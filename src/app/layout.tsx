import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  metadataBase: new URL("https://awardbro.com"),
  title: {
    default: "AwardBro - Create Interactive Award Shows",
    template: "%s | AwardBro",
  },
  description:
    "Create interactive award shows with live voting and real-time results. Perfect for friends, team events, and more!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: [
    "award show platform",
    "live voting",
    "interactive awards",
    "team awards",
    "company awards",
    "real-time voting",
    "award ceremony",
    "event management",
    "team celebration",
    "live presentation",
  ],
  authors: [{ name: "Martin Bartolo" }],
  creator: "Martin Bartolo",
  publisher: "Martin Bartolo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "AwardBro",
    title: "AwardBro - Create Interactive Award Shows",
    description:
      "Create interactive award shows with live voting and real-time results. Perfect for friends, team events, and more!",
    images: [
      {
        url: "/og/home-og.png",
        width: 1200,
        height: 630,
        alt: "AwardBro - Create Interactive Award Shows",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AwardBro - Create Interactive Award Shows",
    description:
      "Create interactive award shows with live voting and real-time results. Perfect for friends, team events, and more!",
    images: [
      {
        url: "/og/home-og.png",
        width: 1200,
        height: 630,
        alt: "AwardBro - Create Interactive Award Shows",
      },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} suppressHydrationWarning dir="ltr">
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
