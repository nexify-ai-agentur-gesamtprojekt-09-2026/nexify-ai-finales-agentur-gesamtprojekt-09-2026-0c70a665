"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { RouterProvider, type SiteLinkProps } from "./Router";

const NextLink = (props: SiteLinkProps) => <Link {...props} />;
export default function NextRouterBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const adapter = useMemo(() => ({ pathname, Link: NextLink, navigate: (href: string) => router.push(href) }), [pathname, router]);
  return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
