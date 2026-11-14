import "../../../packages/tokens/tokens.css";
import "./masterplan-tokens.css";
import "./globals.css";
import "./measurement-system.css";
import '../components/HomeMaster.css';
import type { Metadata, Viewport } from "next";
import tokens from "../../../packages/tokens/tokens.json";
import {cookies,headers} from 'next/headers';
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
// Thema: dunkel ist Standard; hell nur nach Wahl über den Schalter (Cookie nx-theme). Das Attribut kommt vom Server,
// damit beim Laden nichts aufblitzt und kein Inline-Skript nötig ist.
const themeOf=(value?:string)=>value==='light'?'light' as const:'dark' as const;
export async function generateViewport(): Promise<Viewport> {
  const theme=themeOf((await cookies()).get('nx-theme')?.value);
  return { width:"device-width", initialScale:1, viewportFit:"cover", themeColor:tokens[theme==='light'?"color-hell-grund":"color-dunkel-grund"], colorScheme:theme };
}
export default async function RootLayout({children}:{children:ReactNode}) {
  const locale=localeOf((await headers()).get('x-nexify-locale'));
  const theme=themeOf((await cookies()).get('nx-theme')?.value);
  const content = <NextRouterBridge locale={locale}><PublicExperienceProvider data={publicExperienceData}><Workspace initialLocale={locale} pages={publicPages()}>{children}</Workspace></PublicExperienceProvider></NextRouterBridge>;
  // Some browser extensions add attributes to html/body before React runs.
  // Tolerance is deliberately limited to these two roots; page components still hydrate strictly.
  return <html lang={locale} data-theme={theme} style={{colorScheme:theme}} suppressHydrationWarning><body suppressHydrationWarning><PublicInstallation enabled={installation.enabled}/>{content}</body></html>;
}
