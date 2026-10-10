// The redeem flow, shared by the Rewards tab (the next reward's "Get the code") and All
// rewards (any ready tier): sign in if needed, confirm, ask unsetld.com for the code, then
// show it in a sheet to copy or use. Plus the small pieces those pages share.
import { useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, useWindowDimensions, View } from 'react-native';
import { shortDate, type DayKey } from '../../core/time';
import { rewardStatus, type RewardStatus } from '../../core/rewards';
import type { RewardTier } from '../../core/types';
import { REWARDS_COPY } from '../../content/copy/rewards';
import { openStore, redeem } from '../../services/access';
import { light } from '../../services/haptics';
import { useApp } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { Button, TextButton } from '../../ui/kit';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/text';
import { color as C, MARGIN, radius } from '../../ui/tokens';

const R = REWARDS_COPY;

/** Serif numbers in lining figures ("10% off", "1,000"): Cormorant's old-style 1 reads as an I. */
export const LINING = { fontVariant: ['lining-nums' as const] };

export function copyCode(code: string) {
  Clipboard.setStringAsync(code).catch(() => {});
  light();
  AccessibilityInfo.announceForAccessibility(R.copied);
}

/** A small filled button for a card ("Get the code"): obvious, not page-wide. */
export function SmallButton({ title, onPress, disabled, accessibilityLabel }: { title: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      // aria-* rather than accessibilityState: react-native-web only reads the former.
      aria-disabled={Boolean(disabled)}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        minHeight: 38,
        paddingHorizontal: 16,
        borderRadius: radius.button,
        justifyContent: 'center',
        backgroundColor: disabled ? 'transparent' : C.bone,
        borderWidth: disabled ? 1 : 0,
        borderColor: C.ash,
        opacity: pressed && !disabled ? 0.85 : 1,
      })}>
      <T v="button" color={disabled ? C.ash : C.ink}>
        {title}
      </T>
    </Pressable>
  );
}

/** Ready / 220 to go / Used this collection / Used / Cooling down / Not available. */
export function statusText(s: RewardStatus, tier: RewardTier, need: number): string {
  switch (s) {
    case 'ready':
      return R.all.status.ready;
    case 'short':
      return R.all.status.short(need);
    case 'used':
      return tier.oneTimeOnly ? R.all.status.usedOnce : R.all.status.used;
    case 'cooldown':
      return R.all.status.cooldown;
    case 'unavailable':
      return R.all.status.unavailable;
  }
}

interface Minted {
  title: string;
  code: string;
  url: string;
  expires: DayKey;
  simulated: boolean;
}

/** The code right after redeeming: copy it, use it, when it runs out. */
function MintedCode({ minted }: { minted: Minted }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ paddingHorizontal: MARGIN, paddingTop: 12 }}>
      <T v="kicker" color={C.stone}>
        {R.codeLabel}
      </T>
      <T v="title.m" style={[LINING, { marginTop: 8 }]} accessibilityRole="header">
        {minted.title}
      </T>
      <View style={{ marginTop: 24, minHeight: 64, paddingLeft: 18, paddingRight: 8, borderRadius: radius.card, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center' }}>
        <T v="mono.l" color={C.bone} selectable style={{ flex: 1, fontSize: 22, lineHeight: 28, paddingRight: 12 }}>
          {minted.code}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={R.copyA11y(minted.code)}
          onPress={() => {
            copyCode(minted.code);
            setCopied(true);
          }}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 44, minWidth: 64, paddingHorizontal: 10, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T v="body" color={C.bone}>
            {copied ? R.copied : R.copy}
          </T>
        </Pressable>
      </View>
      <T v="meta" color={C.stone} style={{ marginTop: 12 }}>
        {R.worksUntil(shortDate(minted.expires))}
      </T>
      {minted.simulated ? (
        <T v="mono.s" style={{ marginTop: 6 }}>
          {R.previewCode}
        </T>
      ) : null}
      <T v="italic" color={C.stone} style={{ marginTop: 28 }}>
        {R.never}
      </T>
    </View>
  );
}

