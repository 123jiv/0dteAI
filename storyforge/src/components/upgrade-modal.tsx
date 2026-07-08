"use client";

import { Check, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";
import {
  fetchBillingStatus,
  startCheckout,
  usePaywall,
  type BillingStatus,
} from "@/lib/billing-client";

const PERKS = [
  "Unlimited chapters, every month",
  "Unlimited stories and rewrites",
  "Full story memory — infinite continuations",
  "Every export format (PDF, EPUB, Markdown)",
];

export function UpgradeModal() {
  const { open, reason, message, hide } = usePaywall();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void fetchBillingStatus().then(setStatus);
  }, [open]);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    const err = await startCheckout();
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={hide}
      title={reason === "auth" ? "Create your free account" : "Go unlimited"}
    >
      {reason === "auth" ? (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            {message || "Sign in to keep writing — it takes ten seconds, and your stories sync to the cloud."}
          </p>
          <Link href="/login" onClick={hide}>
            <Button className="w-full">
              <Sparkles size={15} /> Sign in / Sign up
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            {message || "You've reached this month's free chapters."} Upgrade to StoryForge Pro and
            never hit a wall mid-story again.
          </p>

          <div className="rounded-2xl border border-accent/40 bg-accent/8 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                <Crown size={16} className="text-accent-strong" /> StoryForge Pro
              </span>
              <span className="text-lg font-semibold text-accent-strong">
                {status?.priceLabel ?? ""}
              </span>
            </div>
            <ul className="space-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={15} className="mt-0.5 shrink-0 text-accent-strong" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {status?.signedIn && typeof status.chaptersUsed === "number" && (
            <p className="text-center text-xs text-faint">
              {status.chaptersUsed} of {status.freeLimit} free chapters used this month
            </p>
          )}

          <Button className="w-full" onClick={() => void upgrade()} disabled={busy}>
            {busy ? "Opening checkout…" : "Upgrade — cancel anytime"}
          </Button>
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
