// The mission is proven (UX_REDESIGN 5, THE RECORD). What it says is "I showed up": PROVEN. and
// the title, the points small under them, then the record moment, the hero of the screen: this
// week's days as the Record draws them, today's filling in, "Day 12 added to your record." on
// the day's first proof, "1 / 3 today" ("3 / 3 Perfect day" and the bonus a beat later) and the
// streak when the proof extended it. Quieter after it: the next reward's meter and what the
// proof did for its area ("+15 to School · Level 2", or the area's new level over its meter).
// The checks line last; Continue closes.
// Calm: a short eased entrance and today's dot moving to its new state (none under Reduce
// Motion), a success haptic as it lands and a soft one for a perfect day or a new level.
// VoiceOver on iOS hears the final facts once, as the stage opens.
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import type { DayKey } from '../../core/time';
import type { Mission, Verification } from '../../core/types';
import { MISSION } from '../../content/copy/mission';
import { soft, success } from '../../services/haptics';
import { PROOF_FROM_CAMERA } from '../../services/proof';
import { useNextReward } from '../../state/missions';
import { useAccessEnabled, useApp, type MissionResult } from '../../state/store';
import { DayDot, type DotState } from '../../ui/DayDot';
import { Button, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, ease, GAP, radius } from '../../ui/tokens';
import { useAnnounce } from '../../ui/useAnnounce';
import { areaGain, doneWeek, levelBefore, type WeekDay } from './levels';
import { areaName, LINING } from './parts';

const share = (have: number, of: number) => (of > 0 ? Math.max(0, Math.min(1, have / of)) : 0);

/** The bonus comes in a beat after today's dot lands. */
const PERFECT_DELAY = 220;
/** Today's dot holds its old state for a moment, then moves to the new one. */
const DOT_DELAY = 420;
const DOT_MS = 360;
/** The points count up, and the reward meter fills, while the dot waits and moves. */
const COUNT_MS = 560;
/** The meters start a moment after the entrance. The points don't: they count as their line fades in. */
const FILL_DELAY = 200;
/** A week cell: the dot (with room for today's ring) and its letter. */
const DOT = 30;

const dotState = ({ mark, before }: WeekDay): DotState => ({ level: mark.level, when: mark.when, covered: mark.covered, before });

/** Today's dot: the new state fades in over the old one (same ring, a bigger fill), then the old one goes. */
function TodayDot({ from, to, morph }: { from: DotState; to: DotState; morph: Animated.Value }) {
  return (
    <View style={{ width: DOT, height: DOT }}>
      <Animated.View style={{ position: 'absolute', opacity: morph.interpolate({ inputRange: [0, 0.99, 1], outputRange: [1, 1, 0] }) }}>
        <DayDot state={from} size={DOT} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: morph }}>
        <DayDot state={to} size={DOT} />
      </Animated.View>
    </View>
  );
}

