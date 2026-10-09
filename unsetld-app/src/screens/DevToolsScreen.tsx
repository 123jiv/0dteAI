import { View } from 'react-native';
import { completeMission } from '../core/complete';
import { generatePlan, historyFrom } from '../core/missions';
import { activeDays } from '../core/progress';
import { emptyRecord } from '../core/record';
import { requiredPhotos } from '../core/verify';
import { addDays, atMinutes, type DayKey } from '../core/time';
import type { DayPlan, Mission, ProofPhoto, RecordState, Verification } from '../core/types';
import { MISSION_BY_ID, MISSIONS } from '../content';
import { PLATFORM } from '../content/copy/platform';
import type { RootProps } from '../navigation/types';
import { today } from '../services/clock';
import { deletePhoto } from '../services/proof';
import { purchaseMode } from '../services/purchases';
import { useBalance, useStreak, useTodayMissions } from '../state/missions';
import { useAccessEnabled, useApp } from '../state/store';
import { showDialog } from '../ui/actions';
import { Button, Footnote, NavRow, PageTitle, Screen, SettingsRow, Toggle } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, MARGIN } from '../ui/tokens';

const D = PLATFORM.devTools;
const st = useApp.getState;

function Label({ children }: { children: string }) {
  return (
    <T v="label" style={{ marginTop: 32, marginBottom: 12 }}>
      {children}
    </T>
  );
}

let fakeCount = 0;

/** Placeholder photos for a tester proof: no file, a fingerprint no real photo has. */
function fakePhotos(m: Mission, day: DayKey, at: number): ProofPhoto[] {
  fakeCount += 1;
  const kinds = requiredPhotos(m.proofType);
  return kinds.map((kind, i) => ({
    uri: '',
    // Before photos come first, far enough apart for the before → after check.
    takenAt: at - (kinds.length - 1 - i) * 5 * 60_000,
    kind,
    hash: `tester-${day}-${m.id}-${kind}-${at.toString(36)}-${fakeCount}`,
  }));
}

function accepted(at: number): Verification {
  return { status: 'accepted', method: 'on-device', checks: [{ id: 'photos', ok: true, note: D.checkNote }], at };
}

const isProven = (r: RecordState, day: DayKey, id: string) => r.missions?.[day]?.[id]?.verification.status === 'accepted';

/** A past or future day's plan, as the store would build it (no program). */
function planFor(r: RecordState, plans: Record<DayKey, DayPlan>, day: DayKey): DayPlan {
  const s = st();
  return generatePlan({
    library: MISSIONS,
    profile: s.profile,
    day,
    salt: s.installSalt,
    history: historyFrom(r.missions ?? {}, plans, s.skips, day),
    program: null,
  });
}

/** Proves `missions` of `plan` on `day` into `r`, spread through the day from 9 AM. */
function proveInto(r: RecordState, day: DayKey, plan: DayPlan, missionIds: string[]): { record: RecordState; proven: number } {
  let record = r;
  let proven = 0;
  missionIds.forEach((id, k) => {
    const m = MISSION_BY_ID[id];
    if (!m || isProven(record, day, id)) return;
    const at = atMinutes(day, 9 * 60 + k * 95).getTime();
    const programId = plan.missions.find(p => p.missionId === id)?.programId;
    record = completeMission(record, day, plan, m, fakePhotos(m, day, at), accepted(at), {
      at,
      verifiedClock: true,
      timerSeconds: m.timerMinutes ? m.timerMinutes * 60 : undefined,
      programId,
    }).record;
    proven += 1;
  });
  return { record, proven };
}

/**
 * Tester tools (dev builds and the browser preview only): flags, proof without
 * a camera, history to look at, and time travel so streaks, Off Days, levels,
 * milestones, the weekly review and Access can be tried in minutes.
 */
