import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { swapArea } from '../../core/missions';
import { programDay } from '../../core/programs';
import { activeDays, milestones, type MilestoneKey } from '../../core/progress';
import { pendingLetter } from '../../core/record';
import { reviewWeekFor, weeklyReview } from '../../core/review';
import { addDays, type DayKey } from '../../core/time';
import type { MissionDone, RecordState } from '../../core/types';
import { MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID, TRACK_BY_ID } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import { HOME } from '../../content/copy/home';
import type { TabProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { deletePhoto } from '../../services/proof';
import { cancelTimerDone } from '../../services/timerNotify';
import { useBalance, useNextReward, useRerollsLeft, useStreak, useTodayMissions, useWeekFocus, type TodayMission } from '../../state/missions';
import { useAccessEnabled, useApp, useAppActive, useReaderColorway } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { ColorwayBackground } from '../../ui/ColorwayBackground';
import { GAP, MARGIN } from '../../ui/tokens';
import { accessRecord } from '../access';
import { ColorwaySheet } from '../today/ColorwaySheet';
import {
  ActivePlanCard,
  FocusCard,
  MissionCard,
  NextReward,
  NothingFits,
  PlansRow,
  StatsRow,
  TodayHeader,
  TopRow,
  WeeklyCard,
  type CardAction,
} from './parts';

/** A beat after Today settles, so a card that was just proven plays first. */
const MOMENT_DELAY = 1800;
/** Access letters wait a little longer. */
const LETTER_DELAY = 2500;

/** The proof that counts: a rejected attempt leaves the mission to do. */
function accepted(done: MissionDone | null): MissionDone | null {
  return done && done.verification?.status === 'accepted' ? done : null;
}

/**
 * The milestone moment to show: the newest one reached and not shown yet, and
 * the older unseen ones it stands in for (so a restored record gets one moment, not five).
 */
function dueMoment(record: RecordState, day: DayKey, shown: readonly string[]): { key: MilestoneKey; covers: MilestoneKey[] } | null {
  const order = milestones(record, day);
  const unseen = order
    .map((m, i) => ({ key: m.key, reached: m.reached, i }))
    .filter((m): m is { key: MilestoneKey; reached: DayKey; i: number } => m.reached !== null && !shown.includes(m.key));
  if (!unseen.length) return null;
  const newest = [...unseen].sort((a, b) => (a.reached === b.reached ? a.i - b.i : a.reached < b.reached ? -1 : 1))[unseen.length - 1];
  return { key: newest.key, covers: unseen.map(m => m.key) };
}

/**
 * Today (docs/UX_REDESIGN.md §3): the wordmark and the day, streak and points, the next
 * reward, the weekly focus question, TODAY with the three mission cards, the active plan (or
 * a quiet row to Plans) and, Sunday to Tuesday, the weekly review card. The tab bar sits
 * below; the colorway sheet opens over it when You asks (params { sheet: 'colorway' }).
 */
export function HomeScreen({ navigation, route }: TabProps<'Today'>) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const active = useAppActive();
  const colorway = useReaderColorway();
  const accessEnabled = useAccessEnabled();
  const day = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const profile = useApp(s => s.profile);
  const plans = useApp(s => s.plans);
  const timer = useApp(s => s.timer);
  const pendingBefore = useApp(s => s.pendingBefore);
  const program = useApp(s => s.program);
  const reviewSeen = useApp(s => s.reviewSeen);
  const momentsShown = useApp(s => s.momentsShown);
  const { plan, missions } = useTodayMissions(day);
  const streak = useStreak(day);
  const points = useBalance();
  const next = useNextReward(day);
  const swapsLeft = useRerollsLeft(day);
  const weekFocus = useWeekFocus(day);

  const [sheet, setSheet] = useState<'colorway' | null>(route.params?.sheet === 'colorway' ? 'colorway' : null);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Today's plan, on focus and again when the day turns over at 4:00 AM.
  // A timer or a before photo left from an earlier day can't count any more
  // (that day's plan is closed): it goes, with its photo and its notification.
  // Today in focus means no Mission screen is open on top of it.
  useFocusEffect(
    useCallback(() => {
      const s = useApp.getState();
      s.ensurePlan(day);
      if (s.pendingBefore && s.pendingBefore.day < day) {
        deletePhoto(s.pendingBefore.photo.uri);
        s.setPendingBefore(null);
      }
      if (s.timer && s.timer.day < day) {
        s.cancelTimer();
        cancelTimerDone();
      }
    }, [day]),
  );

  // Proven missions as this screen last showed them. A mission proven while the
  // Mission screen was on top shows up as new once Today is back in view, and plays.
  const provenIds = missions.filter(m => accepted(m.done)).map(m => m.mission.id);
  const provenKey = provenIds.join(',');
  const [seen, setSeen] = useState({ day, key: provenKey, ids: provenIds });
  const [celebrate, setCelebrate] = useState<{ ids: string[]; n: number }>({ ids: [], n: 0 });
  // A card that just came in from a swap.
  const [swapped, setSwapped] = useState<string | null>(null);
  // Route params: You asks for the colorway sheet (or the weekly focus), a widget or link for the top.
  const nonce = route.params?.nonce;
  const [seenNonce, setSeenNonce] = useState(nonce);

  if (seen.day !== day) {
    // 4:00 AM with Today open: the new day starts at the top, with nothing left over from the last.
    setSeen({ day, key: provenKey, ids: provenIds });
    setCelebrate({ ids: [], n: 0 });
    setSwapped(null);
    setScrollTop(t => t + 1);
  } else if (isFocused && seen.key !== provenKey) {
    const fresh = provenIds.filter(id => !seen.ids.includes(id));
    setSeen({ day, key: provenKey, ids: provenIds });
    if (fresh.length) setCelebrate(c => ({ ids: fresh, n: c.n + 1 }));
  }
  if (nonce !== seenNonce) {
    setSeenNonce(nonce);
    if (route.params?.sheet === 'colorway') setSheet('colorway');
    else if (route.params?.sheet !== 'focus') setScrollTop(t => t + 1);
  }
  useEffect(() => {
    if (scrollTop) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollTop]);
  // Asked for the weekly focus (a link or You): it's its own screen, opened over Today.
  const wantsFocus = route.params?.sheet === 'focus' ? nonce ?? 0 : null;
  useEffect(() => {
    if (wantsFocus === null) return;
    navigation.setParams({ sheet: undefined });
    navigation.navigate('WeeklyFocus');
  }, [wantsFocus, navigation]);

  // Milestone moments first, then Access letters: one at a time, a beat after Today
  // settles, and only on a day with something proven.
  const activeToday = streak.activeToday;
  const lettersShown = record.lettersShown;
  useEffect(() => {
    if (!isFocused || !active || !activeToday || sheet) return;
    const st = useApp.getState();
    const moment = dueMoment(st.record, day, st.momentsShown);
    if (moment) {
      const t = setTimeout(() => {
        for (const k of moment.covers) useApp.getState().markMomentShown(k);
        navigation.navigate('Moment', { key: moment.key });
      }, MOMENT_DELAY);
      return () => clearTimeout(t);
    }
    if (!accessEnabled) return;
    const letter = pendingLetter(accessRecord(st.record), day);
    if (!letter) return;
    const t = setTimeout(() => navigation.navigate('Letter', { letter }), LETTER_DELAY);
    return () => clearTimeout(t);
  }, [isFocused, active, activeToday, sheet, day, momentsShown, lettersShown, accessEnabled, navigation, provenKey]);

  // No swaps left: say so, and where more come from.
  const showSwapLimit = () => {
    const premium = useApp.getState().premium.active;
    showDialog(
      HOME.swap.limitTitle,
      premium ? HOME.swap.limitFull : HOME.swap.limitFree,
      premium
        ? [{ label: HOME.swap.ok, cancel: true }]
        : [
            { label: HOME.swap.ok, cancel: true },
            { label: HOME.swap.seeFull, onPress: () => navigation.navigate('Paywall', { from: 'swaps' }) },
          ],
    );
  };

  const swap = (m: TodayMission) => {
    selection();
    // The dialog names the area the swap draws from: the one the mission is in the day for, or
    // (a plan's mission in an area since dropped) one of the user's areas.
    const s = useApp.getState();
    const dayPlan = s.plans[day];
    const to = dayPlan ? swapArea(dayPlan, m.index, { library: MISSIONS, profile: s.profile, day }) : m.area;
    const area = (to && TRACK_BY_ID[to]?.short) || '';
    if (swapsLeft <= 0) {
      showSwapLimit();
      return;
    }
    const doSwap = () => {
      // 4:00 AM passed while the dialog was up: this card belongs to a day that's over.
      useApp.getState().refreshDay();
      if (useApp.getState().currentDay !== day) return;
      const result = useApp.getState().rerollMission(m.index);
      if (result === 'ok') {
        const nowPlan = useApp.getState().plans[day];
        const id = nowPlan?.missions[m.index]?.missionId;
        const title = id ? MISSION_BY_ID[id]?.title : undefined;
        if (id && title) {
          setSwapped(id);
          AccessibilityInfo.announceForAccessibility(HOME.swap.done(title));
        }
      } else if (result === 'none') {
        showDialog(HOME.swap.noneTitle, HOME.swap.noneBody(area), [{ label: HOME.swap.ok, cancel: true }]);
      } else showSwapLimit();
    };
    showDialog(HOME.swap.confirmTitle(m.mission.title), HOME.swap.confirmBody(swapsLeft, area), [
      { label: HOME.swap.no, cancel: true },
      { label: HOME.swap.yes, onPress: doSwap },
    ]);
  };

  const actionFor = (m: TodayMission): CardAction => {
    if (pendingBefore && pendingBefore.missionId === m.mission.id && pendingBefore.day === day) return { kind: 'after' };
    if (timer && timer.missionId === m.mission.id && timer.day === day) {
      // The card counts down on its own while Today is in view.
      return { kind: 'timer', timer, live: isFocused && active };
    }
    return { kind: 'start' };
  };

  // Busy: its timer is running or its before photo is saved, so it can't be swapped out.
  const busyWith = (m: TodayMission) =>
    (timer?.missionId === m.mission.id && timer.day === day) || (pendingBefore?.missionId === m.mission.id && pendingBefore.day === day);
  // A mission with any proof on record today (a rejected attempt included) stays: the store won't swap it.
  // Swap shows only while swaps are left (brief §3: swaps live on the card and in the dialog).
  const canSwap = (m: TodayMission) => swapsLeft > 0 && !m.done && !busyWith(m);

  const all = missions.length;
  const shownIds = seen.day === day ? seen.ids : [];
  const shownDone = shownIds.length;
  const ready = Boolean(plan);
  const perfect = ready && all > 0 && shownDone >= all;

  const prog = program ? PROGRAM_BY_ID[program.id] : undefined;
  const progDay = prog && program ? programDay(prog, program, day) : null;

  const week = reviewWeekFor(day);
  const review = week && reviewSeen !== week ? weeklyReview(record, plans, profile, week) : null;

  // Day N: the day you're on, counting only days with a proven mission (so day one reads DAY 1).
  const shownUp = activeDays(record);
  const dayNo = shownUp.size + (shownUp.has(day) ? 0 : 1);
  // Day 1: nothing proven on any earlier day. No zeros, and the first reward is said as one.
  const firstDay = dayNo === 1;

  // The weekly focus question: from the second active day on, in a week with none set and not skipped.
  // Not on Sunday: the week is ending (an answer would last a day), and the weekly review asks
  // about next week then.
  const sunday = addDays(weekFocus.week, 6) === day;
  const askFocus = !firstDay && !sunday && ready && all > 0 && !weekFocus.focus && !weekFocus.skipped;
  const focusLabel = weekFocus.focus ? FOCUS.label(weekFocus.focus) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colorway.bg }}>
      <StatusBar style={colorway.statusBar} />
      <ColorwayBackground colorway={colorway} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: insets.top + 8, paddingBottom: GAP.section }}>
        <TopRow colorway={colorway} days={dayNo} />

        <View style={{ marginTop: 14 }}>
          <StatsRow colorway={colorway} streak={streak.current} points={points} firstDay={firstDay} onPoints={() => navigation.navigate('Rewards')} />
        </View>

        {accessEnabled && next ? (
          <View style={{ marginTop: GAP.block }}>
            <NextReward
              colorway={colorway}
              title={next.tier.title}
              have={next.have}
              points={next.tier.points}
              need={next.need}
              ready={next.ready}
              first={firstDay && !record.redemptions?.length}
              onPress={() => navigation.navigate('Rewards')}
            />
          </View>
        ) : null}

        {askFocus ? (
          <View style={{ marginTop: GAP.block }}>
            <FocusCard
              colorway={colorway}
              onOpen={() => navigation.navigate('WeeklyFocus')}
              onSkip={() => {
                selection();
                useApp.getState().skipFocus(weekFocus.week);
              }}
            />
          </View>
        ) : null}

        <View style={{ marginTop: GAP.section }}>
          <TodayHeader
            colorway={colorway}
            done={shownDone}
            all={all}
            ready={ready}
            focus={focusLabel}
            onFocus={() => navigation.navigate('WeeklyFocus')}
            perfect={perfect}
            onShare={() => navigation.navigate('Share')}
          />
        </View>

        <View style={{ marginTop: GAP.card, gap: GAP.card }}>
          {ready && all === 0 ? <NothingFits colorway={colorway} onPress={() => navigation.navigate('You')} /> : null}
          {missions.map(m => {
            const done = accepted(m.done);
            return (
              <MissionCard
                key={m.mission.id}
                mission={m.mission}
                area={m.area}
                done={done}
                action={actionFor(m)}
                colorway={colorway}
                swap={canSwap(m) ? { left: swapsLeft } : null}
                onOpen={() => navigation.navigate('Mission', { missionId: m.mission.id })}
                onSwap={() => swap(m)}
                celebrate={celebrate.ids.includes(m.mission.id) ? celebrate.n : 0}
                hold={Boolean(done) && !shownIds.includes(m.mission.id)}
                arrive={swapped === m.mission.id}
              />
            );
          })}
        </View>

        {prog && progDay ? (
          <View style={{ marginTop: GAP.block }}>
            <ActivePlanCard colorway={colorway} title={prog.title} day={progDay} days={prog.days} onPress={() => navigation.navigate('Plans')} />
          </View>
        ) : null}

        {review && review.missions > 0 && week ? (
          <View style={{ marginTop: prog && progDay ? GAP.card : GAP.block }}>
            <WeeklyCard
              colorway={colorway}
              missions={review.missions}
              focusMinutes={review.focusMinutes}
              last={week !== weekFocus.week}
              onPress={() => navigation.navigate('WeeklyReview', { weekStart: week })}
            />
          </View>
        ) : null}

        {prog && progDay ? null : (
          // The row's own 14pt padding makes up the rest of the block gap.
          <View style={{ marginTop: GAP.block - 14 }}>
            <PlansRow colorway={colorway} onPress={() => navigation.navigate('Plans')} />
          </View>
        )}
      </ScrollView>

      <ColorwaySheet visible={sheet === 'colorway'} onClose={() => setSheet(null)} onFull={() => navigation.navigate('Paywall', { from: 'colorway' })} />
    </View>
  );
}
