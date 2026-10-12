import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { indexRecord, monthOf, monthView, recentProofs, recordMonths, recordSummary, weekMarks } from '../../core/history';
import { usableAreas } from '../../core/missions';
import { achievementsView, areaProgress, areasShown, milestones, type AreaProgress } from '../../core/progress';
import { weekStart } from '../../core/review';
import { computeStreak } from '../../core/streak';
import type { DayKey } from '../../core/time';
import { MISSION_BY_ID, MISSIONS, TRACK_BY_ID } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import type { TabProps } from '../../navigation/types';
import { useBalance } from '../../state/missions';
import { useAccessEnabled, useApp } from '../../state/store';
import { LinkRow, Meter, SectionLabel } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { Button } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { useLayoutWidth } from './measure';
import { Legend, MonthGrid, WeekDots } from './MonthGrid';
import { ProofTile, tileState } from './ProofTile';
import { fromEntry } from './proofView';

const R = PROGRESS.record;
const H = PROGRESS.history;
const minutesOf = (id: string) => MISSION_BY_ID[id]?.minutes;
/** Recent proof: one row of four. */
const RECENT = 4;
const TILE_GAP = 6;

/** A 44pt chevron to page through the months; dimmed and inert at the ends. */
function MonthStep({ dir, enabled, onPress }: { dir: 'prev' | 'next'; enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir === 'prev' ? R.prevMonth : R.nextMonth}
      aria-disabled={!enabled}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Icon name={dir === 'prev' ? 'chevron-left' : 'chevron-right'} size={22} color={enabled ? C.muted : C.greyLetter} />
    </Pressable>
  );
}

/**
 * An area, no card: the name and its level, then how far into the level it is (the points since
 * the level began against what the level takes), as a thin meter and as numbers (the two always
 * agree; both start over at each new level), and (once there's something) the missions and time
 * in it.
 */
function Area({ p }: { p: AreaProgress }) {
  const name = TRACK_BY_ID[p.track]?.short ?? p.track;
  return (
    <View accessible accessibilityLabel={R.a11yArea(name, p.level, p.into, p.span, p.missions, p.seconds)}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <T v="kicker" color={C.stone}>
          {name}
        </T>
        <T v="list" color={p.missions > 0 ? C.bone : C.muted}>
          {R.level(p.level)}
        </T>
      </View>
      <View style={{ marginTop: 10 }}>
        <Meter value={p.into} max={p.span} height={3} />
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <T v="meta" color={C.muted}>
          {R.areaPoints(p.into, p.span)}
        </T>
        {p.missions > 0 ? (
          <T v="meta" color={C.stone} style={{ flexShrink: 1, textAlign: 'right' }}>
            {R.areaMeta(p.missions, p.seconds)}
          </T>
        ) : null}
      </View>
    </View>
  );
}

function Areas({ order, areas }: { order: readonly AreaProgress['track'][]; areas: Record<AreaProgress['track'], AreaProgress> }) {
  if (!order.length) return null;
  return (
    <View style={{ marginTop: GAP.section }}>
      <SectionLabel style={{ marginBottom: 18 }}>{R.areas}</SectionLabel>
      <View style={{ gap: GAP.block }}>
        {order.map(id => (
          <Area key={id} p={areas[id]} />
        ))}
      </View>
    </View>
  );
}

/**
 * The Record: have I been showing up (the month's days as dots, the hero), what have I done (the
 * days and missions proven, recent proof), what am I improving (your areas), how much momentum
 * (the streak, perfect days). The rest lives in Stats. Day 1 (nothing on record yet) is this
 * week's empty dots, one line and one button, then the areas at level 1: no zeros.
 */