export function DevToolsScreen({ navigation }: RootProps<'DevTools'>) {
  const offset = useApp(s => s.dayOffset);
  const day = useApp(s => s.currentDay);
  const record = useApp(s => s.record);
  const premium = useApp(s => s.premium.active);
  const timerSpeed = useApp(s => s.settings.timerSpeed);
  const accessEnabled = useAccessEnabled();
  const streak = useStreak(day);
  const points = useBalance();
  const { missions, proven } = useTodayMissions(day);
  const active = activeDays(record).size;

  /** Completes each unproven mission in today's plan, through the store, like the Mission screen would. */
  const proveToday = () => {
    const d = today();
    const plan = st().ensurePlan(d);
    let n = 0;
    for (const p of plan.missions) {
      const m = MISSION_BY_ID[p.missionId];
      if (!m || isProven(st().record, d, m.id)) continue;
      const at = Date.now();
      st().completeMission(m.id, fakePhotos(m, d, at), accepted(at), {
        verifiedClock: false,
        timerSeconds: m.timerMinutes ? m.timerMinutes * 60 : undefined,
      });
      n += 1;
    }
    showDialog(D.proved(n));
  };

  /** The 20 days before today: a plan each, and its missions proven (every third day only part of it). */
  const backfill = () => {
    const d = today();
    let r = st().record;
    const plans = { ...st().plans };
    let missionsAdded = 0;
    let daysAdded = 0;
    for (let i = 20; i >= 1; i--) {
      const past = addDays(d, -i);
      if (Object.keys(r.missions?.[past] ?? {}).length) continue;
      const plan = plans[past] ?? planFor(r, plans, past);
      plans[past] = plan;
      const ids = plan.missions.map(p => p.missionId);
      const take = i % 3 === 0 ? ids.slice(0, Math.max(1, ids.length - 2)) : ids;
      const res = proveInto(r, past, plan, take);
      r = res.record;
      missionsAdded += res.proven;
      if (res.proven) daysAdded += 1;
    }
    st().setRecord(r);
    useApp.setState({ plans });
    showDialog(D.backfilled(missionsAdded, daysAdded));
  };

  /** Today and the next n-1 days each get a plan and one proven mission; then the clock moves n days on. */
  const jumpProving = (n: number) => {
    const d = today();
    let r = st().record;
    const plans = { ...st().plans };
    for (let i = 0; i < n; i++) {
      const at = addDays(d, i);
      const plan = plans[at] ?? planFor(r, plans, at);
      plans[at] = plan;
      if (plan.missions.some(p => isProven(r, at, p.missionId))) continue;
      const first = plan.missions[0]?.missionId;
      if (first) r = proveInto(r, at, plan, [first]).record;
    }
    // The jump first keeps the real record to come back to; the travelled one goes on top.
    st().setDayOffset(st().dayOffset + n);
    st().setRecord(r);
    useApp.setState({ plans });
  };
  const skip = (n: number) => st().setDayOffset(st().dayOffset + n);

  /** Back to the real date and record; plans made for days that haven't come yet go. */
  const backToReal = () => {
    st().backToRealToday();
    const d = today();
    useApp.setState(s => ({ plans: Object.fromEntries(Object.entries(s.plans).filter(([k]) => k <= d)) }));
  };

  const restartOnboarding = () => {
    const s = st();
    const d = today();
    // An untouched plan for today goes too, so the answers given now build it.
    const untouched = !Object.keys(s.record.missions?.[d] ?? {}).length && !(s.plans[d]?.rerolls ?? 0);
    if (untouched) {
      useApp.setState(x => {
        const plans = { ...x.plans };
        delete plans[d];
        return { plans };
      });
    }
    s.updateSettings({ onboarded: false });
    navigation.reset({ index: 0, routes: [{ name: 'Name' }] });
  };

  const clearAll = () =>
    showDialog(D.clearTitle, D.clearBody, [
      { label: D.clearNo, cancel: true },
      {
        label: D.clearYes,
        destructive: true,
        onPress: () => {
          backToReal();
          for (const byId of Object.values(st().record.missions ?? {})) {
            for (const m of Object.values(byId)) for (const p of m.photos) deletePhoto(p.uri);
          }
          st().setRecord(emptyRecord());
          useApp.setState({ momentsShown: [], reviewSeen: null, timer: null, pendingBefore: null });
        },
      },
    ]);

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={D.title} body={D.body} />
      <View style={{ marginTop: 24, gap: 4 }}>
        <T v="mono">{D.today(day, offset)}</T>
        <T v="mono">{D.status(streak.current, points, proven, missions.length)}</T>
        <T v="mono">{D.active(active)}</T>
      </View>

      <Label>{D.flags}</Label>
      <View style={{ marginHorizontal: -MARGIN }}>
        <SettingsRow
          first
          title={D.full}
          chevron={false}
          right={<Toggle label={D.full} value={premium} onChange={v => st().setPremium({ active: v, plan: v ? 'annual' : null })} />}
        />
        {purchaseMode !== 'preview' ? <Footnote style={{ paddingBottom: 8 }}>{D.fullNote}</Footnote> : null}
        <SettingsRow
          title={D.fast}
          chevron={false}
          right={<Toggle label={D.fast} value={timerSpeed > 1} onChange={v => st().updateSettings({ timerSpeed: v ? 60 : 1 })} />}
        />
        <Footnote style={{ paddingBottom: 8 }}>{D.fastNote}</Footnote>
        <SettingsRow
          title={D.access}
          chevron={false}
          right={<Toggle label={D.access} value={accessEnabled} onChange={v => st().setRemote({ accessEnabled: v })} />}
        />
      </View>

      <Label>{D.missions}</Label>
      <View style={{ gap: 12 }}>
        <Button kind="outline" title={D.prove} onPress={proveToday} />
        <Button kind="outline" title={D.backfill} onPress={backfill} />
      </View>
      <T v="note" color={C.stone} style={{ marginTop: 12 }}>
        {D.missionsNote}
      </T>

      <Label>{D.travel}</Label>
      <View style={{ gap: 12 }}>
        <Button kind="outline" title={D.next} onPress={() => skip(1)} />
        <Button kind="outline" title={D.jump(6)} onPress={() => jumpProving(6)} />
        <Button kind="outline" title={D.jump(23)} onPress={() => jumpProving(23)} />
        <Button kind="outline" title={D.jump(60)} onPress={() => jumpProving(60)} />
        <Button kind="outline" title={D.disappear(15)} onPress={() => skip(15)} />
        <Button kind="outline" title={D.back} onPress={backToReal} />
      </View>
      <T v="note" color={C.stone} style={{ marginTop: 12 }}>
        {D.travelNote}
      </T>

      <Label>{D.reset}</Label>
      <View style={{ gap: 12 }}>
        <Button kind="outline" title={D.restart} onPress={restartOnboarding} />
        <Button kind="outline" title={D.clear} onPress={clearAll} />
      </View>
    </Screen>
  );
}
