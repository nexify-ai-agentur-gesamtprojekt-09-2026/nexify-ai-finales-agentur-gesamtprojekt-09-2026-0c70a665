import "../../../packages/tokens/tokens.css";
import "./masterplan-tokens.css";
import "./globals.css";
import "./measurement-system.css";
import '../components/HomeMaster.css';
import type { Metadata, Viewport } from "next";
import tokens from "../../../packages/tokens/tokens.json";
import {headers} from 'next/headers';
import {localeOf} from '../lib/page-seo';
import type { ReactNode } from "react";
import Workspace from "../components/Workspace";
import NextRouterBridge from "../components/NextRouterBridge";
import { publicPages,publicExperienceData } from "../lib/catalog";
import {PublicExperienceProvider} from "../components/PublicExperience";
import PublicInstallation from "../components/PublicInstallation";
import installation from '../.generated/installation.json';
import "../components/LuxuryMaterials.css";

export const metadata: Metadata = { description:"Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",robots:{index:false,follow:false},...(installation.enabled?{manifest:'/manifest.webmanifest'}:{})};
// Ganzer Bildschirm inklusive Randbereichen (Kerbe, Home-Balken); die Flächen halten selbst Abstand über env(safe-area-inset-*).
// Die Browserleiste nimmt die Farbe des Seitengrunds an.
export const viewport: Viewport = { width:"device-width", initialScale:1, viewportFit:"cover", themeColor:tokens["color-atelier-canvas"], colorScheme:"dark" };
export default async function RootLayout({children}:{children:ReactNode}) {
  const locale=localeOf((await headers()).get('x-nexify-locale'));
  const content = <NextRouterBridge locale={locale}><PublicExperienceProvider data={publicExperienceData}><Workspace initialLocale={locale} pages={publicPages()}>{children}</Workspace></PublicExperienceProvider></NextRouterBridge>;
  // Some browser extensions add attributes to html/body before React runs.
  // Tolerance is deliberately limited to these two roots; page components still hydrate strictly.
  return <html lang={locale} style={{colorScheme:'dark'}} suppressHydrationWarning><body suppressHydrationWarning><PublicInstallation enabled={installation.enabled}/>{content}</body></html>;
}
