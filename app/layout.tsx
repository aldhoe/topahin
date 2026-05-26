import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/providers/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Topahin — Patungan Bareng Temen",
  description:
    "Kumpulin dana buat liburan, kado, dan project bareng temen jadi lebih transparan.",
  metadataBase: new URL("https://topahin.vercel.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Topahin",
  },
  openGraph: {
    title: "Topahin — Patungan Bareng Temen",
    description: "Patungan jadi lebih gampang dan transparan!",
    url: "https://topahin.vercel.app",
    siteName: "Topahin",
    images: [
      {
        url: "/topahinbanner.png",
        width: 1200,
        height: 630,
        alt: "Topahin Banner",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Topahin",
    description: "Patungan bareng temen jadi gampang!",
    images: ["/topahinbanner.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}