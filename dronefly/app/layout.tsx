import type { Metadata } from "next";
import { Exo_2, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "DroneFly — Drone Weather Flyability Dashboard",
  description: "Real-time weather-based GO/CAUTION/NO-GO assessment for drone operations",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DroneFly",
    startupImage: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      translate="no"
      className={`${exo2.variable} ${jetbrainsMono.variable}`}
      style={{ fontFamily: "var(--font-exo2), sans-serif" }}
    >
      <body className="min-h-screen" style={{ background: "#0a0f1a", color: "#c8d0e0" }}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
