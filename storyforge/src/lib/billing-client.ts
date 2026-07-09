"use client";

import { create } from "zustand";
import { getSupabase } from "./supabase";

/* ─────────────────────────── Auth helpers ─────────────────────────── */

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ─────────────────────────── Billing status ───────────────────────── */

export interface BillingStatus {
  enabled: boolean;
  signedIn?: boolean;
  email?: string;
  plan?: "free" | "pro";
  chaptersUsed?: number;
  freeLimit?: number;
  priceLabel?: string;
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  try {
    const res = await fetch("/api/billing/status", { headers: await authHeaders() });
    if (!res.ok) return { enabled: false };
    return (await res.json()) as BillingStatus;
  } catch {
    return { enabled: false };
  }
}

export async function startCheckout(): Promise<string | null> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (data.url) {
    window.location.href = data.url;
    return null;
  }
  return data.error ?? "Could not start checkout.";
}

export async function openBillingPortal(): Promise<string | null> {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (data.url) {
    window.location.href = data.url;
    return null;
  }
  return data.error ?? "Could not open the billing portal.";
}

/* ───────────────────────── Paywall modal state ────────────────────── */

export type PaywallReason = "auth" | "paywall";

interface PaywallState {
  open: boolean;
  reason: PaywallReason;
  message: string;
  show: (reason: PaywallReason, message?: string) => void;
  hide: () => void;
}

export const usePaywall = create<PaywallState>((set) => ({
  open: false,
  reason: "paywall",
  message: "",
  show: (reason, message = "") => set({ open: true, reason, message }),
  hide: () => set({ open: false }),
}));
