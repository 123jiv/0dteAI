import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, useWindowDimensions, View } from 'react-native';
import { nextStatus, roadAt, statusReward, statusState, type StatusState } from '../../core/rewards';
import { shortDate } from '../../core/time';
import type { Redemption, StatusTier } from '../../core/types';
import { DOCS } from '../../content';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { useAccessEnabled, useApp } from '../../state/store';
import { Card, Meter } from '../../ui/blocks';
import { NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, GAP, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';
import { accessDays, useStatusTiers } from '../access';
import { copyCode, LINING, RedeemNote, SmallButton, useRedeem } from './redeem';

const R = REWARDS_COPY;
const S = R.status;

/** Ready / Taken / 12 days to go: the same words here and on the tier's page. */
export function statusStateText(s: StatusState): string {
  switch (s.kind) {
    case 'ready':
      return S.state.ready;
    case 'taken':
      return S.state.taken;
    case 'locked':
      return S.state.left(s.daysLeft);
  }
}

/**
 * A status code taken: the code, when it runs out, and Copy while it still works. `large` on
 * the tier's page.
 */
export function TakenCode({ code, today, large }: { code: Redemption; today: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  const expired = today > code.expires;
  const line = S.codeLine(shortDate(code.expires), expired);
  return (
    <View>
      <T
        v="mono.l"
        color={expired ? C.stone : C.bone}
        selectable
        accessibilityLabel={S.codeA11y(code.code, line)}
        style={large ? { fontSize: 22, lineHeight: 28 } : undefined}>
        {code.code}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
        <T v="meta" color={C.stone} aria-hidden>
          {line}
        </T>
        {!expired ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={R.copyA11y(code.code)}
            onPress={() => {
              copyCode(code.code);
              setCopied(true);
            }}
            hitSlop={8}
            style={({ pressed }) => ({ minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <T v="body" color={C.bone}>
              {copied ? R.copied : R.copy}
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The road to the last tier, in days proven, with a tick at each tier's day. The walker
 * walks only when the count has changed since it last showed; with Reduce Motion it's
 * simply there.
 */
function Road({ width, n, days }: { width: number; n: number; days: readonly number[] }) {
  const target = roadAt(n, days) * width;
  const [x] = useState(() => new Animated.Value(roadAt(useApp.getState().reading?.road ?? 0, days) * width));
  useEffect(() => {
    let live = true;
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
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const last = sorted[sorted.length - 1] ?? 0;
  const walkerW = 22;
  return (
    <View style={{ width, height: 56 }} accessible accessibilityLabel={S.road(n, last)}>
      <View style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 1, backgroundColor: C.ruleStrong }} />
      <Animated.View style={{ position: 'absolute', top: 36, left: 0, width: x, height: 1.5, backgroundColor: C.bone }} />
      {sorted.map((d, i) => {
        const tx = roadAt(d, sorted) * width;
        const passed = n >= d;
        const lastOne = i === sorted.length - 1;
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

/** Width of the day-number column on a tier's row, and the space after it. */
const DAY_COL = 84;
const DAY_GAP = 14;

/**
 * One tier's row: its day number in serif, what it gives and where it stands, then what can
 * be done: Get the code (ready), the code and its last day (taken), or the next tier's meter.
 * Tiers further out are quieter.
 */
function TierRow({ tier, state, quiet, children }: { tier: StatusTier; state: StatusState; quiet: boolean; children?: ReactNode }) {
  const word = statusStateText(state);
  return (
    <Card>
      <View accessible accessibilityLabel={S.tierA11y(tier, word)} style={{ flexDirection: 'row', gap: DAY_GAP }}>
        <View style={{ width: DAY_COL }}>
          <T v="stat" color={quiet ? C.stone : C.bone} style={LINING}>
            {String(tier.day)}
          </T>
          <T v="note" color={C.stone} style={{ marginTop: 2 }}>
            {S.tierUnit(tier.day)}
          </T>
        </View>
        <View style={{ flex: 1, paddingTop: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <T v="list" color={quiet ? C.muted : C.bone} style={LINING}>
              {tier.title}
            </T>
            <T v="meta" color={state.kind === 'ready' ? C.bone : C.stone}>
              {word}
            </T>
          </View>
          <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
            {S.cap(tier)}
          </T>
        </View>
      </View>
      {children ? <View style={{ marginLeft: DAY_COL + DAY_GAP, marginTop: 14 }}>{children}</View> : null}
    </Card>
  );
}

/**
 * UNSETLD status (docs/UX_REDESIGN.md section 9): one discount code for each tier of days
 * proven (content/milestones.json, or the status list in unsetld.com's config), in day order.
 * A tier reached gets its code here, through the same redeem flow as a points reward (core/rewards
 * statusReward, for no points, once per person); a code taken shows with its last day; the next
 * tier has a quiet meter. Signed out, Get the code goes to Account first, as on Rewards.
 */
export function StatusScreen({ navigation }: RootProps<'Status'>) {
  const { width } = useWindowDimensions();
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const tiers = useStatusTiers();
  const { busy, noteFor, take, sheet } = useRedeem(() => navigation.navigate('Account'));
  const n = accessDays(record);
  const coming = nextStatus(n, tiers);
  const states = tiers.map(t => ({ tier: t, state: statusState(record, t, day) }));
  const anyReady = states.some(s => s.state.kind === 'ready');

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
        <PageTitle title={S.title} body={S.intro} />
        {!accessEnabled ? (
          <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
            {R.off}
          </T>
        ) : (
          <>
            {n > 0 ? (
              <View style={{ marginTop: GAP.block, flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessible accessibilityLabel={S.daysA11y(n)}>
                <T v="letter.day" style={LINING}>
                  {R.number(n)}
                </T>
                <T v="meta" color={C.stone}>
                  {S.daysUnit(n)}
                </T>
              </View>
            ) : (
              <T v="saved" color={C.muted} style={{ marginTop: GAP.block }}>
                {S.first}
              </T>
            )}

            {tiers.length ? (
              <View style={{ marginTop: GAP.section }}>
                <Road width={width - MARGIN * 2} n={n} days={tiers.map(t => t.day)} />
              </View>
            ) : null}

            <View style={{ marginTop: GAP.block, gap: GAP.card }}>
              {states.map(({ tier: t, state }) => {
                const isNext = coming?.id === t.id;
                return (
                  <TierRow key={t.id} tier={t} state={state} quiet={state.kind === 'locked' && !isNext}>
                    {state.kind === 'ready' ? (
                      <>
                        <SmallButton title={R.getCode} onPress={() => take(statusReward(t))} disabled={busy !== null} accessibilityLabel={`${R.getCode}: ${t.title}`} />
                        <RedeemNote text={noteFor(t.id)} />
                      </>
                    ) : state.kind === 'taken' ? (
                      state.code ? (
                        <TakenCode code={state.code} today={day} />
                      ) : (
                        <T v="meta" color={C.stone}>
                          {S.takenElsewhere}
                        </T>
                      )
                    ) : isNext ? (
                      <Meter value={n} max={t.day} height={2} color={C.muted} />
                    ) : null}
                  </TierRow>
                );
              })}
              {anyReady && !signedIn ? (
                <T v="note" color={C.stone} style={{ marginTop: 4 }}>
                  {R.signInNote}
                </T>
              ) : null}
            </View>
            <TextButton title={DOCS.access.title} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: GAP.block }} />
          </>
        )}
      </Screen>
      {sheet}
    </View>
  );
}
