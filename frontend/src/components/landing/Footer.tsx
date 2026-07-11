"use client";

import { motion } from "framer-motion";

import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border-t border-border"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-8 lg:px-12">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Logo size="sm" />
        </motion.div>
      </div>
    </motion.footer>
  );
}
