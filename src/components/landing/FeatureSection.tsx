"use client";

import { motion } from "framer-motion";
import {
  Gamepad2,
  PencilLine,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: PencilLine,
    title: "Draw your idea",
    description:
      "Sketch levels and characters on a freeform canvas, just like a whiteboard.",
  },
  {
    icon: Sparkles,
    title: "Generate with AI",
    description:
      "AI interprets your sketch and turns shapes into platforms, players, and goals.",
  },
  {
    icon: Gamepad2,
    title: "Play instantly",
    description:
      "Your game runs in the browser the moment it's generated. No downloads.",
  },
  {
    icon: SlidersHorizontal,
    title: "Edit and improve",
    description:
      "Tweak your sketch or remix the rules, then regenerate until it feels right.",
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-secondary/50 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to make a game
          </h2>
          <p className="mt-3 text-muted-foreground">
            A creative toolkit that stays out of your way.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-soft-lg"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-heading font-semibold">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
