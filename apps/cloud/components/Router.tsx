"use client";
import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";

export type SiteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type Adapter = { pathname: string; Link: ComponentType<SiteLinkProps>; navigate: (href: string) => void };
const NativeLink = (props: SiteLinkProps) => <a {...props} />;
const Context = createContext<Adapter>({ pathname: "/", Link: NativeLink, navigate: href => window.location.assign(href) });
export function RouterProvider({ adapter, children }: { adapter: Adapter; children: ReactNode }) {
  return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
export function SiteLink(props: SiteLinkProps) {
  const { Link } = useContext(Context);
  return <Link {...props} />;
}
export const useSitePathname = () => useContext(Context).pathname;
export const useSiteNavigate = () => useContext(Context).navigate;