/** The week row: seven dots over their letters, each read as one sentence ("Wednesday, today, 1 mission proven"). */
function WeekRow({ days, from, morph }: { days: WeekDay[]; from: DotState; morph: Animated.Value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d, i) => {
        const today = d.mark.when === 'today';
        const said = MISSION.a11y.day(MISSION.a11y.weekdays[i] ?? '', {
          when: d.mark.when,
          proven: d.mark.proven,
          perfect: d.mark.level === 'perfect' && !d.mark.legacy,
          covered: d.mark.covered,
          legacy: d.mark.legacy,
          before: d.before,
        });
        return (
          <View key={d.mark.day} accessible accessibilityLabel={said} style={{ width: DOT + 6, alignItems: 'center' }}>
            {today ? <TodayDot from={from} to={dotState(d)} morph={morph} /> : <DayDot state={dotState(d)} size={DOT} />}
            <T v="meta" color={today ? C.bone : C.stone} style={{ marginTop: 6 }}>
              {MISSION.done.weekdays[i]}
            </T>
          </View>
        );
      })}
    </View>
  );
}

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
  // This proof made the day perfect (the bonus is paid once, with the last mission).
  const perfect = result.perfect && result.bonus > 0;
  const points = result.points;
  // The day as the store counted it with this proof: "1 / 3 today".
  const done = result.provenToday;
  const all = Math.max(result.plannedToday, done);
  // Said only when this proof moved it (the day's first proof): "12 day streak", "Streak started".
  const extended = result.streakAfter > result.streakBefore;

  // This week from the record as it is now (this proof is on it), and today's dot as it was
  // before this proof. Worked out once.
  const [week] = useState(() => {
    const s = useApp.getState();
    return doneWeek(s.record, s.plans, day);
  });
  const [from] = useState<DotState>(() => ({ level: levelBefore(week, done), when: 'today', covered: false }));

  // The meter starts where the balance was before this mission and fills to where it is now.
  // Worked out once, so a reward config arriving mid-animation doesn't restart the count.
  const [{ fromShare, toShare }] = useState(() => ({
    fromShare: next ? share(result.balanceBefore, next.tier.points) : 0,
    toShare: next ? (next.ready ? 1 : share(result.balanceAfter, next.tier.points)) : 0,
  }));

  // What the proof added to its area's level (it's already on the record). Worked out once too.
  const [gain] = useState(() => areaGain(record, day, mission.id));
  const up = gain?.up ? gain : null;
  const levelFill = up ? share(up.after.into, up.after.span) : 0;

  // The count starts at 1, not 0: "+0 pts" never shows, even faintly.
  const [shown, setShown] = useState(() => Math.min(1, points));
  const [rise] = useState(() => new Animated.Value(0));
  const [fill] = useState(() => new Animated.Value(fromShare));
  const [morph] = useState(() => new Animated.Value(0));
  const [bonusIn] = useState(() => new Animated.Value(0));
  // A new level: the area's meter fills what was left of the old level, then starts the new one.
  const [level] = useState(() => new Animated.Value(up ? share(up.before.into, up.before.span) : 0));

  useEffect(() => {
    let live = true;
    let later: ReturnType<typeof setTimeout> | undefined;
    const count = new Animated.Value(Math.min(1, points));
    const sub = count.addListener(({ value }) => setShown(Math.round(value)));
    // Today's dot has landed: the success haptic, then the bonus or the new level a beat later.
    const land = (reduce: boolean) => {
      if (!live) return;
      setShown(points);
      success();
      if (up) {
        if (reduce) level.setValue(levelFill);
        else {
          level.setValue(0);
          Animated.timing(level, { toValue: levelFill, duration: 360, easing: ease.out, useNativeDriver: false }).start();
        }
        // A perfect day has its own soft haptic: one is enough.
        if (!perfect) later = setTimeout(soft, reduce ? 400 : PERFECT_DELAY + 120);
      }
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
          fill.setValue(toShare);
          morph.setValue(1);
          land(true);
          return;
        }
        Animated.parallel([
          Animated.timing(rise, { toValue: 1, duration: 320, easing: ease.out, useNativeDriver: false }),
          Animated.timing(count, { toValue: points, duration: COUNT_MS, easing: ease.out, useNativeDriver: false }),
          Animated.timing(fill, { toValue: toShare, duration: COUNT_MS, delay: FILL_DELAY, easing: ease.out, useNativeDriver: false }),
          ...(up ? [Animated.timing(level, { toValue: 1, duration: COUNT_MS, delay: FILL_DELAY, easing: ease.out, useNativeDriver: false })] : []),
          // Last to finish, so the haptic lands with it.
          Animated.timing(morph, { toValue: 1, duration: DOT_MS, delay: DOT_DELAY, easing: ease.out, useNativeDriver: false }),
        ]).start(({ finished }) => {
          if (finished) land(false);
        });
      });
    return () => {
      live = false;
      if (later) clearTimeout(later);
      count.removeListener(sub);
      count.stopAnimation();
      level.stopAnimation();
    };
  }, [points, toShare, perfect, rise, fill, morph, bonusIn, up, level, levelFill]);

  const rewardLine = next ? (next.ready ? MISSION.done.ready(next.tier.title) : MISSION.done.toNext(next.need)) : null;
  const rewardSaid = next ? (next.ready ? MISSION.a11y.ready(next.tier.title) : MISSION.a11y.toNext(next.need, next.tier.title)) : null;
  // "Proof saved." only when there's a photo to save: a TIMER mission's proof is the timer.
  const checks = MISSION.checked(verification.checks, PROOF_FROM_CAMERA);
  const checkedLine = mission.proofType === 'TIMER' ? checks : `${MISSION.done.saved} ${checks}`;
  const dayLine = result.firstToday ? MISSION.done.dayAdded(result.dayNumber) : null;
  const streakLine = extended ? MISSION.done.streak(result.streakAfter) : null;
  const area = gain ? areaName(mission, gain.track) : '';

  // Said once, as the stage opens, with the facts the screen lands on.
  const [said] = useState(() =>
    MISSION.a11y.done({
      points,
      day: dayLine,
      today: MISSION.a11y.today(done, all, perfect),
      streak: streakLine,
      bonus: perfect ? MISSION.a11y.bonus(result.bonus) : null,
      reward: rewardsOn ? rewardSaid : null,
      level: up && area ? MISSION.a11y.levelSaid(area, up.after.level) : null,
    }),
  );
  useAnnounce(said, { onMount: true });

  const enter = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
  const bonusEnter = { opacity: bonusIn, transform: [{ translateY: bonusIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] };

  const footer = (
    <>
      <Button title={MISSION.button.continue} onPress={onDone} />
      {perfect ? <TextButton title={MISSION.done.share} onPress={onShare} style={{ marginTop: 8 }} /> : null}
    </>
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
        {/* Secondary: the points are what showing up earns, not the moment itself. */}
        <T v="kicker" color={C.bone} style={{ marginTop: 14 }} accessibilityLabel={MISSION.a11y.points(points)}>
          {MISSION.done.pts(shown, points)}
        </T>

        {/* The record moment. */}
        <View style={{ marginTop: GAP.section }}>
          <WeekRow days={week} from={from} morph={morph} />
          {dayLine ? (
            <T v="saved" style={[{ marginTop: 22 }, LINING]}>
              {dayLine}
            </T>
          ) : null}
          <View
            accessible
            accessibilityLabel={MISSION.a11y.today(done, all, perfect)}
            style={{ marginTop: dayLine ? 10 : 22, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <T v="stat">{MISSION.done.count(done, all)}</T>
            <T v="meta" color={perfect ? C.bone : C.stone}>
              {perfect ? MISSION.done.perfect : MISSION.done.today}
            </T>
          </View>
          {perfect ? (
            <Animated.View style={[{ marginTop: 6 }, bonusEnter]}>
              <T v="meta" color={C.bone} accessibilityLabel={MISSION.a11y.bonus(result.bonus)}>
                {MISSION.done.bonus(result.bonus)}
              </T>
            </Animated.View>
          ) : null}
          {streakLine ? (
            <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
              {streakLine}
            </T>
          ) : null}
        </View>

        {/* Secondary: how close the next reward is. */}
        {rewardsOn && next && rewardLine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rewardSaid ?? rewardLine}
            accessibilityHint={MISSION.a11y.rewards}
            onPress={onRewards}
            style={({ pressed }) => ({ marginTop: GAP.block, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <View style={{ height: 3, borderRadius: radius.meter, backgroundColor: C.track, overflow: 'hidden' }}>
              <Animated.View
                style={{ height: 3, borderRadius: radius.meter, backgroundColor: C.bone, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}
              />
            </View>
            <T v="meta" color={next.ready ? C.bone : C.stone} style={{ marginTop: 10 }}>
              {rewardLine}
            </T>
          </Pressable>
        ) : null}
      </Animated.View>

      {/* What the proof did for its area: quiet, after everything else. */}
      {gain && area ? (
        <Animated.View style={{ opacity: perfect ? bonusIn : rise }}>
          {up ? (
            <View
              accessible
              accessibilityLabel={MISSION.a11y.level(area, up.after.level, up.after.into, up.after.span)}
              style={{ marginTop: rewardsOn && next ? 16 : GAP.block }}>
              <T v="kicker" color={C.bone}>
                {MISSION.done.level(area, up.after.level)}
              </T>
              <View style={{ marginTop: 10, height: 3, borderRadius: radius.meter, backgroundColor: C.track, overflow: 'hidden' }}>
                <Animated.View
                  style={{ height: 3, borderRadius: radius.meter, backgroundColor: C.bone, width: level.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}
                />
              </View>
            </View>
          ) : (
            <T
              v="meta"
              color={C.stone}
              style={{ marginTop: rewardsOn && next ? 12 : GAP.block }}
              accessibilityLabel={MISSION.a11y.area(gain.points, area, gain.after.level)}>
              {MISSION.done.area(gain.points, area, gain.after.level)}
            </T>
          )}
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
