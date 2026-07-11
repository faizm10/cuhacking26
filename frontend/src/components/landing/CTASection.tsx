"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export function CTASection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-6 py-24 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className="relative overflow-hidden rounded-2xl bg-landing-ink px-6 py-20 text-center sm:px-12"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-landing-purple/15 blur-3xl"
            animate={
              reduceMotion
                ? undefined
                : { x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }
            }
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-20 size-80 rounded-full bg-landing-purple/10 blur-3xl"
            animate={
              reduceMotion
                ? undefined
                : { x: [0, -25, 0], y: [0, -15, 0], scale: [1, 1.08, 1] }
            }
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="relative">
            <motion.p
              className="text-[11px] uppercase tracking-[0.1em] text-landing-bg/50"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Get started
            </motion.p>
            <motion.h2
              className="mt-4 font-heading text-4xl font-extrabold leading-tight text-landing-bg sm:text-[52px]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, type: "spring", stiffness: 120 }}
            >
              From sketch to playable.
              <br />
              In seconds.
            </motion.h2>
            <motion.p
              className="mx-auto mt-6 max-w-md text-[15px] text-landing-bg/60"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
            >
              Stop imagining your game. Start playing it.
            </motion.p>

            <motion.div
              className="mt-10"
              animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-full bg-landing-purple px-8 py-3.5 text-sm font-bold text-landing-ink shadow-[0_4px_24px_rgba(149,117,205,0.45)] transition-shadow hover:shadow-[0_8px_32px_rgba(149,117,205,0.55)]"
                >
                  Start playing now
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
