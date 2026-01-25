"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";

type FrilppLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: 20,
  md: 24,
  lg: 32,
};

export default function FrilppLogo({ size = "md", className }: FrilppLogoProps) {
  const dimension = sizeMap[size];
  return (
    <Image
      src="/email/frilpp-logo.png"
      alt="Frilpp"
      width={dimension}
      height={dimension}
      className={cn("object-contain", className)}
    />
  );
}
