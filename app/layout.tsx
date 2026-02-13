import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Keepit Carnaval 2026 | Anhembi",
  description:
    "Viva o Carnaval 2026 no Anhembi com a Keepit! Apareça no telão, acesse fotos exclusivas, mapa interativo e muito mais.",
  keywords: [
    "carnaval",
    "anhembi",
    "keepit",
    "2026",
    "fotos",
    "mural",
    "desfile",
    "sao paulo",
  ],
  authors: [{ name: "Keepit" }],
  creator: "Keepit",
  publisher: "Keepit",
  robots: "index, follow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Keepit Carnaval",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://carnaval.keepit.com.br",
    siteName: "Keepit Carnaval 2026",
    title: "Keepit Carnaval 2026 | Anhembi",
    description:
      "Viva o Carnaval 2026 no Anhembi com a Keepit! Apareça no telão, acesse fotos exclusivas, mapa interativo e muito mais.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Keepit Carnaval 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keepit Carnaval 2026 | Anhembi",
    description:
      "Viva o Carnaval 2026 no Anhembi com a Keepit! Apareça no telão, acesse fotos exclusivas e muito mais.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
