"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Dotted "whiteboard" backdrop with warm glows */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle,_var(--border)_1px,_transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,_black,_transparent)]"
      />
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 -z-10 h-72 w-lg -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28"
      >
        <motion.div
          variants={item}
          className="mb-6 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-soft"
        >
          <Sparkles className="size-3.5 text-primary" />
          AI-powered game creation
        </motion.div>

        <motion.h1
          variants={item}
          className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          Turn your sketches into{" "}
          <span className="relative inline-block text-primary">
            playable games
            <svg
              aria-hidden
              viewBox="0 0 200 12"
              className="absolute -bottom-2 left-0 w-full text-primary/50"
              preserveAspectRatio="none"
            >
              <path
                d="M2 9 C 40 3, 80 11, 118 6 S 180 4, 198 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground"
        >
          Doodle a level on the canvas, and PlayBox&apos;s AI turns it into a
          real, playable game in seconds. No code, no engine setup — just draw,
          generate, and play.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "px-6")}
          >
            Start Creating
          </Link>
          <Link
            href="/#how-it-works"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "px-6"
            )}
          >
            View Demo
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
