"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { FloatingShapes } from "@/components/landing/FloatingShapes";

const spring = { type: "spring" as const, stiffness: 120, damping: 14 };

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
};

const headlineLines = [
  { text: "Sketch it.", className: "text-landing-ink" },
  { text: "Play it.", className: "text-landing-purple" },
  { text: "Ship it.", className: "text-landing-ink" },
] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <FloatingShapes />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 pt-24 lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-12 lg:pb-24 lg:pt-32"
      >
        <div className="flex flex-col">
          <motion.h1
            variants={item}
            className="font-heading text-5xl font-bold leading-[1.08] tracking-[-0.025em] sm:text-6xl lg:text-[64px]"
          >
            {headlineLines.map((line, index) => (
              <motion.span
                key={line.text}
                className={`block ${line.className}`}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  ...spring,
                  delay: 0.15 + index * 0.12,
                }}
                whileHover={
                  line.text === "Play it."
                    ? { scale: 1.03, transition: { type: "spring", stiffness: 400 } }
                    : undefined
                }
              >
                {line.text}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-md text-base leading-relaxed text-landing-muted"
          >
            Sketch your level. Describe the objective. Playbox understands your
            drawing and instantly transforms it into a playable game.
          </motion.p>

          <motion.div variants={item} className="mt-10">
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.98, y: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-landing-purple px-6 py-3.5 text-[15px] font-bold text-white shadow-landing-cta"
              >
                <motion.span
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: [0, -8, 8, -4, 0] }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "easeInOut",
                  }}
                  className="inline-flex"
                >
                  <Image
                    src="/landing/icon-pencil.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden
                    className="transition-transform group-hover:scale-110"
                  />
                </motion.span>
                Start sketching
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          variants={item}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -10, 0], rotate: [0, 0.6, 0, -0.6, 0] }
          }
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <Image
              src="/landing/hero-illustration.svg"
              alt="Person sketching a game level on a canvas"
              width={505}
              height={356}
              className="h-auto w-full"
              priority
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
