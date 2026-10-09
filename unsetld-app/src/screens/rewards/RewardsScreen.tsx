import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { accessState, milestoneStatus, REOPEN_AFTER, ROAD, roadPosition, type MilestoneStatus } from '../../core/record';
import { rewardStatus, type RewardStatus } from '../../core/rewards';
import { shortDate, type DayKey } from '../../core/time';
import { milestoneNo } from '../../core/typography';
import type { Milestone, RewardTier } from '../../core/types';
import { MILESTONES, REWARD_TIERS, RULES } from '../../content';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { openStore, redeem } from '../../services/access';
import { light } from '../../services/haptics';
import { useBalance, useNextReward, useRewardTiers } from '../../state/missions';
import { useAccessEnabled, useApp } from '../../state/store';
import { showActions, showDialog } from '../../ui/actions';
import { Button, InlineLink, NavRow, Screen, TextButton } from '../../ui/kit';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/text';
import { color as C, ease, hairline, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';
import { accessDays, accessRecord } from '../access';
import { milestoneStatusText } from '../MilestoneScreen';

const R = REWARDS_COPY;

/** A 2pt progress bar, bone on rule. */
function Bar({ value, max, style }: { value: number; max: number; style?: StyleProp<ViewStyle> }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[{ height: 2, backgroundColor: C.rule }, style]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={{ height: 2, width: `${pct * 100}%`, backgroundColor: C.bone }} />
    </View>
  );
}

/** A row between hairlines: the tier list, your codes, how points are earned, Access. */
const rowStyle = (last: boolean, pressed = false): ViewStyle => ({
  minHeight: 64,
  paddingVertical: 12,
  flexDirection: 'row',
  alignItems: 'center',
  borderTopWidth: hairline,
  borderBottomWidth: last ? hairline : 0,
  borderColor: C.rule,
  opacity: pressed ? 0.6 : 1,
});

function statusText(s: RewardStatus, need: number): string {
  switch (s) {
    case 'ready':
      return R.status.ready;
    case 'short':
      return R.status.short(need);
    case 'used':
      return R.status.used;
    case 'unavailable':
      return R.status.unavailable;
  }
}

/** One reward: points, title and detail, status. Tappable when ready. */
function TierRow({ tier, status, need, last, busy, onPress }: { tier: RewardTier; status: RewardStatus; need: number; last: boolean; busy: boolean; onPress: () => void }) {
  const ready = status === 'ready';
  const text = statusText(status, need);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={R.tierA11y(tier.title, tier.points, tier.detail, text)}
      // aria-* rather than accessibilityState: react-native-web only reads the former.
      aria-disabled={!ready || busy}
      aria-busy={busy}
      disabled={!ready || busy}
      onPress={onPress}
      style={({ pressed }) => rowStyle(last, pressed)}>
      <T v="mono" color={ready ? C.bone : C.stone} style={{ width: 56 }}>
        {R.tierPoints(tier.points)}
      </T>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="row" color={ready ? C.bone : status === 'unavailable' ? C.stone : C.muted}>
          {tier.title}
        </T>
        {tier.detail ? (
          <T v="note" color={C.stone}>
            {tier.detail}
          </T>
        ) : null}
      </View>
      <T v="label" color={ready ? C.bone : C.stone} style={{ maxWidth: 112, textAlign: 'right' }}>
        {text}
      </T>
    </Pressable>
  );
}

interface CodeItem {
  key: string;
  title: string;
  code: string;
  url: string;
  day: DayKey;
  expires: DayKey;
}

function CodeRow({ item, expired, last }: { item: CodeItem; expired: boolean; last: boolean }) {
  const until = expired ? R.expired : R.untilShort(shortDate(item.expires));
  const open = () =>
    showActions({
      title: item.code,
      options: [
        { label: R.copyCode, onPress: () => copyCode(item.code) },
        { label: R.use, onPress: () => openStore(item.url) },
        { label: R.cancel, cancel: true },
      ],
    });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={R.codeA11y(item.title, item.code, until)}
      accessibilityHint={expired ? undefined : R.codeHint}
      aria-disabled={expired}
      disabled={expired}
      onPress={open}
      style={({ pressed }) => rowStyle(last, pressed)}>
      <View style={{ flex: 1, paddingRight: 12, gap: 4 }}>
        <T v="row" color={expired ? C.stone : C.bone}>
          {item.title}
        </T>
        <T v="mono" color={expired ? C.stone : C.bone}>
          {item.code}
        </T>
      </View>
      <T v="label" color={C.stone}>
        {until}
      </T>
    </Pressable>
  );
}

