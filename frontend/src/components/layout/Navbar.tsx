import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/#how-it-works"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "hidden sm:inline-flex"
            )}
          >
            View Demo
          </Link>
          <Link href="/dashboard" className={buttonVariants()}>
            Start Creating
          </Link>
        </div>
      </div>
    </header>
  );
}
