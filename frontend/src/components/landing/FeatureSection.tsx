"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const FEATURES = [
  {
    step: "01",
    title: "Sketch your level",
    description:
      "Draw platforms, enemies, walls, collectibles. Rough is fine — Playbox reads intent, not perfection.",
    icon: "/landing/icon-sketch.svg",
    iconSecondary: "/landing/icon-sketch-2.svg",
    wiggle: { rotate: [0, -6, 6, 0] as number[] },
  },
  {
    step: "02",
    title: "AI understands it",
    description:
      "Playbox identifies platforms, characters, physics rules, enemies, and win conditions from your sketch.",
    icon: "/landing/icon-ai.svg",
    iconSecondary: "/landing/icon-ai-2.svg",
    wiggle: { scale: [1, 1.1, 1] as number[] },
  },
  {
    step: "03",
    title: "Press play",
    description:
      "Your sketch becomes a game you can immediately play, test, and share. Iterate in seconds, not weeks.",
    icon: "/landing/icon-play.svg",
    wiggle: { x: [0, 3, 0] as number[] },
  },
] as const;

export function FeatureSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="solution" className="scroll-mt-20 border-t border-border px-6 py-24 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="text-center"
        >
          <p className="text-[11px] font-normal uppercase tracking-[0.1em] text-landing-muted">
            Our Solution
          </p>
          <h2 className="mt-4 font-heading text-4xl font-extrabold leading-tight text-landing-ink sm:text-[52px]">
            Draw your level.
            <br />
            Playbox does the rest.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-landing-muted">
            Sketch a level. Define the rules. Playbox brings your game to life
            with movement, obstacles, enemies, collectibles, and a playable
            objective, all in seconds.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-0 overflow-hidden rounded-2xl border border-border sm:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 16,
                delay: index * 0.1,
              }}
              whileHover={{ y: -6, backgroundColor: "rgba(236, 234, 246, 0.95)" }}
              className="group relative flex flex-col gap-5 bg-landing-surface p-8 transition-colors"
            >
              <motion.div
                className="relative size-9"
                aria-hidden
                animate={
                  reduceMotion
                    ? undefined
                    : feature.wiggle
                }
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 2 + index,
                  ease: "easeInOut",
                }}
                whileHover={{ scale: 1.15, rotate: index === 0 ? 8 : 0 }}
              >
                <Image
                  src={feature.icon}
                  alt=""
                  width={36}
                  height={36}
                  className={
                    "iconSecondary" in feature && feature.iconSecondary
                      ? "absolute inset-[18%]"
                      : "absolute inset-[28%_28%_28%_39%]"
                  }
                />
                {"iconSecondary" in feature && feature.iconSecondary && (
                  <Image
                    src={feature.iconSecondary}
                    alt=""
                    width={36}
                    height={36}
                    className="absolute inset-[14%]"
                  />
                )}
              </motion.div>

              <div>
                <motion.p
                  className="text-[11px] tracking-[0.1em] text-landing-muted"
                  initial={{ opacity: 0.5 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  {feature.step}
                </motion.p>
                <h3 className="mt-2 font-[family-name:var(--font-body)] text-[22px] font-extrabold text-landing-ink transition-colors group-hover:text-landing-purple">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-landing-muted">
                  {feature.description}
                </p>
              </div>

              <motion.div
                className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-landing-purple"
                initial={{ scaleX: 0.3 }}
                whileInView={{ scaleX: 1 }}
                whileHover={{ scaleX: 1, height: 4 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
