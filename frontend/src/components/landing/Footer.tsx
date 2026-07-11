import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

const FOOTER_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Dashboard", href: "/dashboard" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Sketch it. Generate it. Play it.
          </p>
        </div>
        <nav className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} PlayBox
        </p>
      </div>
    </footer>
  );
}
