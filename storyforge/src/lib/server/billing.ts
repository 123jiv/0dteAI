import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side billing + entitlements.
 *
 * The paywall is dormant until ALL of these env vars are set:
 *   STRIPE_SECRET_KEY, STRIPE_PRICE_ID,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Without them the app behaves exactly as before (no accounts required).
 */

export const FREE_LIMIT = Math.max(0, parseInt(process.env.FREE_CHAPTERS_PER_MONTH || "5", 10) || 5);
export const PRICE_LABEL = process.env.PRO_PRICE_LABEL || "$9.99/month";

export function paywallEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripe;
}

let admin: SupabaseClient | null = null;
export function getAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return admin;
}

export interface BillingUser {
  id: string;
  email: string;
}

/** Resolve the signed-in user from the request's Authorization: Bearer <jwt>. */
export async function getUserFromRequest(req: Request): Promise<BillingUser | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

const monthKey = () => new Date().toISOString().slice(0, 7); // "2026-07"

export interface Entitlement {
  plan: "free" | "pro";
  chaptersUsed: number;
  freeLimit: number;
}

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const db = getAdmin();
  const [{ data: profile }, { data: usage }] = await Promise.all([
    db.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    db.from("usage").select("chapters").eq("user_id", userId).eq("month", monthKey()).maybeSingle(),
  ]);
  return {
    plan: profile?.plan === "pro" ? "pro" : "free",
    chaptersUsed: usage?.chapters ?? 0,
    freeLimit: FREE_LIMIT,
  };
}

/** Count one generated chapter against the current month. */
export async function recordChapter(userId: string): Promise<void> {
  const db = getAdmin();
  const month = monthKey();
  const { data } = await db
    .from("usage")
    .select("chapters")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  await db
    .from("usage")
    .upsert({ user_id: userId, month, chapters: (data?.chapters ?? 0) + 1 });
}

/** Get (or lazily create) the Stripe customer for a user. */
export async function ensureCustomer(user: BillingUser): Promise<string> {
  const db = getAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: user.email || undefined,
    metadata: { supabase_user_id: user.id },
  });
  await db.from("profiles").upsert({
    id: user.id,
    email: user.email,
    stripe_customer_id: customer.id,
    updated_at: new Date().toISOString(),
  });
  return customer.id;
}

/** Called from the Stripe webhook to flip a user's plan. */
export async function setPlanByCustomer(
  customerId: string,
  plan: "free" | "pro",
  periodEnd: number | null
): Promise<void> {
  await getAdmin()
    .from("profiles")
    .update({
      plan,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);
}
