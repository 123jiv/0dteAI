"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────── Buttons ────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-fg text-bg hover:opacity-85 font-medium shadow-[0_0_24px_rgba(255,255,255,0.08)]",
  ghost: "text-muted hover:text-fg hover:bg-glass",
  outline: "border border-edge-strong text-fg hover:bg-glass",
  danger: "text-red-400 hover:bg-red-500/10",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  );
}

/* ─────────────────────────────── Fields ────────────────────────────── */

const fieldBase =
  "w-full rounded-xl bg-glass border border-edge px-3.5 py-2.5 text-sm text-fg placeholder:text-faint outline-none focus:border-edge-strong transition-colors";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, "resize-none", props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(fieldBase, "appearance-none cursor-pointer", props.className)}>
      {children}
    </select>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium uppercase tracking-wider text-muted">
        {label}
        {hint && <span className="normal-case tracking-normal text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ─────────────────────────────── Cards ─────────────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-all duration-150 cursor-pointer",
        active
          ? "border-accent bg-accent/15 text-accent-strong"
          : "border-edge text-muted hover:border-edge-strong hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────── Modal ─────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "glass w-full rounded-t-3xl sm:rounded-3xl bg-raised max-h-[88vh] overflow-y-auto",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg"
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-raised/90 backdrop-blur px-6 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted hover:bg-glass hover:text-fg cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────────── Loading bits ────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-faint">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted">{subtitle}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
