"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useMounted } from "@/hooks/useMounted";

interface PanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Panel({ children, className = "", delay = 0 }: PanelProps) {
  const mounted = useMounted();

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`panel panel-glow rounded-lg ${className}`}
    >
      {children}
    </motion.div>
  );
}
