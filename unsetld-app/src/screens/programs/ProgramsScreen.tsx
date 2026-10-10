import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { meetsRequirements } from '../../core/missions';
import { programDay, programMissions } from '../../core/programs';
import type { PlannedMission, Program } from '../../core/types';
import { MISSION_BY_ID, PROGRAM_BY_ID, PROGRAMS, TRACK_BY_ID } from '../../content';
import { HOME } from '../../content/copy/home';
import { PROGRAMS_COPY } from '../../content/copy/programs';
import type { RootProps } from '../../navigation/types';
import { light } from '../../services/haptics';
import { plannedArea } from '../../state/missions';
import { useApp } from '../../state/store';
import { badgeOf } from '../home/parts';
import { showDialog } from '../../ui/actions';
import { Icon } from '../../ui/icons';
import { NavRow, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, hairline, MARGIN, radius } from '../../ui/tokens';

const P = PROGRAMS_COPY;

/** An outline button, 36 tall with slop to a 44pt hit area. */
function SmallButton({ title, onPress, accessibilityLabel }: { title: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(237,233,227,0.4)',
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="button" color={C.bone}>
        {title}
      </T>
    </Pressable>
  );
}

/** A 2pt bar, bone on rule. */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height: 2, backgroundColor: C.rule }}>
      <View style={{ height: 2, width: `${pct * 100}%`, backgroundColor: C.bone }} />
    </View>
  );
}

type MissionState = 'open' | 'proven' | 'swapped' | 'later';

/**
 * One of the program's missions, as Home shows it: the title, then "School ·
 * 30 min · +15" (with Timer or Before + after). `planned`: its place in today's
 * plan, whose area the line names. Opens the mission when it's in today's plan;
 * PROVEN once done.
 */
