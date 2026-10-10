import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usableAreas } from '../../core/missions';
import { achievementsView, activeDays, areaProgress, areasShown, milestones, totals, weekDays, type AreaProgress, type WeekDay } from '../../core/progress';
import { weekStart } from '../../core/review';
import { computeStreak } from '../../core/streak';
import { MISSION_BY_ID, MISSIONS, TRACK_BY_ID } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import type { TabProps } from '../../navigation/types';
import { useTodayMissions } from '../../state/missions';
import { useApp } from '../../state/store';
import { Card, EmptyState, LinkRow, Meter, SectionLabel } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';

const P = PROGRESS.screen;
const minutesOf = (id: string) => MISSION_BY_ID[id]?.minutes;

/**
 * One day of the week as a square. Proven: filled bone. Today: red (the one place the signal
 * colour appears), filled once something is proven, an outline until then. Missed: an ash
 * outline. Covered by an Off Day: a stone fill. Still to come, or before the first mission:
 * barely there.
 */
function DaySquare({ kind, size }: { kind: WeekDay['kind']; size: number }) {
  const fill = kind === 'proven' ? C.bone : kind === 'today-proven' ? C.signal : kind === 'covered' ? C.stone : 'transparent';
  const border = kind === 'today' ? C.signal : kind === 'missed' ? C.ash : kind === 'ahead' || kind === 'before' ? C.rule : fill;
  return <View style={{ width: size, height: size, backgroundColor: fill, borderWidth: fill === 'transparent' ? 1.5 : 0, borderColor: border }} />;
}

/** A serif number with its label under it, read as one thing. */
function Stat({ value, label, said, right }: { value: string; label: string; said: string; right?: boolean }) {
  return (
    <View accessible accessibilityLabel={said} style={{ alignItems: right ? 'flex-end' : 'flex-start' }}>
      <T v="stat">{value}</T>
      <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
        {label}
      </T>
    </View>
  );
}

/** This week, Monday to Sunday: a letter over a square for each day. Opens the week's review. */
function WeekRow({ days, today, onPress }: { days: WeekDay[]; today: string; onPress: () => void }) {
  const proven = days.filter(d => d.kind === 'proven' || d.kind === 'today-proven').length;
  const summary = days.map(d => P.a11yDay(d.day, d.kind)).join('. ');
  return (
    <Card onPress={onPress} accessibilityLabel={P.a11yWeek(summary)} accessibilityHint={P.a11yWeekHint}>
      <SectionLabel
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T v="meta" color={C.stone}>
              {P.weekCount(proven)}
            </T>
            <Icon name="chevron-right" size={16} color={C.stone} />
          </View>
        }>
        {P.week}
      </SectionLabel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {days.map((d, i) => (
          <View key={d.day} style={{ alignItems: 'center', gap: 10, minWidth: 28 }}>
            <T v="meta" color={d.day === today ? C.bone : C.stone}>
              {P.letters[i]}
            </T>
            <DaySquare kind={d.kind} size={18} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** An area: kicker, the level in serif with the XP to the next, a meter, missions and time. */
function AreaCard({ p }: { p: AreaProgress }) {
  const name = TRACK_BY_ID[p.track]?.short ?? p.track;
  if (p.missions === 0) {
    // Chosen, nothing proven in it yet: no zeros, just what starts it.
    return (
      <Card>
        <View accessible accessibilityLabel={P.a11yAreaStart(name)}>
          <T v="kicker" color={C.stone}>
            {name}
          </T>
          <T v="list" color={C.muted} style={{ marginTop: 10, fontVariant: ['lining-nums'] }}>
            {P.level(1)}
          </T>
          <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
            {P.areaStart(name)}
          </T>
        </View>
      </Card>
    );
  }
  return (
    <Card>
      <View accessible accessibilityLabel={P.a11yArea(name, p.level, p.into, p.span, p.missions, p.seconds)}>
        <T v="kicker" color={C.stone}>
          {name}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
          <T v="list" style={{ fontVariant: ['lining-nums'] }}>
            {P.level(p.level)}
          </T>
          <T v="meta" color={C.muted}>
            {P.xp(p.into, p.span)}
          </T>
        </View>
        <View style={{ marginTop: 12 }}>
          <Meter value={p.into} max={p.span} />
        </View>
        <T v="meta" color={C.stone} style={{ marginTop: 10 }}>
          {P.areaMeta(p.missions, p.seconds)}
        </T>
      </View>
    </Card>
  );
}

/**
 * Progress (§7): the streak and today, this week, a level per area, then links to Proof
 * history, Achievements and Stats. Day 1 (nothing proven) is one empty state, no zeros.
 */
export function ProgressScreen({ navigation }: TabProps<'Progress'>) {
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const profile = useApp(s => s.profile);
  const { missions: todays, proven: provenToday } = useTodayMissions(today);

  const active = activeDays(record);
  const first = active.size === 0;
  const streak = computeStreak(active, today);
  const ws = weekStart(today);
  const days = weekDays(active, streak.covered, today, ws);
  const areas = areaProgress(record, minutesOf);
  const usable = usableAreas(MISSIONS, profile);
  const order = areasShown(profile.tracks.length ? profile.tracks : usable, usable, areas);
  const marks = milestones(record, today);
  const { reached } = achievementsView(marks);
  const proofs = totals(record).missions;
  const perfect = todays.length > 0 && provenToday >= todays.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: insets.top + 32, paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T v="title.l" accessibilityRole="header">
            {P.title}
          </T>
          {first ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={P.share}
              onPress={() => navigation.navigate('Share')}
              hitSlop={8}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', marginRight: -4, opacity: pressed ? 0.6 : 1 })}>
              <Icon name="share" size={22} color={C.muted} />
            </Pressable>
          )}
        </View>

        {first ? (
          <View style={{ marginTop: GAP.block }}>
            <EmptyState title={P.empty.title} body={P.empty.body} action={P.empty.action} onAction={() => navigation.navigate('Today')} />
          </View>
        ) : (
          <>
            {/* The streak and today, side by side. A broken streak says what restarts it instead of 0. */}
            <View style={{ marginTop: GAP.block, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              {streak.current > 0 ? (
                <Stat value={PROGRESS.number(streak.current)} label={P.streakLabel} said={P.a11yStreak(streak.current)} />
              ) : (
                <View style={{ flex: 1 }} accessible>
                  <T v="saved">{P.streakAgain}</T>
                  <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
                    {P.longest(streak.longest)}
                  </T>
                </View>
              )}
              {todays.length ? (
                <Stat value={`${provenToday} / ${todays.length}`} label={perfect ? P.perfect : P.todayLabel} said={P.a11yToday(provenToday, todays.length)} right />
              ) : null}
            </View>

            <View style={{ marginTop: GAP.block }}>
              <WeekRow days={days} today={today} onPress={() => navigation.navigate('WeeklyReview', { weekStart: ws })} />
            </View>

            {order.length ? (
              <View style={{ marginTop: GAP.section }}>
                <SectionLabel>{P.areas}</SectionLabel>
                <View style={{ gap: GAP.card }}>
                  {order.map(id => (
                    <AreaCard key={id} p={areas[id]} />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: GAP.section - 14 }}>
              <LinkRow title={P.proofs} value={P.proofsValue(proofs)} onPress={() => navigation.navigate('ProofHistory')} />
              <LinkRow
                title={P.achievements}
                value={P.achievementsValue(reached.length, marks.length)}
                onPress={() => navigation.navigate('Achievements')}
              />
              <LinkRow title={P.stats} onPress={() => navigation.navigate('Stats')} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
