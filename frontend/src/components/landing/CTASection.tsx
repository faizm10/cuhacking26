"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-soft-lg sm:px-12"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle,_oklch(1_0_0_/_18%)_1px,_transparent_1px)] bg-[size:20px_20px]"
          />
          <div className="relative">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Ready to bring your doodles to life?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Grab a virtual marker and sketch your first game. It takes less
              time than explaining your idea.
            </p>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "mt-8 bg-background px-6 text-foreground hover:bg-background/90"
              )}
            >
              Start Creating
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