export function RecordScreen({ navigation }: TabProps<'Record'>) {
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const profile = useApp(s => s.profile);
  const accessEnabled = useAccessEnabled();
  const points = useBalance();
  const [width, onLayout] = useLayoutWidth(MARGIN * 2);
  // The month paged to; null is this month. Opens on this month, and the tab goes back to it.
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => navigation.addListener('tabPress', () => setPicked(null)), [navigation]);

  const ix = useMemo(() => indexRecord(record, today), [record, today]);
  const first: DayKey | null = useMemo(() => [...ix.active, ...ix.legacy].sort()[0] ?? null, [ix]);
  const months = useMemo(() => recordMonths(record, today), [record, today]);
  const month = picked && months.includes(picked) ? picked : (months[months.length - 1] ?? monthOf(today));
  const at = months.indexOf(month);
  const view = useMemo(() => monthView(record, plans, month, ix), [record, plans, month, ix]);
  const week = useMemo(() => weekMarks(record, plans, weekStart(today), ix), [record, plans, today, ix]);
  const summary = recordSummary(record);
  const streak = computeStreak(ix.active, today).current;
  const areas = areaProgress(record, minutesOf);
  const usable = usableAreas(MISSIONS, profile);
  const order = areasShown(profile.tracks.length ? profile.tracks : usable, usable, areas);
  const recent = recentProofs(record, RECENT).map(fromEntry);
  const marks = milestones(record, today);
  const { reached } = achievementsView(marks);
  const thisYear = today.slice(0, 4);
  const tile = Math.floor((width - TILE_GAP * (RECENT - 1)) / RECENT);
  const openDay = (day: DayKey) => navigation.navigate('RecordDay', { day });
  // Day 1: nothing proven ever and no days from before missions.
  const dayOne = first === null;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: insets.top + 32, paddingBottom: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T v="title.l" accessibilityRole="header">
            {R.title}
          </T>
          {ix.active.size > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={R.share}
              onPress={() => navigation.navigate('Share')}
              hitSlop={8}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', marginRight: -4, opacity: pressed ? 0.6 : 1 })}>
              <Icon name="share" size={22} color={C.muted} />
            </Pressable>
          ) : null}
        </View>

        {dayOne ? (
          <>
            <View style={{ marginTop: GAP.block }} onLayout={onLayout}>
              <SectionLabel style={{ marginBottom: 16 }}>{R.start.week}</SectionLabel>
              <WeekDots marks={week} width={width} today={today} first={null} />
              <T v="title.m" style={{ marginTop: GAP.section }}>
                {R.start.line}
              </T>
              <Button title={R.start.action} onPress={() => navigation.navigate('Today')} style={{ marginTop: GAP.block }} />
            </View>
            <Areas order={order} areas={areas} />
          </>
        ) : (
          <>
            <View style={{ marginTop: GAP.block }} onLayout={onLayout}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <T v="title.m" accessibilityRole="header" style={{ flex: 1 }}>
                  {PROGRESS.month(month, thisYear)}
                </T>
                {months.length > 1 ? (
                  <View style={{ flexDirection: 'row', marginRight: -12 }}>
                    <MonthStep dir="prev" enabled={at > 0} onPress={() => setPicked(months[at - 1])} />
                    <MonthStep dir="next" enabled={at < months.length - 1} onPress={() => setPicked(months[at + 1])} />
                  </View>
                ) : null}
              </View>
              <View style={{ marginTop: 18 }}>
                <MonthGrid weeks={view.weeks} width={width} today={today} first={first} onDay={openDay} />
              </View>
              <View style={{ marginTop: 18 }}>
                <Legend />
              </View>
              {/* All time: the days and missions proven, then the momentum. Never "0 days", never "0 day streak". */}
              <View style={{ marginTop: GAP.block }} accessible accessibilityLabel={R.a11ySummary(summary.days, summary.missions, streak, summary.perfect)}>
                {summary.days > 0 ? (
                  <T v="kicker" color={C.bone}>
                    {R.summary(summary.days, summary.missions)}
                  </T>
                ) : null}
                <T v="meta" color={C.stone} style={{ marginTop: summary.days > 0 ? 8 : 0 }}>
                  {R.momentum(streak, summary.perfect)}
                </T>
              </View>
            </View>

            <Areas order={order} areas={areas} />

            {recent.length ? (
              <View style={{ marginTop: GAP.section }}>
                <SectionLabel>{R.recent}</SectionLabel>
                <View style={{ flexDirection: 'row', gap: TILE_GAP }}>
                  {recent.map(p => (
                    <ProofTile
                      key={p.key}
                      proof={p}
                      size={tile}
                      label={H.a11yTile(p.title, p.area, p.day, today, tileState(p), p.timerSeconds)}
                      hint={R.a11yDayHint}
                      onPress={() => openDay(p.day)}
                    />
                  ))}
                </View>
                <View style={{ marginTop: 4 }}>
                  <LinkRow title={R.viewAll} onPress={() => navigation.navigate('ProofHistory')} />
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: recent.length ? GAP.card : GAP.section - 14 }}>
              <LinkRow title={R.stats} onPress={() => navigation.navigate('Stats')} />
              <LinkRow title={R.achievements} value={R.achievementsValue(reached.length, marks.length)} onPress={() => navigation.navigate('Achievements')} />
              {/* Rewards off, there's no Rewards tab: the point total and How points work live here. */}
              {!accessEnabled && points > 0 ? (
                <LinkRow title={R.points} value={R.pointsValue(points)} onPress={() => navigation.navigate('HowPoints')} />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
