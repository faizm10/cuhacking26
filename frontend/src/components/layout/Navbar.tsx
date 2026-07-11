"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Logo } from "@/components/layout/Logo";

const NAV_LINKS = [
  { label: "Demo", href: "/#demo" },
  { label: "Solution", href: "/#solution" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="sticky top-0 z-40 border-b border-border bg-[rgba(242,240,250,0.9)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 lg:px-12">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Logo />
        </motion.div>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <motion.div key={link.href} whileHover={{ y: -1 }}>
              <Link
                href={link.href}
                className="group relative text-[13px] text-landing-muted transition-colors hover:text-landing-ink"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-landing-purple transition-all duration-300 group-hover:w-full" />
              </Link>
            </motion.div>
          ))}
        </nav>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/dashboard"
            className="rounded-full bg-landing-ink px-5 py-2 text-[13px] text-landing-bg transition-shadow hover:shadow-[0_4px_20px_rgba(24,22,46,0.25)]"
          >
            Try Playbox
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}
