"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "motion/react";
import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "signal" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform,opacity] duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // key-cap: white face with an inset bottom edge
  primary:
    "bg-white text-ink shadow-[inset_0_-2px_0_rgba(0,0,0,0.18),0_1px_0_rgba(255,255,255,0.4)] hover:bg-[#f1f1f6]",
  // live signal: the pink "REC" button
  signal:
    "bg-pink text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,43,190,0.6),0_8px_30px_-8px_rgba(255,43,190,0.7)] hover:bg-[#ff45c8]",
  secondary:
    "bg-surface-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_-2px_0_rgba(0,0,0,0.3)] hover:bg-surface-3",
  ghost: "text-muted hover:bg-white/[0.05] hover:text-white",
  danger: "bg-bad/12 text-bad shadow-[inset_0_0_0_1px_rgba(255,84,112,0.35)] hover:bg-bad/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-12 px-6 text-[14.5px]",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
});

/** Subtly magnetic link-button for hero CTAs. */
export function MagneticLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.15);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.2);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-block"
    >
      <Link href={href} className={buttonClass(variant, size, className)}>
        {children}
      </Link>
    </motion.div>
  );
}
