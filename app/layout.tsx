import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport: Ngatur warna bar di HP dan scaling biar pas
export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Topahin — Patungan Tanpa Drama",
  description: "Kumpulin dana buat liburan, kado, dan project bareng temen jadi lebih transparan dan asyik.",
  metadataBase: new URL('https://topahin.vercel.app'), // Update ini kalo udah ada domain asli
  manifest: "/manifest.json", // Kunci utama biar bisa di-install (PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Topahin",
  },
  openGraph: {
    title: "Topahin — Patungan Jadi Gampang",
    description: "Liburan bareng temen? Topahin aja kumpulin dananya!",
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
    description: "Patungan jadi lebih asyik!",
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
    <html lang="en">
      <head>
        {/* Tambahan manual buat mastiin manifest ke-load di Android/iOS */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}></script>
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}