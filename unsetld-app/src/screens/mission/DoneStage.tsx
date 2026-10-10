// The mission is proven (UX_REDESIGN 5): PROVEN., the title, the points counting up, the
// balance, a meter toward the next reward, the streak and, when every mission in the plan
// is proven, the perfect day: 3 / 3, PERFECT DAY, +15 BONUS, the streak, Share today.
// Focused and calm: a short eased entrance (none under Reduce Motion), a success haptic as
// the points land and a soft one for a perfect day. The one place in the flow that moves.
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import type { DayKey } from '../../core/time';
import type { Mission, Verification } from '../../core/types';
import { MISSION } from '../../content/copy/mission';
import { soft, success } from '../../services/haptics';
import { PROOF_FROM_CAMERA } from '../../services/proof';
import { useNextReward, useTodayMissions } from '../../state/missions';
import { useAccessEnabled, useApp, type MissionResult } from '../../state/store';
import { Card } from '../../ui/blocks';
import { Button, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, GAP, radius } from '../../ui/tokens';
import { LINING } from './parts';

const share = (have: number, of: number) => (of > 0 ? Math.max(0, Math.min(1, have / of)) : 0);

/** The perfect-day card comes in a beat after the points land. */
const PERFECT_DELAY = 220;

export function DoneStage({
  mission,
  result,
  verification,
  day,
  nav,
  onDone,
  onRewards,
  onShare,
}: {
  mission: Mission;
  result: MissionResult;
  verification: Verification;
  day: DayKey;
  nav: ReactNode;
  onDone: () => void;
  onRewards: () => void;
  /** Perfect day: Share today. */
  onShare: () => void;
}) {
  const rewardsOn = useAccessEnabled();
  const record = useApp(s => s.record);
  // The same next reward Today shows: the most valuable one ready, else the cheapest still out of reach.
  const next = useNextReward(day);
  const { plan, proven } = useTodayMissions(day);
  const planned = plan?.missions.length ?? 0;
  const perfect = result.perfect && result.bonus > 0;
  const points = result.points;

  // The meter starts where the balance was before this mission and fills to where it is now.
  // Worked out once, so a reward config arriving mid-animation doesn't restart the count.
  const [{ from, to }] = useState(() => ({
    from: next ? share(result.balanceBefore, next.tier.points) : 0,
    to: next ? (next.ready ? 1 : share(result.balanceAfter, next.tier.points)) : 0,
  }));

  const [shown, setShown] = useState(0);
  const [rise] = useState(() => new Animated.Value(0));
  const [fill] = useState(() => new Animated.Value(from));
  const [bonusIn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let live = true;
    let later: ReturnType<typeof setTimeout> | undefined;
    const count = new Animated.Value(0);
    const sub = count.addListener(({ value }) => setShown(Math.round(value)));
    const land = (reduce: boolean) => {
      if (!live) return;
      setShown(points);
      success();
      if (!perfect) return;
      if (reduce) {
        bonusIn.setValue(1);
        later = setTimeout(soft, 400);
        return;
      }
      Animated.timing(bonusIn, { toValue: 1, duration: 360, delay: PERFECT_DELAY, easing: ease.out, useNativeDriver: false }).start();
      later = setTimeout(soft, PERFECT_DELAY + 120);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        if (reduce) {
          rise.setValue(1);
          fill.setValue(to);
          land(true);
          return;
        }
        Animated.parallel([
          Animated.timing(rise, { toValue: 1, duration: 320, easing: ease.out, useNativeDriver: false }),
          Animated.timing(count, { toValue: points, duration: 600, delay: 200, easing: ease.out, useNativeDriver: false }),
          Animated.timing(fill, { toValue: to, duration: 600, delay: 200, easing: ease.out, useNativeDriver: false }),
        ]).start(({ finished }) => {
          if (finished) land(false);
        });
      });
    return () => {
      live = false;
      if (later) clearTimeout(later);
      count.removeListener(sub);
      count.stopAnimation();
    };
  }, [points, to, perfect, rise, fill, bonusIn]);

  const rewardLine = next ? (next.ready ? MISSION.done.ready(next.tier.title) : MISSION.done.toReward(next.need, next.tier.title)) : null;
  // "Proof saved." only when there's a photo to save: a TIMER mission's proof is the timer.
  const checks = MISSION.checked(verification.checks, PROOF_FROM_CAMERA);
  const checkedLine = mission.proofType === 'TIMER' ? checks : `${MISSION.done.saved} ${checks}`;
  // The first mission proven today (this one is already on the record).
  const firstToday = !Object.values(record.missions?.[day] ?? {}).some(m => m.missionId !== mission.id && m.verification?.status === 'accepted');
  const streakLine = firstToday ? MISSION.done.streakFirst(result.streakAfter) : MISSION.done.streak(result.streakAfter);
  const all = planned || proven;

  const enter = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
  const bonusEnter = { opacity: bonusIn, transform: [{ translateY: bonusIn.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };

  const footer = perfect ? (
    <>
      <Button title={MISSION.done.share} onPress={onShare} />
      <TextButton title={MISSION.button.done} onPress={onDone} style={{ marginTop: 8 }} />
    </>
  ) : (
    <Button title={MISSION.button.done} onPress={onDone} />
  );

  return (
    <Screen nav={nav} contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 16 }} footer={footer}>
      <Animated.View style={enter}>
        <T v="title.xl" accessibilityRole="header">
          {MISSION.done.title}
        </T>
        <T v="list" color={C.stone} style={[{ marginTop: 10 }, LINING]}>
          {mission.title}
        </T>

        <View accessible accessibilityLabel={MISSION.a11y.points(points)} style={{ marginTop: 36, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <T v="title.l" style={{ fontVariant: ['lining-nums', 'tabular-nums'] }}>
            {MISSION.done.points(shown)}
          </T>
          <T v="kicker" color={C.bone}>
            {MISSION.done.pointsLabel}
          </T>
        </View>
        {/* The balance after takes the perfect-day bonus too: say so, or "+10" reads against "405 → 430". */}
        <T
          v="meta"
          color={C.muted}
          style={{ marginTop: 6 }}
          accessibilityLabel={(result.bonus > 0 ? MISSION.a11y.balanceBonus : MISSION.a11y.balance)(result.balanceBefore, result.balanceAfter)}>
          {(result.bonus > 0 ? MISSION.done.balanceBonus : MISSION.done.balance)(result.balanceBefore, result.balanceAfter)}
        </T>

        {rewardsOn && next && rewardLine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rewardLine}
            accessibilityHint={MISSION.a11y.rewards}
            onPress={onRewards}
            style={({ pressed }) => ({ marginTop: GAP.block, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <View style={{ height: 4, borderRadius: radius.meter, backgroundColor: C.track, overflow: 'hidden' }}>
              <Animated.View
                style={{ height: 4, borderRadius: radius.meter, backgroundColor: C.bone, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}
              />
            </View>
            <T v="meta" color={next.ready ? C.bone : C.muted} style={{ marginTop: 10 }}>
              {rewardLine}
            </T>
          </Pressable>
        ) : null}

        {perfect ? null : (
          <T v="body" style={{ marginTop: GAP.block }}>
            {streakLine}
          </T>
        )}
      </Animated.View>

      {perfect ? (
        <Animated.View style={[{ marginTop: GAP.block }, bonusEnter]}>
          <Card>
            <View accessible accessibilityLabel={`${MISSION.a11y.perfect(proven, all, result.bonus)} ${streakLine}`}>
              <T v="kicker" color={C.stone}>
                {MISSION.done.perfect}
              </T>
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <T v="stat">{MISSION.done.count(proven, all)}</T>
                <T v="kicker" color={C.bone}>
                  {MISSION.done.bonus(result.bonus)}
                </T>
              </View>
              <T v="meta" color={C.muted} style={{ marginTop: 8 }}>
                {streakLine}
              </T>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {/* Fades in with the rest rather than sitting there before it. */}
      <Animated.View style={{ opacity: rise }}>
        <T v="note" color={C.stone} style={{ marginTop: 32 }}>
          {checkedLine}
        </T>
      </Animated.View>
    </Screen>
  );
}
