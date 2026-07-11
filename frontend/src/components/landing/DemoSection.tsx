"use client";

import { motion } from "framer-motion";

export function DemoSection() {
  return (
    <section id="demo" className="scroll-mt-20 px-6 py-24 lg:px-12">
      <div className="mx-auto w-full max-w-[1152px]">
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
          <h2 className="mt-4 font-heading text-[48px] font-extrabold leading-[1.1] text-landing-ink">
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
          className="mt-12 flex justify-center pt-12"
        >
          <motion.div
            whileHover={{ scale: 1.01, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="aspect-video w-full max-w-[896px] overflow-hidden rounded-2xl border border-border bg-landing-surface"
          >
            <div className="h-full min-h-[280px] bg-[#eee] sm:min-h-[400px]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
