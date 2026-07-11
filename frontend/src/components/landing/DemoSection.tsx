"use client";

import { Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function DemoSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="demo" className="scroll-mt-20 px-6 py-24 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="text-center"
        >
          <motion.p
            className="text-[11px] font-normal uppercase tracking-[0.1em] text-landing-muted"
            initial={{ opacity: 0, letterSpacing: "0.05em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.1em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            See it in action
          </motion.p>
          <h2 className="mt-4 font-heading text-4xl font-extrabold leading-tight text-landing-ink sm:text-5xl">
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: "spring", stiffness: 120 }}
            >
              Sketch to playable.
            </motion.span>
            <br />
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
            >
              Watch it happen.
            </motion.span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 16, delay: 0.15 }}
          className="mt-12 flex justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.01, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-landing-surface shadow-soft"
          >
            <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden bg-[#eee] sm:min-h-[400px]">
              {!reduceMotion && (
                <motion.div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: "easeInOut",
                  }}
                />
              )}

              <div className="relative flex flex-col items-center gap-4">
                <motion.div
                  className="flex size-16 items-center justify-center rounded-full bg-landing-purple/90 text-white shadow-lg"
                  animate={
                    reduceMotion
                      ? undefined
                      : { scale: [1, 1.08, 1], boxShadow: ["0 8px 24px rgba(149,117,205,0.3)", "0 12px 32px rgba(149,117,205,0.5)", "0 8px 24px rgba(149,117,205,0.3)"] }
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  whileHover={{ scale: 1.12, rotate: 5 }}
                >
                  <Play className="ml-1 size-7 fill-current" />
                </motion.div>
                <p className="text-sm text-landing-muted/60">
                  Demo video coming soon
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
