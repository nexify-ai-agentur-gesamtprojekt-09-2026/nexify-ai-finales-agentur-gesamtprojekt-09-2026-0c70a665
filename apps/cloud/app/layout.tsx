import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OracleChat from "@/components/OracleChat";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NeXify AI FACTORY · Chat it. Automate it.", template: "%s · NeXify AI FACTORY" },
  description:
    "Marke und Web, Systeme und KI, Sichtbarkeit und Wachstum – als ein System für Ihr Unternehmen. Persönlich begleitet, kalkuliert ab 449 € netto je Projekttag.",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#111212",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">Zum Inhalt</a>
        <Header />
        <div className="shell wrap">
          <main id="main" className="shell-main">{children}</main>
          <aside className="shell-aside"><OracleChat /></aside>
        </div>
        <Footer />
      </body>
    </html>
  );
}
