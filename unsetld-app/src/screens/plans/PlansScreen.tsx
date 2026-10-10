import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { meetsRequirements } from '../../core/missions';
import { programDay, programDayView, programFinished } from '../../core/programs';
import type { Program } from '../../core/types';
import { MISSION_BY_ID, PROGRAM_BY_ID, PROGRAMS, TRACK_BY_ID } from '../../content';
import { PROGRAMS_COPY } from '../../content/copy/programs';
import { PROOF_KIND } from '../../content/copy/proof';
import type { RootProps } from '../../navigation/types';
import { light, selection } from '../../services/haptics';
import { plannedArea } from '../../state/missions';
import { useApp } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { Card, Meter, ProofMeta, SectionLabel } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN, radius } from '../../ui/tokens';

const P = PROGRAMS_COPY;

/** The small filled button on a plan card: START. 32 tall like Today's, with slop to a 44pt hit area. */
function StartButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      style={({ pressed }) => ({
        height: 32,
        paddingHorizontal: 16,
        borderRadius: radius.button,
        backgroundColor: C.bone,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <T v="button" color={C.ink}>
        {P.start}
      </T>
    </Pressable>
  );
}

/** A meta line ("Projects · 30 min · Timer + photo · +15 pts"): pieces with a dot between, wrapping as a whole. */
function MetaLine({ parts, color }: { parts: ReactNode[]; color: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 2 }}>
      {parts.flatMap((part, i) => [
        i > 0 ? (
          <T key={`dot${i}`} v="meta" color={color} style={{ marginHorizontal: 4 }}>
            ·
          </T>
        ) : null,
        <View key={`part${i}`}>{typeof part === 'string' ? <T v="meta" color={color}>{part}</T> : part}</View>,
      ])}
    </View>
  );
}

type MissionState = 'open' | 'proven' | 'swapped' | 'later';

/**
 * One of the plan's missions, as a compact version of Today's card: the title (serif), then the
 * planned area (unless the label above already names it), time, how it's proven and its points.
 * Opens the mission while it's open in today's plan; proven ones dim with a check; tomorrow's are a preview.
 */