function copyCode(code: string) {
  Clipboard.setStringAsync(code).catch(() => {});
  light();
  AccessibilityInfo.announceForAccessibility(R.copied);
}

/** How points come in: a row per mission length, and the perfect-day bonus. `said` reads the value aloud. */
function EarnRow({ title, value, said, note, last }: { title: string; value: string; said: string; note?: string; last?: boolean }) {
  return (
    <View style={[rowStyle(Boolean(last)), { minHeight: 52 }]} accessible accessibilityLabel={note ? `${title}, ${said}. ${note}` : `${title}, ${said}`}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="row">{title}</T>
        {note ? (
          <T v="note" color={C.stone}>
            {note}
          </T>
        ) : null}
      </View>
      <T v="mono" color={C.bone}>
        {value}
      </T>
    </View>
  );
}

/** The road to 365, in days proven. The walker walks only when the count has changed since it last showed. */
function Road({ width, n }: { width: number; n: number }) {
  const target = roadPosition(n) * width;
  const [x] = useState(() => new Animated.Value(roadPosition(useApp.getState().reading?.road ?? 0) * width));
  useEffect(() => {
    let live = true;
    // Reduce Motion: no walk; the walker and the walked line move straight there.
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        if (reduce) x.setValue(target);
        else Animated.timing(x, { toValue: target, duration: 300, easing: ease.out, useNativeDriver: false }).start();
      });
    useApp.getState().markRoad(n);
    return () => {
      live = false;
    };
  }, [n, target, x]);
  const walkerW = 22;
  return (
    <View style={{ width, height: 56 }} accessible accessibilityLabel={R.road(n)}>
      <View style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 1, backgroundColor: C.ruleStrong }} />
      <Animated.View style={{ position: 'absolute', top: 36, left: 0, width: x, height: 1.5, backgroundColor: C.bone }} />
      {ROAD.map((d, i) => {
        const tx = (width * (i + 1)) / ROAD.length;
        const passed = n >= d;
        const lastOne = i === ROAD.length - 1;
        return (
          <View key={d}>
            <View style={{ position: 'absolute', top: 32, left: tx - (lastOne ? 1 : 0.5), width: 1, height: 8, backgroundColor: passed ? C.bone : C.ruleStrong }} />
            <View style={{ position: 'absolute', top: 44, ...(lastOne ? { right: 0 } : { left: tx - 20, width: 40, alignItems: 'center' }) }}>
              <T v="mono.s" color={passed ? C.bone : C.stone}>
                {String(d)}
              </T>
            </View>
          </View>
        );
      })}
      <Animated.View style={{ position: 'absolute', top: 36 - 49, left: -walkerW / 2, transform: [{ translateX: x }] }}>
        <Walker height={49} />
      </Animated.View>
    </View>
  );
}

