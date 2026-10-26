import { deDE } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfiguration } from "../auth/policy";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Workspace from "../components/Workspace";
import NextRouterBridge from "../components/NextRouterBridge";
import { publicPages } from "../lib/catalog";
import "../../../packages/tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = { title: {default:"NeXify AI – Mehr Zeit für Kunden",template:"%s · NeXify AI"}, description:"Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:ReactNode}) {
  const content = <NextRouterBridge><Workspace pages={publicPages()}>{children}</Workspace></NextRouterBridge>;
  return <html lang="de"><body>{clerkConfiguration(process.env).ready ? <ClerkProvider localization={deDE} signInUrl="/anmelden" signUpUrl="/registrieren">{content}</ClerkProvider> : content}</body></html>;
}
