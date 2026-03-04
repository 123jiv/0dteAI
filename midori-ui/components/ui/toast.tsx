"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info" | "default";

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastContextValue = {
  toasts: ToastData[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, type: ToastType = "default", duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  removeToast
}: {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}) {
  return (
    <div
      className="fixed right-4 top-4 z-[100] flex max-h-[100vh] w-full max-w-[380px] flex-col gap-2 overflow-hidden"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  type,
  onDismiss
}: ToastData & { onDismiss: () => void }) {
  const borderClass =
    type === "success"
      ? "border-l-green"
      : type === "error"
      ? "border-l-red-400"
      : type === "warning"
      ? "border-l-yellow-400"
      : "border-l-border";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[12px] border border-border border-l-4 bg-bg3 px-4 py-3 text-sm text-text shadow-lg toast-enter",
        borderClass
      )}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-muted hover:text-text"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
