import "../../../packages/tokens/tokens.css";
import "./globals.css";
import { deDE } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfiguration } from "../auth/policy";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Workspace from "../components/Workspace";
import NextRouterBridge from "../components/NextRouterBridge";
import { publicPages,publicExperienceData } from "../lib/catalog";
import {PublicExperienceProvider} from "../components/PublicExperience";
import PublicInstallation from "../components/PublicInstallation";
import installation from '../.generated/installation.json';

export const metadata: Metadata = { description:"Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",robots:{index:false,follow:false},...(installation.enabled?{manifest:'/manifest.webmanifest'}:{})};
export default function RootLayout({children}:{children:ReactNode}) {
  const content = <NextRouterBridge><PublicExperienceProvider data={publicExperienceData}><Workspace pages={publicPages()}>{children}</Workspace></PublicExperienceProvider></NextRouterBridge>;
  return <html lang="de"><body><PublicInstallation enabled={installation.enabled}/>{clerkConfiguration(process.env).ready ? <ClerkProvider localization={deDE} signInUrl="/anmelden" signUpUrl="/registrieren">{content}</ClerkProvider> : content}</body></html>;
}