function MilestoneRow({ m, status, onPress, last }: { m: Milestone; status: MilestoneStatus; onPress: () => void; last: boolean }) {
  const open = status.kind !== 'locked';
  const text = milestoneStatusText(status);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={R.milestoneA11y(m.day, m.title, m.short, text)}
      onPress={onPress}
      style={({ pressed }) => rowStyle(last, pressed)}>
      <T v="mono" color={open ? C.bone : C.stone} style={{ width: 56 }}>
        {milestoneNo(m.day)}
      </T>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="row" color={open ? C.bone : C.muted}>
          {m.title}
        </T>
        <T v="note" color={C.stone}>
          {m.short}
        </T>
      </View>
      <T v="label" color={status.kind === 'open' ? C.bone : C.stone}>
        {text}
      </T>
    </Pressable>
  );
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
      <T v="label">{R.codeLabel}</T>
      <T v="title.m" style={{ marginTop: 8 }} accessibilityRole="header">
        {minted.title}
      </T>
      <View style={{ marginTop: 24, minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: C.rule }}>
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
          style={({ pressed }) => ({ minHeight: 44, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T v="button" color={C.bone}>
            {copied ? R.copied : R.copy}
          </T>
        </Pressable>
      </View>
      <T v="note" color={C.stone} style={{ marginTop: 12 }}>
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
 * Rewards (spec section 10): the balance, the next reward, every tier with its
 * status and the redeem flow, your codes, how points are earned, and Access
 * (early access, the patch, the 365 piece). With Access off, only the points
 * and how they're earned show.
 */
export function RewardsScreen({ navigation }: RootProps<'Rewards'>) {
  const { width, height } = useWindowDimensions();
  const w = width - MARGIN * 2;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const balance = useBalance();
  const tiers = useRewardTiers();
  const next = useNextReward(day);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<Minted | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const titleOf = (id: string) => (tiers.find(t => t.id === id) ?? REWARD_TIERS.find(t => t.id === id))?.title ?? R.unknownReward;
  const codes: CodeItem[] = [
    ...(record.redemptions ?? []).map((r, i) => ({ key: `r${i}:${r.code}`, title: titleOf(r.rewardId), code: r.code, url: r.url, day: r.day, expires: r.expires })),
    ...(record.codes ?? []).map((c, i) => ({ key: `c${i}:${c.code}`, title: R.legacyTitle(c.percent), code: c.code, url: c.url, day: c.day, expires: c.expires })),
  ].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

  const ar = accessRecord(record);
  const proven = accessDays(record);
  const access = accessState(ar, day);
  const paused = access.paused;

  const run = async (tier: RewardTier) => {
    if (!useApp.getState().account.userId) {
      navigation.navigate('Account');
      return;
    }
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
      setMinted({ title: tier.title, code: r.code, url: r.url, expires: taken?.expires ?? day, simulated: Boolean(r.simulated) });
      setSheetOpen(true);
    } else if (r.reason === 'needs-account') navigation.navigate('Account');
    else setError(R.errors[r.reason]);
  };

  const take = (tier: RewardTier) => {
    if (busy) return;
    showDialog(R.confirmTitle(tier.points), R.confirmBody(tier.title, tier.detail, tier.codeValidDays), [
      { label: R.confirmNo, cancel: true },
      { label: R.confirmYes, onPress: () => void run(tier) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
        <T v="title.xl" accessibilityRole="header" style={{ marginTop: 24 }}>
          {R.title}
        </T>
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessible accessibilityLabel={R.balanceA11y(balance)}>
          <T v="letter.day">{R.number(balance)}</T>
          <T v="label">{R.balanceUnit(balance)}</T>
        </View>

        {accessEnabled ? (
          next ? (
            <Pressable
              accessibilityRole={next.ready ? 'button' : undefined}
              accessibilityLabel={R.nextA11y(next.tier.title, next.need)}
              disabled={!next.ready || busy !== null}
              onPress={() => take(next.tier)}
              style={({ pressed }) => ({ marginTop: 32, opacity: pressed ? 0.6 : 1 })}>
              <T v="label">{R.next}</T>
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <T v="label" color={C.bone} style={{ flexShrink: 1 }}>
                  {next.tier.title}
                </T>
                <T v="mono" color={C.bone}>
                  {R.have(Math.min(next.have, next.tier.points), next.tier.points)}
                </T>
              </View>
              <Bar value={next.have} max={next.tier.points} style={{ marginTop: 10 }} />
              <T v="mono" color={next.ready ? C.bone : C.stone} style={{ marginTop: 10 }}>
                {next.ready ? R.isReady(next.tier.title) : R.left(next.need)}
              </T>
            </Pressable>
          ) : (
            <T v="note" color={C.stone} style={{ marginTop: 24 }}>
              {sorted.some(t => rewardStatus(record, t, collection, day) === 'used') ? R.allTaken : R.noneOpen}
            </T>
          )
        ) : null}

        {accessEnabled ? (
          <View style={{ marginTop: 40 }}>
            <T v="label" accessibilityRole="header">
              {R.tiers}
            </T>
            <View style={{ marginTop: 8 }}>
              {sorted.map((t, i) => (
                <TierRow
                  key={t.id}
                  tier={t}
                  status={rewardStatus(record, t, collection, day)}
                  need={Math.max(0, t.points - balance)}
                  last={i === sorted.length - 1}
                  busy={busy !== null}
                  onPress={() => take(t)}
                />
              ))}
            </View>
            {busy ? (
              <T v="note" color={C.stone} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
                {R.working}
              </T>
            ) : null}
            {error ? (
              <T v="note" color={C.stone} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
                {error}
              </T>
            ) : null}
            {!signedIn ? (
              <View style={{ marginTop: 16, gap: 6 }}>
                <T v="note" color={C.stone}>
                  {R.signInNote}
                </T>
                <InlineLink v="note" title={R.signIn} onPress={() => navigation.navigate('Account')} />
              </View>
            ) : null}
          </View>
        ) : null}

        {accessEnabled && codes.length ? (
          <View style={{ marginTop: 40 }}>
            <T v="label" accessibilityRole="header">
              {R.codes}
            </T>
            <View style={{ marginTop: 8 }}>
              {codes.map((c, i) => (
                <CodeRow key={c.key} item={c} expired={day > c.expires} last={i === codes.length - 1} />
              ))}
            </View>
            {Platform.OS === 'web' ? (
              <T v="mono.s" style={{ marginTop: 8 }}>
                {R.previewCode}
              </T>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 40 }}>
          <T v="label" accessibilityRole="header">
            {R.earning}
          </T>
          <T v="note" color={C.stone} style={{ marginTop: 8 }}>
            {R.earningNote}
          </T>
          <View style={{ marginTop: 12 }}>
            {R.earningRows.map(row => (
              <EarnRow key={row.title} title={row.title} value={row.value} said={row.said} />
            ))}
            <EarnRow title={R.perfect} value={R.plus(RULES.perfectDayBonus)} said={R.plusSaid(RULES.perfectDayBonus)} note={R.perfectNote} last />
          </View>
          <T v="note" color={C.stone} style={{ marginTop: 12 }}>
            {R.earnedOnly}
          </T>
        </View>

        {accessEnabled ? (
          <View>
            <T v="title.m" accessibilityRole="header" style={{ marginTop: 48 }}>
              {R.access}
            </T>
            <T v="note" color={C.stone} style={{ marginTop: 4 }}>
              {R.accessNote}
            </T>
            <View style={{ marginTop: 32 }}>
              <Road width={w} n={proven} />
            </View>
            {paused ? (
              <T v="note" color={C.stone} style={{ marginTop: 12 }}>
                {R.pausedNote(Math.max(1, REOPEN_AFTER - access.reopenProgress))}
              </T>
            ) : null}
            <View style={{ marginTop: 24 }}>
              {MILESTONES.map((m, i) => (
                <MilestoneRow
                  key={m.id}
                  m={m}
                  status={milestoneStatus(ar, m, day)}
                  last={i === MILESTONES.length - 1}
                  onPress={() => navigation.navigate('Milestone', { id: m.id })}
                />
              ))}
            </View>
            <TextButton title={R.terms} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: 16 }} />
          </View>
        ) : null}
        <View style={{ height: 48 }} />
      </Screen>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        detent={Math.min(0.85, 520 / Math.max(1, height))}
        accessibilityLabel={R.sheetA11y}
        footer={
          minted ? (
            <View style={{ paddingHorizontal: MARGIN, gap: 4 }}>
              <Button title={R.use} onPress={() => openStore(minted.url)} />
              <TextButton title={R.done} onPress={() => setSheetOpen(false)} />
            </View>
          ) : null
        }>
        {minted ? <MintedCode key={minted.code} minted={minted} /> : null}
      </Sheet>
    </View>
  );
}