/**
 * Taking a reward. `take(tier)` signs in first when there's no account (the code needs
 * one), then confirms, then asks unsetld.com for the code and shows it in `sheet`, which
 * the page renders last so it sits over everything. Back from signing in, the confirm
 * opens without another tap; back without an account, nothing does. `busy` is the tier
 * being taken; `noteFor(id)` is the line to show under that tier ("Getting your code…" or
 * what went wrong).
 */
export function useRedeem(onNeedsAccount: () => void): {
  busy: string | null;
  noteFor: (tierId: string) => string | null;
  take: (tier: RewardTier) => void;
  sheet: ReactNode;
} {
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  const [minted, setMinted] = useState<Minted | null>(null);
  const [open, setOpen] = useState(false);
  // The tier that sent the user to sign in, until the page is back in focus.
  const pending = useRef<RewardTier | null>(null);
  const needsAccount = (tier: RewardTier) => {
    pending.current = tier;
    onNeedsAccount();
  };

  const run = async (tier: RewardTier) => {
    setBusy(tier.id);
    setError(null);
    let r: Awaited<ReturnType<typeof redeem>>;
    try {
      r = await redeem(tier);
    } catch {
      r = { ok: false, reason: 'network' };
    } finally {
      setBusy(null);
    }
    if (r.ok) {
      useApp.getState().redeemReward(tier, { code: r.code, url: r.url });
      const all = useApp.getState().record.redemptions ?? [];
      const taken = all[all.length - 1];
      light();
      setMinted({ title: tier.title, code: r.code, url: r.url, expires: taken?.expires ?? useApp.getState().currentDay, simulated: Boolean(r.simulated) });
      setOpen(true);
    } else if (r.reason === 'needs-account') needsAccount(tier);
    else setError({ id: tier.id, text: R.errors[r.reason] });
  };

  const confirm = (tier: RewardTier) =>
    showDialog(R.confirmTitle(tier.points), R.confirmBody(tier), [
      { label: R.confirmNo, cancel: true },
      { label: R.confirmYes, onPress: () => void run(tier) },
    ]);

  const take = (tier: RewardTier) => {
    if (busy) return;
    if (!useApp.getState().account.userId) return needsAccount(tier);
    confirm(tier);
  };

  // Back on the page: signed in now, so carry on to the confirm if the reward is still
  // ready; no account (sign-in cancelled or backed out of), so forget it.
  const focused = useIsFocused();
  const resume = useEffectEvent(() => {
    const tier = pending.current;
    pending.current = null;
    const s = useApp.getState();
    if (tier && s.account.userId && rewardStatus(s.record, tier, s.remote.collection, s.currentDay) === 'ready') confirm(tier);
  });
  useEffect(() => {
    if (focused) resume();
  }, [focused]);

  const sheet = (
    <Sheet
      modal
      visible={open}
      onClose={() => setOpen(false)}
      detent={Math.min(0.85, 520 / Math.max(1, height))}
      accessibilityLabel={R.sheetA11y}
      footer={
        minted ? (
          <View style={{ paddingHorizontal: MARGIN, gap: 4 }}>
            <Button title={R.use} onPress={() => openStore(minted.url)} />
            <TextButton title={R.done} onPress={() => setOpen(false)} />
          </View>
        ) : null
      }>
      {minted ? <MintedCode key={minted.code} minted={minted} /> : null}
    </Sheet>
  );

  const noteFor = (id: string) => (busy === id ? R.working : error?.id === id ? error.text : null);

  return { busy, noteFor, take, sheet };
}

/** "Getting your code…", or what went wrong, under the reward that was tapped. */
export function RedeemNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <T v="note" color={C.stone} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
      {text}
    </T>
  );
}
