"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { ArrowRight, PencilLine, Play, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: PencilLine,
    title: "Sketch",
    description: "Draw your level, characters, and obstacles on the canvas.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description: "AI reads your drawing and builds a real game from it.",
  },
  {
    icon: Play,
    title: "Play",
    description: "Jump straight into your game and share it with friends.",
  },
];

export function ProductFlow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            From napkin doodle to game
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps. No game engine required.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.12 }}
                className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-soft transition-shadow hover:shadow-soft-lg"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <step.icon className="size-6" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
              {index < STEPS.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="size-6 shrink-0 self-center text-primary rotate-90 md:rotate-0"
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
