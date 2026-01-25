"use client";

import { usePathname } from "next/navigation";
import BrandLayout from "@/components/brand/brand-layout";

export default function BrandRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/brand/auth") ||
    pathname.startsWith("/brand/login") ||
    pathname.startsWith("/brand/signup")
  ) {
    return children;
  }

  return <BrandLayout>{children}</BrandLayout>;
}
