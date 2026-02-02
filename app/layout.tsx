import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
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
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
