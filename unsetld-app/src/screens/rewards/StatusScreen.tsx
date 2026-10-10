import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, useWindowDimensions, View } from 'react-native';
import type { MilestoneStatus } from '../../core/record';
import { accessState, REOPEN_AFTER } from '../../core/record';
import { isKnownStatus, nextStatus, roadAt, statusState } from '../../core/rewards';
import type { StatusTier } from '../../core/types';
import { DOCS } from '../../content';
import { REWARDS_COPY } from '../../content/copy/rewards';
import type { RootProps } from '../../navigation/types';
import { useAccessEnabled, useApp } from '../../state/store';
import { Card, Meter } from '../../ui/blocks';
import { NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, GAP, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';
import { accessDays, accessRecord, useStatusTiers } from '../access';
import { LINING } from './redeem';

const S = REWARDS_COPY.status;

/** Open / Reached / Used / Paused / 12 to go: the same words here and on the tier's page. */
export function statusStateText(s: MilestoneStatus, tier: Pick<StatusTier, 'id'>): string {
  switch (s.kind) {
    case 'open':
      return isKnownStatus(tier.id) ? S.state.open : S.state.reached;
    case 'used':
      return S.state.used;
    case 'paused':
      return S.state.paused;
    case 'locked':
      return S.state.left(s.daysLeft);
  }
}

/**
 * The road to the last tier, in active days, with a tick at each tier's day. The walker
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

/**
 * UNSETLD status (docs/UX_REDESIGN.md section 9): what consistency earns, by active days
 * (early access, the patch, the 365 piece, or whatever the status config lists). Each tier
 * opens its page, which holds its action (drop alerts, claim the patch, open a drop).
 */
export function StatusScreen({ navigation }: RootProps<'Status'>) {
  const { width } = useWindowDimensions();
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const accessEnabled = useAccessEnabled();
  const tiers = useStatusTiers();
  const ar = accessRecord(record);
  const n = accessDays(record);
  const access = accessState(ar, day);
  const coming = nextStatus(n, tiers);
  const paused = access.paused && tiers.some(t => t.pausable && n >= t.day);

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={S.title} body={S.intro} />
      {!accessEnabled ? (
        <T v="small" color={C.stone} style={{ marginTop: GAP.block }}>
          {REWARDS_COPY.off}
        </T>
      ) : (
        <>
          {n > 0 ? (
            <View style={{ marginTop: GAP.block, flexDirection: 'row', alignItems: 'baseline', gap: 10 }} accessible accessibilityLabel={S.daysA11y(n)}>
              <T v="letter.day" style={LINING}>
                {String(n)}
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
          {paused ? (
            <T v="note" color={C.stone} style={{ marginTop: 16 }}>
              {S.pausedNote(Math.max(1, REOPEN_AFTER - access.reopenProgress))}
            </T>
          ) : null}

          <View style={{ marginTop: GAP.block, gap: GAP.card }}>
            {tiers.map(t => {
              const st = statusState(ar, t, day);
              const word = statusStateText(st, t);
              const isNext = coming?.id === t.id;
              return (
                <Card key={t.id} onPress={() => navigation.navigate('Milestone', { id: t.id })} accessibilityLabel={S.tierA11y(t.day, t.title, t.short, word)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <T v="kicker" color={C.stone}>
                      {S.tierKicker(t.day)}
                    </T>
                    <T v="meta" color={st.kind === 'open' ? C.bone : C.stone}>
                      {word}
                    </T>
                  </View>
                  <T v="list" color={st.kind === 'locked' && !isNext ? C.muted : C.bone} style={[LINING, { marginTop: 8 }]}>
                    {t.title}
                  </T>
                  {t.short ? (
                    <T v="small" color={C.stone} style={{ marginTop: 4 }}>
                      {t.short}
                    </T>
                  ) : null}
                  {isNext ? (
                    <View style={{ marginTop: 14 }}>
                      <Meter value={n} max={t.day} />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
          <TextButton title={DOCS.access.title} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: GAP.block }} />
        </>
      )}
    </Screen>
  );
}
