import "../../../packages/tokens/tokens.css";
import "./masterplan-tokens.css";
import "./globals.css";
import "./measurement-system.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Workspace from "../components/Workspace";
import NextRouterBridge from "../components/NextRouterBridge";
import { publicPages,publicExperienceData } from "../lib/catalog";
import {PublicExperienceProvider} from "../components/PublicExperience";
import PublicInstallation from "../components/PublicInstallation";
import installation from '../.generated/installation.json';
import "../components/LuxuryMaterials.css";

export const metadata: Metadata = { description:"Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",robots:{index:false,follow:false},...(installation.enabled?{manifest:'/manifest.webmanifest'}:{})};
export default function RootLayout({children}:{children:ReactNode}) {
  const content = <NextRouterBridge><PublicExperienceProvider data={publicExperienceData}><Workspace pages={publicPages()}>{children}</Workspace></PublicExperienceProvider></NextRouterBridge>;
  return <html lang="de"><body><PublicInstallation enabled={installation.enabled}/>{content}</body></html>;
}
