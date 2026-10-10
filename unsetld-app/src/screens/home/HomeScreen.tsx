import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { slotsFor, swapArea } from '../../core/missions';
import { programDay } from '../../core/programs';
import { activeDays, milestones, type MilestoneKey } from '../../core/progress';
import { pendingLetter } from '../../core/record';
import { reviewWeekFor, weeklyReview } from '../../core/review';
import type { DayKey } from '../../core/time';
import type { MissionDone, RecordState } from '../../core/types';
import { MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID, TRACK_BY_ID } from '../../content';
import { HOME } from '../../content/copy/home';
import type { TabProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { deletePhoto } from '../../services/proof';
import { cancelTimerDone } from '../../services/timerNotify';
import { useBalance, useNextReward, useRerollsLeft, useStreak, useTodayMissions, type TodayMission } from '../../state/missions';
import { useAccessEnabled, useApp, useAppActive, useReaderColorway } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { ColorwayBackground } from '../../ui/ColorwayBackground';
import { T } from '../../ui/text';
import { MARGIN } from '../../ui/tokens';
import { accessDays, accessRecord } from '../access';
import { ColorwaySheet } from '../today/ColorwaySheet';
import {
  AccessNote,
  BottomBar,
  MissionCard,
  NextRewardLine,
  ProgramBanner,
  StatsHeader,
  TodayHeader,
  TopRow,
  WeeklyCard,
  type CardAction,
} from './parts';

/** A beat after Home settles, so a card that was just proven plays first. */
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

/** Home (route Today): today's missions, the streak and points, and where they lead. */
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
  const accessIntroShown = useApp(s => s.reading.accessIntroShown);
  const { plan, missions } = useTodayMissions(day);
  const streak = useStreak(day);
  const points = useBalance();
  const next = useNextReward(day);
  const swapsLeft = useRerollsLeft(day);

  const [sheet, setSheet] = useState<'colorway' | null>(route.params?.sheet === 'colorway' ? 'colorway' : null);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Today's plan, on focus and again when the day turns over at 4:00 AM.
  // A timer or a before photo left from an earlier day can't count any more
  // (that day's plan is closed): it goes, with its photo and its notification.
  // Home in focus means no Mission screen is open on top of it.
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
  // Mission screen was on top shows up as new once Home is back in view, and plays.
  const provenIds = missions.filter(m => accepted(m.done)).map(m => m.mission.id);
  const provenKey = provenIds.join(',');
  const [seen, setSeen] = useState({ day, key: provenKey, ids: provenIds });
  const [celebrate, setCelebrate] = useState<{ ids: string[]; n: number }>({ ids: [], n: 0 });
  // A card that just came in from a swap, and the note under it.
  const [swapped, setSwapped] = useState<{ missionId: string; note: string } | null>(null);
  // The Day 3 note stays up for the visit it first shows on, even once it's marked seen.
  const [noteDay, setNoteDay] = useState<DayKey | null>(null);
  // Route params: Settings asks for the colorway sheet, a widget or link for the top.
  const nonce = route.params?.nonce;
  const [seenNonce, setSeenNonce] = useState(nonce);

  if (seen.day !== day) {
    // 4:00 AM with Home open: the new day starts at the top, with nothing left over from the last.
    setSeen({ day, key: provenKey, ids: provenIds });
    setCelebrate({ ids: [], n: 0 });
    setSwapped(null);
    setNoteDay(null);
    setScrollTop(t => t + 1);
  } else if (isFocused && seen.key !== provenKey) {
    const fresh = provenIds.filter(id => !seen.ids.includes(id));
    setSeen({ day, key: provenKey, ids: provenIds });
    if (fresh.length) setCelebrate(c => ({ ids: fresh, n: c.n + 1 }));
  }
  if (nonce !== seenNonce) {
    setSeenNonce(nonce);
    if (route.params?.sheet === 'colorway') setSheet('colorway');
    else setScrollTop(t => t + 1);
  }
  useEffect(() => {
    if (scrollTop) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollTop]);

  // Milestone moments first, then Access letters: one at a time, a beat after Home
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

  // Day 3: one quiet note about what showing up opens.
  const access = accessDays(record);
  const noteDue = accessEnabled && access >= 3 && !accessIntroShown;
  if (noteDue && noteDay !== day) setNoteDay(day);
  const showAccessNote = accessEnabled && noteDay === day;
  useEffect(() => {
    if (noteDue && isFocused && active) {
      const t = setTimeout(() => useApp.getState().markAccessIntro(), 4000);
      return () => clearTimeout(t);
    }
  }, [noteDue, isFocused, active]);

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
    // (a program's mission in an area since dropped) one of the user's areas.
    const s = useApp.getState();
    const plan = s.plans[day];
    const to = plan ? swapArea(plan, m.index, { library: MISSIONS, profile: s.profile, day }) : m.area;
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
          const note = HOME.swap.done(title);
          setSwapped({ missionId: id, note });
          AccessibilityInfo.announceForAccessibility(note);
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
      // The card counts down on its own while Home is in view.
      return { kind: 'timer', timer, live: isFocused && active };
    }
    return { kind: 'start' };
  };

  // Busy: its timer is running or its before photo is saved, so it can't be swapped out.
  const busyWith = (m: TodayMission) =>
    (timer?.missionId === m.mission.id && timer.day === day) || (pendingBefore?.missionId === m.mission.id && pendingBefore.day === day);
  // A mission with any proof on record today (a rejected attempt included) stays: the store won't swap it.
  const canSwap = (m: TodayMission) => !m.done && !busyWith(m);
  // Swaps left are said once, under TODAY, while there's a mission to use one on.
  const swappable = missions.some(canSwap);

  const all = missions.length;
  const shownDone = seen.day === day ? seen.ids.length : 0;
  const ready = Boolean(plan);
  const allDone = ready && all > 0 && shownDone >= all;
  const tomorrow = slotsFor(profile).length;

  const prog = program ? PROGRAM_BY_ID[program.id] : undefined;
  const progDay = prog && program ? programDay(prog, program, day) : null;

  const week = reviewWeekFor(day);
  const review = week && reviewSeen !== week ? weeklyReview(record, plans, profile, week) : null;

  // Day N: the day you're on, counting only days with a proven mission (so day one reads DAY 1).
  const shownUp = activeDays(record);
  const dayNo = shownUp.size + (shownUp.has(day) ? 0 : 1);

  return (
    <View style={{ flex: 1, backgroundColor: colorway.bg }}>
      <StatusBar style={colorway.statusBar} />
      <ColorwayBackground colorway={colorway} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}>
        <TopRow colorway={colorway} days={dayNo} />

        <View style={{ marginTop: 20 }}>
          <StatsHeader
            colorway={colorway}
            streak={streak.current}
            offDays={streak.offDays}
            points={points}
            onPoints={() => navigation.navigate('Rewards')}
          />
        </View>

        {accessEnabled && next ? (
          <View style={{ marginTop: 20 }}>
            <NextRewardLine
              colorway={colorway}
              title={next.tier.title}
              need={next.need}
              ready={next.ready}
              onPress={() => navigation.navigate('Rewards')}
            />
          </View>
        ) : null}

        <View style={{ marginTop: 40 }}>
          <TodayHeader colorway={colorway} done={shownDone} all={all} ready={ready} swapsLeft={swappable ? swapsLeft : null} />
        </View>

        {prog && progDay ? (
          <View style={{ marginTop: 20 }}>
            <ProgramBanner
              colorway={colorway}
              title={prog.title}
              day={progDay}
              days={prog.days}
              onPress={() => navigation.navigate('Plans')}
            />
          </View>
        ) : null}

        <View style={{ marginTop: prog && progDay ? 0 : 20 }}>
          {missions.map((m, i) => {
            const done = accepted(m.done);
            const isNew = swapped?.missionId === m.mission.id;
            return (
              <MissionCard
                key={m.mission.id}
                mission={m.mission}
                area={m.area}
                done={done}
                action={actionFor(m)}
                colorway={colorway}
                last={i === missions.length - 1}
                swap={canSwap(m) ? { left: swapsLeft, note: isNew ? swapped.note : null } : null}
                onOpen={() => navigation.navigate('Mission', { missionId: m.mission.id })}
                onSwap={() => swap(m)}
                celebrate={celebrate.ids.includes(m.mission.id) ? celebrate.n : 0}
                arrive={isNew}
              />
            );
          })}
        </View>

        {allDone ? (
          <T v="body" color={colorway.secondary} style={{ marginTop: 24 }}>
            {HOME.comeBack(tomorrow)}
          </T>
        ) : null}

        {review && review.missions > 0 && week ? (
          <View style={{ marginTop: 40 }}>
            <WeeklyCard
              colorway={colorway}
              missions={review.missions}
              focusMinutes={review.focusMinutes}
              onPress={() => navigation.navigate('WeeklyReview', { weekStart: week })}
            />
          </View>
        ) : null}

        {showAccessNote ? (
          <View style={{ marginTop: 40 }}>
            <AccessNote colorway={colorway} onRewards={() => navigation.navigate('Rewards')} />
          </View>
        ) : null}
      </ScrollView>

      <BottomBar
        colorway={colorway}
        nudge={celebrate.n}
        onProgress={() => navigation.navigate('Progress')}
        onPrograms={() => navigation.navigate('Plans')}
        onRewards={() => navigation.navigate('Rewards')}
        onColorway={() => setSheet('colorway')}
      />

      <ColorwaySheet visible={sheet === 'colorway'} onClose={() => setSheet(null)} onFull={() => navigation.navigate('Paywall', { from: 'colorway' })} />
    </View>
  );
}