function ProgramMission({
  id,
  planned,
  state,
  last,
  onOpen,
}: {
  id: string;
  planned: PlannedMission | undefined;
  state: MissionState;
  last: boolean;
  onOpen: () => void;
}) {
  const tracks = useApp(s => s.profile.tracks);
  const m = MISSION_BY_ID[id];
  if (!m) return null;
  const area = TRACK_BY_ID[plannedArea(planned, m, tracks)]?.short ?? '';
  const badge = badgeOf(m);
  const open = state === 'open';
  return (
    <Pressable
      accessibilityRole={open ? 'button' : undefined}
      accessibilityLabel={P.missionA11y(
        m.title,
        HOME.a11y.meta(area, m.minutes, m.points, badge?.said ?? null),
        state === 'proven' ? P.proven : state === 'swapped' ? P.swappedLabel : undefined,
      )}
      accessibilityHint={open ? P.openHint : undefined}
      disabled={!open}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: C.rule,
        opacity: pressed ? 0.6 : 1,
      })}>
      <View style={{ flex: 1, paddingRight: 12, gap: 4 }}>
        <T v="saved" color={state === 'proven' ? C.stone : C.bone}>
          {m.title}
        </T>
        <T v="mono">{HOME.meta(area, m.minutes, m.points, badge?.shown ?? null)}</T>
      </View>
      {state === 'proven' ? (
        <T v="label">{P.proven}</T>
      ) : state === 'swapped' ? (
        <T v="label">{P.swappedLabel}</T>
      ) : open ? (
        <View style={{ marginRight: -8 }}>
          <Icon name="chevron-right" size={24} color={C.stone} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** A program in the list: edition, title, what it is, days and areas ("7 days · School"), and Start. */
function ProgramRow({ p, active, fits, last, onStart }: { p: Program; active: boolean; fits: boolean; last: boolean; onStart: () => void }) {
  // Areas by their short names; one the app no longer has is left out.
  const areas = p.tracks.flatMap(t => (TRACK_BY_ID[t] ? [TRACK_BY_ID[t].short] : []));
  return (
    <View
      style={{
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: C.rule,
      }}>
      <View style={{ flex: 1 }} accessible accessibilityLabel={P.rowA11y(p.title, p.short, p.days, areas, p.free)}>
        <T v="label" color={p.free ? C.bone : C.stone}>
          {p.free ? P.free : P.full}
        </T>
        <T v="list" style={{ marginTop: 8 }}>
          {p.title}
        </T>
        <T v="note" color={C.stone} style={{ marginTop: 4 }}>
          {p.short}
        </T>
        <T v="mono" style={{ marginTop: 10 }}>
          {P.meta(P.days(p.days), areas)}
        </T>
        {fits ? null : (
          <T v="note" color={C.stone} style={{ marginTop: 8 }}>
            {P.needsSchool}
          </T>
        )}
      </View>
      {!fits && !active ? null : active ? (
        <T v="label" color={C.bone}>
          {P.running}
        </T>
      ) : (
        <SmallButton title={P.start} accessibilityLabel={p.free ? P.startA11y(p.title) : `${P.startA11y(p.title)}. ${P.lockedA11y(p.title)}`} onPress={onStart} />
      )}
    </View>
  );
}

/**
 * Programs (spec section 11): the active program at the top (its day, the
 * missions for today or tomorrow, Leave program), then every program with
 * Start. One program at a time; Full Edition programs open the paywall for
 * free users.
 */
export function ProgramsScreen({ navigation }: RootProps<'Programs'>) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const day = useApp(s => s.currentDay);
  const program = useApp(s => s.program);
  const plan = useApp(s => s.plans[s.currentDay]);
  const provenToday = useApp(s => s.record.missions?.[s.currentDay]);
  const premium = useApp(s => s.premium.active);
  const profile = useApp(s => s.profile);
  // Every mission of the program has to be one the user's answers allow (School Reset needs school).
  const fits = (p: Program) => p.plan.flat().every(id => meetsRequirements(MISSION_BY_ID[id]?.requires, profile));
  /** The line under the active program right after Start, for this visit. */
  const [started, setStarted] = useState<{ id: string; line: string } | null>(null);

  const current = program ? PROGRAM_BY_ID[program.id] ?? null : null;
  // A program no longer in the library (an old install's) can't be shown or run: let it go.
  const gone = Boolean(program && !current);
  useEffect(() => {
    if (gone) useApp.getState().leaveProgram();
  }, [gone]);
  // Every day proven counts as finished even without a finish date (a state from an earlier
  // build, or a program that got shorter): Clear, rather than a run with no day to show.
  const finished = Boolean(program?.finishedDay) || Boolean(current && program && program.doneDays.length >= current.days);
  const running = current && program && !finished ? current : null;
  const n = running && program ? programDay(running, program, day) : null;

  const start = (p: Program) => {
    if (!fits(p)) return;
    if (!p.free && !premium) {
      navigation.navigate('Paywall', { from: 'programs' });
      return;
    }
    const go = () => {
      useApp.getState().startProgram(p.id);
      light();
      const st = useApp.getState();
      const today = st.plans[st.currentDay];
      const inToday = !today || today.missions.some(m => m.programId === p.id);
      const line = inToday ? P.started : P.startsTomorrow;
      setStarted({ id: p.id, line });
      AccessibilityInfo.announceForAccessibility(line);
      scroll.current?.scrollTo({ y: 0, animated: true });
    };
    // Only one at a time: switching from a running program asks first.
    if (running && running.id !== p.id) {
      showDialog(P.switchTitle(p.title), P.switchBody(running.title), [
        { label: P.switchNo, cancel: true },
        { label: P.switchYes, onPress: go },
      ]);
    } else go();
  };

  const leave = (title: string) =>
    showDialog(P.leaveTitle(title), P.leaveBody, [
      { label: P.leaveNo, cancel: true },
      {
        label: P.leaveYes,
        onPress: () => {
          setStarted(null);
          useApp.getState().leaveProgram();
        },
      },
    ]);

  // What the active program shows: today's missions, or tomorrow's when today
  // is proven, or when today's plan was set without it (started late, or swapped out).
  let block: { label: string; ids: string[]; today: boolean; note: string | null } | null = null;
  if (running && program && n !== null) {
    const ids = programMissions(running, program, day);
    const inPlan = !plan || plan.missions.some(m => m.programId === running.id);
    if (program.doneDays.includes(day)) {
      block = { label: P.tomorrow, ids: running.plan[n] ?? [], today: false, note: P.doneToday };
    } else if (inPlan) {
      block = { label: P.today, ids, today: true, note: null };
    } else {
      const swapped = ids.some(id => plan?.replaced.includes(id));
      block = { label: P.tomorrow, ids, today: false, note: swapped ? P.swapped : P.joinsTomorrow };
    }
    if (started?.id === running.id) block.note = started.line;
    // A mission no longer in the library has nothing to show.
    block.ids = block.ids.filter(id => MISSION_BY_ID[id]);
  }

  const stateOf = (id: string): MissionState => {
    if (!block?.today) return 'later';
    if (provenToday?.[id]?.verification?.status === 'accepted') return 'proven';
    if (plan?.missions.some(m => m.missionId === id)) return 'open';
    return plan?.replaced.includes(id) ? 'swapped' : 'later';
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />} scroll={false} contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 48 }}>
        <T v="title.xl" accessibilityRole="header" style={{ marginTop: 24 }}>
          {P.title}
        </T>
        <T v="body" color={C.stone} style={{ marginTop: 12 }}>
          {P.body}
        </T>

        {running && program && n !== null && block ? (
          <View style={{ marginTop: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T v="label" accessibilityRole="header">
                {P.active}
              </T>
              <T v="mono" color={C.bone} accessibilityLabel={P.dayOfA11y(n, running.days)}>
                {P.dayOf(n, running.days)}
              </T>
            </View>
            <T v="title.m" accessibilityRole="header" style={{ marginTop: 10 }}>
              {running.title}
            </T>
            <View style={{ marginTop: 14 }} accessible accessibilityLabel={P.progressA11y(program.doneDays.length, running.days)}>
              <Bar value={program.doneDays.length} max={running.days} />
            </View>
            {block.ids.length ? (
              <View style={{ marginTop: 24 }}>
                <T v="label" style={{ marginBottom: 8 }}>
                  {block.label}
                </T>
                {block.ids.map((id, i) => (
                  <ProgramMission
                    key={id}
                    id={id}
                    planned={block.today ? plan?.missions.find(p => p.missionId === id) : undefined}
                    state={stateOf(id)}
                    last={i === block.ids.length - 1}
                    onOpen={() => navigation.navigate('Mission', { missionId: id })}
                  />
                ))}
              </View>
            ) : null}
            {block.note ? (
              <T v="note" color={C.stone} style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
                {block.note}
              </T>
            ) : null}
            <TextButton title={P.leave} align="left" onPress={() => leave(running.title)} style={{ marginTop: 12 }} />
          </View>
        ) : null}

        {current && program && finished ? (
          <View style={{ marginTop: 40 }}>
            <T v="label" accessibilityRole="header">
              {P.finished}
            </T>
            <T v="title.m" accessibilityRole="header" style={{ marginTop: 10 }}>
              {current.title}
            </T>
            <View style={{ marginTop: 14 }}>
              <Bar value={1} max={1} />
            </View>
            <T v="body" color={C.stone} style={{ marginTop: 12 }}>
              {P.finishedLine(current.days)}
            </T>
            <TextButton title={P.clear} align="left" onPress={() => useApp.getState().leaveProgram()} style={{ marginTop: 4 }} />
          </View>
        ) : null}

        <View style={{ marginTop: 48 }}>
          <T v="label" accessibilityRole="header" style={{ marginBottom: 8 }}>
            {P.all}
          </T>
          {PROGRAMS.map((p, i) => (
            <ProgramRow key={p.id} p={p} active={running?.id === p.id} fits={fits(p)} last={i === PROGRAMS.length - 1} onStart={() => start(p)} />
          ))}
          {!premium && PROGRAMS.some(p => !p.free) ? (
            <T v="note" color={C.stone} style={{ marginTop: 12 }}>
              {P.fullNote}
            </T>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
