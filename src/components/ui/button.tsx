"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Paper & ink buttons. Fully rounded.
 * primary = ink-blue accent · ink = inverted (wallet/account) · secondary = surface + hairline · ghost = transparent
 * "signal" is kept as an alias of primary for existing call sites.
 */
type Variant = "primary" | "signal" | "ink" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[#2330b8]",
  signal: "bg-accent text-white hover:bg-[#2330b8]",
  ink: "bg-ink text-paper hover:bg-[#2a2620]",
  secondary: "border border-line-2 bg-surface text-text hover:border-line-3 hover:bg-surface-3",
  ghost: "text-text-2 hover:bg-surface-3 hover:text-text",
  danger: "border border-red/30 bg-red/[0.06] text-red hover:bg-red/[0.1]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
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

/** Link styled as a button (kept name for existing call sites; no magnetic motion in this system). */
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
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
