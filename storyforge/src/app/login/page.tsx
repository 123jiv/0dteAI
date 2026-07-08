"use client";

import { motion } from "framer-motion";
import { Crown, KeyRound, LogOut, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { Button, Card, Field, Input } from "@/components/ui";
import {
  fetchBillingStatus,
  openBillingPortal,
  startCheckout,
  type BillingStatus,
} from "@/lib/billing-client";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    void fetchBillingStatus().then(setBilling);
  }, [userEmail]);

  const submit = async () => {
    const sb = getSupabase();
    if (!sb || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data } = await sb.auth.getUser();
        setUserEmail(data.user?.email ?? null);
        setMessage("Signed in — your stories will sync to the cloud.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to sync your library across devices. Without an account everything still works —
            stories are saved on this device.
          </p>

          <Card className="mt-8 p-6">
            {!supabaseEnabled() ? (
              <div className="space-y-3 text-sm text-muted">
                <p className="flex items-center gap-2 font-medium text-fg">
                  <KeyRound size={15} className="text-accent-strong" /> Cloud sync not configured
                </p>
                <p>
                  Add <code className="rounded bg-glass px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                  and <code className="rounded bg-glass px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                  to <code className="rounded bg-glass px-1.5 py-0.5 text-xs">.env.local</code> to enable
                  accounts and cloud-saved stories. The schema is documented in{" "}
                  <code className="rounded bg-glass px-1.5 py-0.5 text-xs">src/lib/supabase.ts</code>.
                </p>
              </div>
            ) : userEmail ? (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-sm">
                  <Mail size={15} className="text-accent-strong" /> Signed in as{" "}
                  <span className="font-medium">{userEmail}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await getSupabase()?.auth.signOut();
                    setUserEmail(null);
                    setMessage("Signed out.");
                  }}
                >
                  <LogOut size={14} /> Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && void submit()}
                  />
                </Field>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="text-xs text-muted underline-offset-2 hover:underline cursor-pointer"
                  >
                    {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
                  </button>
                  <Button onClick={() => void submit()} disabled={busy || !email || !password}>
                    {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
                  </Button>
                </div>
              </div>
            )}
            {message && <p className="mt-4 text-xs text-accent-strong">{message}</p>}
          </Card>

          {billing?.enabled && userEmail && (
            <Card className="mt-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Crown size={15} className="text-accent-strong" />
                    {billing.plan === "pro" ? "StoryForge Pro" : "Free plan"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {billing.plan === "pro"
                      ? "Unlimited chapters. Thank you for supporting StoryForge!"
                      : `${billing.chaptersUsed ?? 0} of ${billing.freeLimit ?? 0} free chapters used this month.`}
                  </p>
                </div>
                {billing.plan === "pro" ? (
                  <Button variant="outline" onClick={() => void openBillingPortal()}>
                    Manage
                  </Button>
                ) : (
                  <Button onClick={() => void startCheckout()}>
                    Upgrade · {billing.priceLabel}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
