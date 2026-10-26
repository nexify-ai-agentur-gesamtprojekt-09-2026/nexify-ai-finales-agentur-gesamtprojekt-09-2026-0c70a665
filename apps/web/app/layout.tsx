import type { Metadata } from "next";
import type { ReactNode } from "react";
import Workspace from "../components/Workspace";
import { publicPages } from "../lib/catalog";
import "../../../packages/tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = { title: {default:"NeXify AI – Mehr Zeit für Kunden",template:"%s · NeXify AI"}, description:"Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="de"><body><Workspace pages={publicPages()}>{children}</Workspace></body></html>;
}
