import Link from "next/link";
import { Gamepad2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <Gamepad2 className="size-4.5" />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        Play<span className="text-primary">Box</span>
      </span>
    </Link>
  );
}
