// Stage 6: the mission is proven. PROVEN., the points counting up (with a
// haptic as they land), the balance, the next reward, the streak and, when the
// plan is complete, the perfect-day bonus. The one place in the flow that moves.
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { rewardStatus } from '../../core/rewards';
import type { DayKey } from '../../core/time';
import type { Mission, Verification } from '../../core/types';
import { MISSION } from '../../content/copy/mission';
import { medium } from '../../services/haptics';
import { PROOF_FROM_CAMERA } from '../../services/proof';
import { useNextReward, useRewardTiers } from '../../state/missions';
import { useAccessEnabled, useApp, type MissionResult } from '../../state/store';
import { Button, Screen } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, hairline } from '../../ui/tokens';

const share = (have: number, of: number) => (of > 0 ? Math.max(0, Math.min(1, have / of)) : 0);

export function DoneStage({
  mission,
  result,
  verification,
  day,
  nav,
  onDone,
  onRewards,
}: {
  mission: Mission;
  result: MissionResult;
  verification: Verification;
  day: DayKey;
  nav: ReactNode;
  onDone: () => void;
  onRewards: () => void;
}) {
  const accessOn = useAccessEnabled();
  const record = useApp(s => s.record);
  const collection = useApp(s => s.remote.collection);
  const tiers = useRewardTiers();
  const next = useNextReward(day);
  // A reward this proof just brought into reach is the news; otherwise the next one along.
  const unlocked = tiers
    .filter(t => t.points > result.balanceBefore && rewardStatus(record, t, collection, day) === 'ready')
    .sort((a, b) => b.points - a.points)[0];
  const goal = unlocked
    ? { title: unlocked.title, points: unlocked.points, need: 0, ready: true }
    : next
      ? { title: next.tier.title, points: next.tier.points, need: next.need, ready: next.ready }
      : null;
  const target = goal ? (goal.ready ? 1 : share(result.balanceAfter, goal.points)) : 0;
  const [shown, setShown] = useState(0);
  const [rise] = useState(() => new Animated.Value(0));
  // The bar starts where the balance was before this mission.
  const [fill] = useState(() => new Animated.Value(goal ? share(result.balanceBefore, goal.points) : 0));
  const points = result.points;

  useEffect(() => {
    let live = true;
    const count = new Animated.Value(0);
    const sub = count.addListener(({ value }) => setShown(Math.round(value)));
    const land = () => {
      if (!live) return;
      setShown(points);
      if (points > 0) medium();
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        if (reduce) {
          rise.setValue(1);
          fill.setValue(target);
          land();
          return;
        }
        Animated.parallel([
          Animated.timing(rise, { toValue: 1, duration: 320, easing: ease.out, useNativeDriver: false }),
          Animated.timing(count, { toValue: points, duration: 600, delay: 200, easing: ease.out, useNativeDriver: false }),
          Animated.timing(fill, { toValue: target, duration: 600, delay: 200, easing: ease.out, useNativeDriver: false }),
        ]).start(({ finished }) => {
          if (finished) land();
        });
      });
    return () => {
      live = false;
      count.removeListener(sub);
      count.stopAnimation();
    };
  }, [points, target, rise, fill]);

  const rewardLine = goal ? (goal.ready ? MISSION.done.ready(goal.title) : MISSION.done.toReward(goal.need, goal.title)) : null;
  // The first mission proven today (this one is already on the record).
  const firstToday = !Object.values(record.missions?.[day] ?? {}).some(m => m.missionId !== mission.id && m.verification?.status === 'accepted');

  return (
    <Screen nav={nav} contentStyle={{ flexGrow: 1, justifyContent: 'center' }} footer={<Button title={MISSION.button.done} onPress={onDone} />}>
      <Animated.View style={{ opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <T v="title.xl" accessibilityRole="header" style={{ marginTop: 24 }}>
          {MISSION.done.title}
        </T>
        <T v="list" color={C.stone} style={{ marginTop: 10 }}>
          {mission.title}
        </T>
      </Animated.View>

      <T v="mono.l" color={C.bone} style={{ marginTop: 36 }} accessibilityLabel={MISSION.done.points(points)}>
        {MISSION.done.points(shown)}
      </T>
      <T v="mono" style={{ marginTop: 8 }} accessibilityLabel={MISSION.a11y.balance(result.balanceBefore, result.balanceAfter)}>
        {MISSION.done.balance(result.balanceBefore, result.balanceAfter)}
      </T>

      {accessOn && goal && rewardLine ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={rewardLine}
          accessibilityHint={MISSION.a11y.rewards}
          onPress={onRewards}
          style={({ pressed }) => ({ marginTop: 28, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <View style={{ height: 2, backgroundColor: C.rule }}>
            <Animated.View style={{ height: 2, backgroundColor: C.bone, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>
          <T v="mono" color={goal.ready ? C.bone : C.stone} style={{ marginTop: 10 }}>
            {rewardLine}
          </T>
        </Pressable>
      ) : null}

      <T v="body" style={{ marginTop: 28 }}>
        {firstToday ? MISSION.done.streakFirst(result.streakAfter) : MISSION.done.streak(result.streakAfter)}
      </T>

      {result.bonus > 0 ? (
        <View
          accessible
          accessibilityLabel={`${MISSION.done.perfect}, ${MISSION.done.bonus(result.bonus)}`}
          style={{ marginTop: 28, paddingTop: 16, borderTopWidth: hairline, borderTopColor: C.rule, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T v="label" color={C.bone}>
            {MISSION.done.perfect}
          </T>
          <T v="mono.l" color={C.bone}>
            {MISSION.done.bonus(result.bonus)}
          </T>
        </View>
      ) : null}

      <T v="note" color={C.stone} style={{ marginTop: 32 }}>
        {`${MISSION.done.saved} ${MISSION.checked(verification.checks, PROOF_FROM_CAMERA)}`}
      </T>
    </Screen>
  );
}
