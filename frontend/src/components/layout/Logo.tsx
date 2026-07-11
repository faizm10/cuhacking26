import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md";
};

export function Logo({ className, size = "md" }: LogoProps) {
  const markSize = size === "sm" ? 22 : 34;
  const textClass =
    size === "sm"
      ? "font-heading text-xs font-extrabold text-landing-muted"
      : "font-heading text-[22px] font-medium text-landing-ink";

  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <Image
        src="/landing/logo-mark.svg"
        alt=""
        width={markSize}
        height={markSize}
        className="shrink-0"
        aria-hidden
      />
      <span className={textClass}>Playbox</span>
    </Link>
  );
}
