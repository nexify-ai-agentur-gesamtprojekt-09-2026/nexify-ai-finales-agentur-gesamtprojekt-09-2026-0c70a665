"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { RouterProvider, type SiteLinkProps } from "./Router";

const NextLink = (props: SiteLinkProps) => <Link {...props} />;
export default function NextRouterBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const adapter = useMemo(() => ({ pathname, Link: NextLink }), [pathname]);
  return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