function PlanMission({ id, area, showArea, state, onOpen }: { id: string; area: string; showArea: boolean; state: MissionState; onOpen: () => void }) {
  const m = MISSION_BY_ID[id];
  if (!m) return null;
  const open = state === 'open';
  const dim = state === 'proven' || state === 'swapped';
  const kind = PROOF_KIND[m.proofType] ?? PROOF_KIND.PHOTO;
  const parts: ReactNode[] =
    state === 'proven'
      ? [
          <View key="p" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="check" size={15} color={C.muted} />
            <T v="meta" color={C.muted}>
              {P.proven}
            </T>
          </View>,
          ...(showArea ? [area] : []),
          P.points(m.points),
        ]
      : state === 'swapped'
        ? [P.swappedOut, ...(showArea ? [area] : [])]
        : [...(showArea ? [area] : []), P.minutes(m.minutes), <ProofMeta key="proof" type={m.proofType} />, P.points(m.points)];
  return (
    <Pressable
      accessibilityRole={open ? 'button' : undefined}
      accessibilityLabel={P.missionA11y(m.title, area, m.minutes, m.points, kind.a11y, state === 'proven' ? P.proven : state === 'swapped' ? P.swappedOut : undefined)}
      accessibilityHint={open ? P.openHint : undefined}
      disabled={!open}
      onPress={onOpen}
      style={({ pressed }) => ({ paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="saved" color={dim ? C.stone : C.bone}>
          {m.title}
        </T>
        <View style={{ marginTop: 6 }}>
          <MetaLine parts={parts} color={C.muted} />
        </View>
      </View>
      {/* Only a row that opens its mission says so: tomorrow's are a preview. */}
      {open ? <Icon name="chevron-right" size={18} color={C.stone} /> : null}
    </Pressable>
  );
}

/** A plan in the list: serif title, one line, "7 days · Discipline", and Start (or why it can't start). */
function PlanCard({ p, fits, onStart, onAboutYou }: { p: Program; fits: boolean; onStart: () => void; onAboutYou: () => void }) {
  // Areas by their short names; one the app no longer has is left out.
  const areas = p.tracks.flatMap(t => (TRACK_BY_ID[t] ? [TRACK_BY_ID[t].short] : []));
  const N = P.needsSchool;
  return (
    <Card>
      <View accessible accessibilityLabel={P.cardA11y(p.title, p.short, p.days, areas)}>
        <T v="list">{p.title}</T>
        <T v="small" color={C.stone} style={{ marginTop: 4 }}>
          {p.short}
        </T>
      </View>
      <View style={{ marginTop: 14, minHeight: fits ? 32 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <T v="meta" color={C.muted} style={{ flexShrink: 1 }} accessibilityElementsHidden importantForAccessibility="no">
          {P.meta(P.days(p.days), areas)}
        </T>
        {fits ? <StartButton accessibilityLabel={p.free ? P.startA11y(p.title) : P.plusA11y(p.title)} onPress={onStart} /> : null}
      </View>
      {fits ? null : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${N.before}${N.link}${N.after}`}
          accessibilityHint={P.needsSchoolHint}
          onPress={onAboutYou}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T v="note" color={C.stone}>
            {N.before}
            <T v="note" color={C.bone} style={{ textDecorationLine: 'underline' }}>
              {N.link}
            </T>
            {N.after}
          </T>
        </Pressable>
      )}
    </Card>
  );
}

/**
 * Plans (docs/UX_REDESIGN.md section 10): the active plan at the top (its day, the days proven,
 * today's or tomorrow's missions, Leave plan), then the free plans, then the rest under
 * "With UNSETLD+". One plan at a time; an UNSETLD+ plan opens the paywall without the membership.
 */
export function PlansScreen({ navigation }: RootProps<'Plans'>) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const day = useApp(s => s.currentDay);
  const program = useApp(s => s.program);
  const plan = useApp(s => s.plans[s.currentDay]);
  const provenToday = useApp(s => s.record.missions?.[s.currentDay]);
  const premium = useApp(s => s.premium.active);
  const profile = useApp(s => s.profile);
  // Every mission of the plan has to be one the user's answers allow (School Reset needs school).
  const fits = (p: Program) => p.plan.flat().every(id => meetsRequirements(MISSION_BY_ID[id]?.requires, profile));
  /** The plan started on this visit: its note says when Day 1 runs until a day is proven. */
  const [started, setStarted] = useState<string | null>(null);

  const current = program ? PROGRAM_BY_ID[program.id] ?? null : null;
  // A plan no longer in the library (an old install's) can't be shown or run: let it go.
  const gone = Boolean(program && !current);
  useEffect(() => {
    if (gone) useApp.getState().leaveProgram();
  }, [gone]);
  const finished = Boolean(current && program && programFinished(current, program));
  const running = current && program && !finished ? current : null;
  const n = running && program ? programDay(running, program, day) : null;
  const view = running && program ? programDayView(running, program, day, plan) : null;

  const start = (p: Program) => {
    if (!fits(p)) return;
    if (!p.free && !premium) {
      selection();
      navigation.navigate('Paywall', { from: 'programs' });
      return;
    }
    const go = () => {
      useApp.getState().startProgram(p.id);
      light();
      const st = useApp.getState();
      const today = st.plans[st.currentDay];
      const inToday = !today || today.missions.some(m => m.programId === p.id);
      setStarted(p.id);
      AccessibilityInfo.announceForAccessibility(inToday ? P.started : P.startsTomorrow);
      scroll.current?.scrollTo({ y: 0, animated: true });
    };
    // Only one at a time: switching from a running plan asks first.
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

  const stateOf = (id: string): MissionState => {
    if (view?.when !== 'today') return 'later';
    if (provenToday?.[id]?.verification?.status === 'accepted') return 'proven';
    if (plan?.missions.some(m => m.missionId === id)) return 'open';
    return plan?.replaced.includes(id) ? 'swapped' : 'later';
  };

  // The running plan sits at the top, so the list leaves it out. In each section, plans for the
  // user's areas come first and ones their answers rule out (School Reset outside school) last.
  const rank = (p: Program) => (fits(p) ? 0 : 2) + (p.tracks.some(t => profile.tracks.includes(t)) ? 0 : 1);
  const list = PROGRAMS.filter(p => p.id !== running?.id)
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.p);
  const free = list.filter(p => p.free);
  const plus = list.filter(p => !p.free);
  const top = Boolean(running || finished);

  const cards = (ps: readonly Program[]) => (
    <View style={{ gap: GAP.card }}>
      {ps.map(p => (
        <PlanCard key={p.id} p={p} fits={fits(p)} onStart={() => start(p)} onAboutYou={() => navigation.navigate('AboutYou', { edit: true })} />
      ))}
    </View>
  );

  let activeCard: ReactNode = null;
  if (running && program && n !== null && view) {
    // Each mission's planned area (tomorrow's: the area of yours it serves). When they share one,
    // the label says it once ("Today · Projects") and the rows leave it out.
    const rows = view.ids.flatMap(id => {
      const m = MISSION_BY_ID[id];
      if (!m) return [];
      const planned = view.when === 'today' ? plan?.missions.find(pm => pm.missionId === id) : undefined;
      return [{ id, area: TRACK_BY_ID[plannedArea(planned, m, profile.tracks)]?.short ?? '' }];
    });
    const shared = rows.length > 0 && rows.every(r => r.area === rows[0].area) ? rows[0].area : null;
    const when = view.when === 'today' ? P.today : view.wait === 'proven' ? P.tomorrowDay(view.day) : P.tomorrow;
    const label = shared ? P.label(when, shared) : when;
    // Read from the plan's state each render, so the note follows a proof or a swap made from here
    // ("Day 1 is in your missions today." gives way to "Today's day is proven..." once it is).
    const fresh = started === running.id && program.doneDays.length === 0;
    const note =
      view.wait === 'proven'
        ? P.doneToday
        : view.wait === 'swapped'
          ? P.swapped
          : view.wait === 'set'
            ? fresh
              ? P.startsTomorrow
              : P.joinsTomorrow
            : fresh
              ? P.started
              : null;
    activeCard = (
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="kicker" color={C.stone} accessibilityRole="header">
            {P.active}
          </T>
          <T v="meta" color={C.muted}>
            {P.dayOf(n, running.days)}
          </T>
        </View>
        <T v="title.m" style={{ marginTop: 10 }}>
          {running.title}
        </T>
        <View style={{ marginTop: 16 }}>
          <Meter value={program.doneDays.length} max={running.days} accessibilityLabel={P.progressA11y(program.doneDays.length, running.days)} />
        </View>
        {rows.length ? (
          <View style={{ marginTop: 24 }}>
            <T v="meta" color={C.stone}>
              {label}
            </T>
            <View style={{ marginTop: 8, gap: 12 }}>
              {rows.map(r => (
                <PlanMission
                  key={r.id}
                  id={r.id}
                  area={r.area}
                  showArea={!shared}
                  state={stateOf(r.id)}
                  onOpen={() => navigation.navigate('Mission', { missionId: r.id })}
                />
              ))}
            </View>
          </View>
        ) : null}
        {note ? (
          <T v="note" color={C.stone} style={{ marginTop: 16 }} accessibilityLiveRegion="polite">
            {note}
          </T>
        ) : null}
        <TextButton title={P.leave} align="left" onPress={() => leave(running.title)} style={{ marginTop: 8, marginBottom: -10 }} />
      </Card>
    );
  } else if (current && program && finished) {
    activeCard = (
      <Card>
        <T v="kicker" color={C.stone} accessibilityRole="header">
          {P.finished}
        </T>
        <T v="title.m" style={{ marginTop: 10 }}>
          {current.title}
        </T>
        <View style={{ marginTop: 16 }}>
          <Meter value={1} max={1} />
        </View>
        <T v="small" color={C.stone} style={{ marginTop: 12 }}>
          {P.finishedLine(current.days)}
        </T>
        <TextButton title={P.clear} align="left" onPress={() => useApp.getState().leaveProgram()} style={{ marginTop: 4, marginBottom: -10 }} />
      </Card>
    );
  }

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />} scroll={false} contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 48 }}>
        <PageTitle title={P.title} body={P.body} />

        {activeCard ? <View style={{ marginTop: GAP.block }}>{activeCard}</View> : null}

        {free.length ? (
          <View style={{ marginTop: top ? GAP.section : GAP.block }}>
            {top ? <SectionLabel>{P.more}</SectionLabel> : null}
            {cards(free)}
          </View>
        ) : null}

        {plus.length ? (
          <View style={{ marginTop: GAP.section }}>
            <SectionLabel>{P.plus}</SectionLabel>
            {cards(plus)}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
