// The Mission screen (MISSIONS_SPEC 6 and 7, UX_REDESIGN 5): what the mission is, then prove it.
// Detail is deliberately short and in the card's order: the area, the title, time and points,
// one instruction, the Proof card, then the one button.
// Stages: detail → (timer | before photo) → review → checking → done | rejected.
// A TIMER mission has no photo: when its timer ends, Mark it done goes straight to checking.
// The timer and a waiting before photo live in the store, so they survive leaving
// this screen or closing the app; the rest of the flow is local to the screen.
// The checks run on this phone (core/verify via services/verify) and never look
// at what a photo shows; nothing here says otherwise.
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { activeDays } from '../../core/progress';
import { usedHashes } from '../../core/proofs';
import { elapsedSeconds, endsAt, timerDone, type FocusTimer } from '../../core/timer';
import type { DayKey } from '../../core/time';
import type { Mission, ProofPhoto, Verification, VerificationCheck } from '../../core/types';
import { requiredPhotos } from '../../core/verify';
import { MISSION_BY_ID } from '../../content';
import { MISSION } from '../../content/copy/mission';
import type { RootProps } from '../../navigation/types';
import { syncProof } from '../../services/access';
import { today } from '../../services/clock';
import { cameraPermission, capture, deletePhoto, PROOF_FROM_CAMERA, proofImage, savePhoto } from '../../services/proof';
import { cancelTimerDone, syncTimerDone } from '../../services/timerNotify';
import { checkTrustedTime, type TimeCheck } from '../../services/trustedTime';
import { verifyProof } from '../../services/verify';
import { plannedArea, useRerollsLeft } from '../../state/missions';
import { useApp, useAppActive, type MissionResult, type PendingBefore } from '../../state/store';
import { showDialog, type ActionOption } from '../../ui/actions';
import { Card } from '../../ui/blocks';
import { Button, NavRow, Screen, TextButton } from '../../ui/kit';
import { clockTime } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { DoneStage } from './DoneStage';
import { addsTo, AfterSlot, CameraNote, Instruction, LINING, MissionHeading, ProofCard, ProofFrame, ProofPhotos, ProvenLine } from './parts';
import { TimerStage } from './TimerStage';

type Stage =
  | { kind: 'detail' }
  | { kind: 'review'; photos: ProofPhoto[] }
  | { kind: 'checking'; photos: ProofPhoto[] }
  | { kind: 'done'; result: MissionResult; verification: Verification }
  | { kind: 'rejected'; checks: VerificationCheck[] };

const OK: ActionOption[] = [{ label: MISSION.ok, cancel: true }];
const UNVERIFIED: TimeCheck = { verified: false, suspect: false, skewMs: null };

/** The clock check, or "unverified" if unsetld.com takes longer than a moment: checking is meant to be instant. */
function settle(p: Promise<TimeCheck>, ms = 2500): Promise<TimeCheck> {
  return Promise.race([p.catch(() => UNVERIFIED), new Promise<TimeCheck>(r => setTimeout(() => r(UNVERIFIED), ms))]);
}

/** iOS can't open the camera while an alert is still closing. */
function afterDialog(fn: () => void) {
  if (Platform.OS === 'ios') setTimeout(fn, 400);
  else fn();
}

const ours = (missionId: string, day: DayKey) => (x: { missionId: string; day: DayKey } | null | undefined) =>
  Boolean(x && x.missionId === missionId && x.day === day);

/**
 * 4:00 AM passed with this mission's timer or before photo still going: that day's plan is
 * closed, so they go (the photo, and the timer's notification), and the dialog says why.
 */
function endDay(missionId: string, day: DayKey, close: () => void, proof = false) {
  const isOurs = ours(missionId, day);
  const s = useApp.getState();
  if (isOurs(s.pendingBefore)) {
    deletePhoto(s.pendingBefore!.photo.uri);
    s.setPendingBefore(null);
  }
  if (isOurs(s.timer)) {
    s.cancelTimer();
    cancelTimerDone();
  }
  // A proof sent after 4:00 AM, or a timer or before photo still going at 4:00 AM.
  const body = proof ? MISSION.dayEnded.body : MISSION.dayEnded.unfinished;
  showDialog(MISSION.dayEnded.title, body, [{ label: MISSION.dayEnded.ok, cancel: true, onPress: close }]);
}

export function MissionScreen({ navigation, route }: RootProps<'Mission'>) {
  const { missionId } = route.params;
  const mission: Mission | undefined = MISSION_BY_ID[missionId];
  const current = useApp(s => s.currentDay);
  // The day this screen belongs to. If 4:00 AM comes while it's open, that day is over.
  const [day] = useState(current);
  const plan = useApp(s => s.plans[day]);
  const record = useApp(s => s.record);
  const timer = useApp(s => s.timer);
  const pending = useApp(s => s.pendingBefore);
  const swapsLeft = useRerollsLeft(day);
  const tracks = useApp(s => s.profile.tracks);
  const active = useAppActive();
  const [stage, setStage] = useState<Stage>({ kind: 'detail' });
  const [denied, setDenied] = useState(false);
  // Proof photos saved but not submitted yet (deleted if the screen closes), and the clock check started at capture.
  const unsent = useRef<string[]>([]);
  const clockCheck = useRef<Promise<TimeCheck> | null>(null);
  // A second tap before the screen redraws must not open a second camera or prove the mission twice.
  const shooting = useRef(false);
  const submitting = useRef(false);

  const isOurs = ours(missionId, day);
  const index = plan ? plan.missions.findIndex(p => p.missionId === missionId) : -1;
  const inPlan = index >= 0;
  const done = record.missions?.[day]?.[missionId];
  const proven = done?.verification?.status === 'accepted' ? done : null;
  const timed = mission?.proofType === 'TIMER_AND_PHOTO' || mission?.proofType === 'TIMER';
  const timerHere: FocusTimer | null = timed && timer && isOurs(timer) ? timer : null;
  const beforeHere: PendingBefore | null = mission?.proofType === 'BEFORE_AFTER' && pending && isOurs(pending) ? pending : null;
  const shownUp = activeDays(record);
  const dayNo = shownUp.size + (shownUp.has(day) ? 0 : 1);

  // Home builds the plan; a screen opened some other way builds it too.
  useEffect(() => {
    if (!useApp.getState().plans[day]) useApp.getState().ensurePlan(day);
  }, [day]);

  // The day turned over. Nothing in progress: back to the new day. A timer or a before photo
  // on screen was for the day that ended: say so before closing (once).
  const holding = inPlan && Boolean(timerHere || beforeHere);
  const ended = useRef(false);
  useEffect(() => {
    if (current === day || stage.kind !== 'detail' || ended.current) return;
    ended.current = true;
    if (holding) endDay(missionId, day, () => navigation.goBack());
    else navigation.goBack();
  }, [current, day, stage.kind, holding, missionId, navigation]);

  // Camera access, checked again on coming back from Settings.
  useEffect(() => {
    if (!active) return;
    let live = true;
    cameraPermission()
      .then(p => {
        if (live) setDenied(p === 'denied');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [active]);

  // A photo taken but never submitted doesn't stay on the phone.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        unsent.current.forEach(deletePhoto);
        unsent.current = [];
      }),
    [navigation],
  );

  const close = () => navigation.goBack();

  const nav = <NavRow onClose={close} step={MISSION.day(dayNo)} />;

  if (!mission) {
    return (
      <Screen nav={nav}>
        <T v="body" color={C.stone} style={{ marginTop: 24 }}>
          {MISSION.missing}
        </T>
      </Screen>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Opens the camera (a file picker in the preview) and saves the photo for this mission. */
  const shoot = async (kind: ProofPhoto['kind']): Promise<ProofPhoto | null> => {
    if (shooting.current) return null;
    shooting.current = true;
    try {
      const r = await capture();
      if (!r.ok) {
        if (r.reason === 'denied') setDenied(true);
        else if (r.reason === 'failed') showDialog(MISSION.camera.failed, undefined, OK);
        return null;
      }
      setDenied(false);
      const takenAt = Date.now();
      try {
        const saved = await savePhoto(r.uri, `${day}-${missionId}-${kind}`);
        if (!saved.uri) throw new Error('not saved');
        return { uri: saved.uri, hash: saved.hash, takenAt, kind };
      } catch {
        showDialog(MISSION.camera.saveFailed, undefined, OK);
        return null;
      }
    } finally {
      shooting.current = false;
    }
  };

  /** 4:00 AM passed mid-proof: that day's plan is closed, so nothing is credited to the new one. */
  const dayOver = (photos: readonly ProofPhoto[]) => {
    photos.forEach(p => deletePhoto(p.uri));
    unsent.current = [];
    clockCheck.current = null;
    // The dialog's OK closes the screen; the day-turned effect doesn't close it under the dialog.
    ended.current = true;
    endDay(missionId, day, close, photos.length > 0);
  };

  /** The proof photo itself: the single photo, the result, or the after. */
  const takeProof = async () => {
    const kinds = requiredPhotos(mission.proofType);
    const shot = await shoot(kinds[kinds.length - 1]);
    if (!shot) return;
    // On iOS a retake gets its own file; in the preview it replaces the same key. Anything else from before goes.
    unsent.current.filter(u => u !== shot.uri).forEach(deletePhoto);
    unsent.current = [shot.uri];
    clockCheck.current = checkTrustedTime();
    const s = useApp.getState();
    const before = mission.proofType === 'BEFORE_AFTER' && isOurs(s.pendingBefore) ? s.pendingBefore!.photo : null;
    if (mission.proofType === 'BEFORE_AFTER' && !before) {
      // The before photo went (the day turned over, or another mission took its place).
      deletePhoto(shot.uri);
      unsent.current = [];
      setStage({ kind: 'detail' });
      return;
    }
    setStage({ kind: 'review', photos: before ? [before, shot] : [shot] });
  };

  const takeBefore = async () => {
    const shot = await shoot('before');
    if (!shot) return;
    const s = useApp.getState();
    if (usedHashes(s.record).has(shot.hash)) {
      deletePhoto(shot.uri);
      // A retake saves over the waiting before photo's file, so that one is gone too.
      if (s.pendingBefore?.photo.uri === shot.uri) s.setPendingBefore(null);
      showDialog(MISSION.before.used, undefined, OK);
      return;
    }
    if (today() !== day) return dayOver([shot]);
    const old = s.pendingBefore;
    if (old && old.photo.uri !== shot.uri) deletePhoto(old.photo.uri);
    s.setPendingBefore({ missionId, day, photo: shot });
  };

  /** TAKE THE BEFORE PHOTO: one before photo waits at a time. */
  const beforePressed = () => {
    const other = useApp.getState().pendingBefore;
    if (other && other.missionId !== missionId && other.day === today()) {
      showDialog(MISSION.busy.beforeTitle(MISSION_BY_ID[other.missionId]?.title), MISSION.busy.beforeBody, [
        { label: MISSION.busy.no, cancel: true },
        { label: MISSION.busy.yes, onPress: () => afterDialog(() => void takeBefore()) },
      ]);
      return;
    }
    void takeBefore();
  };

  const beginTimer = () => {
    if (today() !== day) return dayOver([]);
    const s = useApp.getState();
    s.startTimer(missionId);
    // Starting is when to ask for notifications: the screen says it will ring.
    syncTimerDone(useApp.getState().timer, { ask: true });
  };

  /** START 30 MIN TIMER: one timer runs at a time. */
  const timerPressed = () => {
    const other = useApp.getState().timer;
    if (other && other.missionId !== missionId && other.day === today()) {
      const state = timerDone(other, Date.now()) ? 'done' : other.pausedAt != null ? 'paused' : 'running';
      const that = MISSION_BY_ID[other.missionId];
      showDialog(MISSION.busy.timerTitle(that?.title, state, that?.proofType !== 'TIMER'), MISSION.busy.timerBody, [
        { label: MISSION.busy.no, cancel: true },
        { label: MISSION.busy.yes, onPress: beginTimer },
      ]);
      return;
    }
    beginTimer();
  };

  const pause = () => {
    useApp.getState().pauseTimer();
    cancelTimerDone();
  };

  const resume = () => {
    useApp.getState().resumeTimer();
    syncTimerDone(useApp.getState().timer);
  };

  const endTimer = () => {
    showDialog(MISSION.timer.endTitle, MISSION.timer.endBody, [
      { label: MISSION.timer.endNo, cancel: true },
      {
        label: MISSION.timer.endYes,
        destructive: true,
        onPress: () => {
          if (isOurs(useApp.getState().timer)) useApp.getState().cancelTimer();
          cancelTimerDone();
        },
      },
    ]);
  };

  const swap = () => {
    showDialog(MISSION.swap.title, MISSION.swap.body(swapsLeft), [
      { label: MISSION.swap.no, cancel: true },
      {
        label: MISSION.swap.yes,
        onPress: () => {
          if (today() !== day) return close();
          const i = useApp.getState().plans[day]?.missions.findIndex(p => p.missionId === missionId) ?? -1;
          if (i < 0) return;
          const r = useApp.getState().rerollMission(i);
          if (r === 'ok') close();
          else if (r === 'none') showDialog(MISSION.swap.noneTitle, MISSION.swap.noneBody, [{ label: MISSION.swap.ok, cancel: true }]);
          else showDialog(MISSION.swap.limitTitle, MISSION.swap.limitBody, [{ label: MISSION.swap.ok, cancel: true }]);
        },
      },
    ]);
  };

  /** The server keeps each day's proven count and points (missions plus the perfect-day bonus) for rewards; it never sees a photo. */
  const pushCount = () => {
    const s = useApp.getState();
    if (!s.account.userId) return;
    const accepted = Object.values(s.record.missions?.[day] ?? {}).filter(m => m.verification?.status === 'accepted');
    const points = accepted.reduce((t, m) => t + m.points, 0) + (s.record.bonuses?.[day] ?? 0);
    syncProof(day, accepted.length, points).catch(() => {});
  };

  /**
   * A rejected attempt leaves nothing behind but a before photo that can still be used.
   * A TIMER mission's timer was its whole proof: it goes, so Try again starts a new one.
   */
  const reject = (photos: readonly ProofPhoto[], verification: Verification) => {
    const s = useApp.getState();
    const used = usedHashes(s.record);
    for (const p of photos) {
      if (p.kind === 'before' && !used.has(p.hash)) continue;
      deletePhoto(p.uri);
      if (p.kind === 'before' && isOurs(s.pendingBefore)) s.setPendingBefore(null);
    }
    if (mission.proofType === 'TIMER' && isOurs(s.timer)) {
      s.cancelTimer();
      cancelTimerDone();
    }
    unsent.current = [];
    clockCheck.current = null;
    setStage({ kind: 'rejected', checks: verification.checks.filter(c => !c.ok) });
  };

  /** Checks the proof and credits it: the photos from review, or none for a TIMER mission. */
  const submit = async (photos: ProofPhoto[]) => {
    if (submitting.current) return;
    submitting.current = true;
    setStage({ kind: 'checking', photos });
    try {
      const now = Date.now();
      if (today() !== day) return dayOver(photos);
      const s = useApp.getState();
      const t = isOurs(s.timer) ? s.timer : null;
      const timerSeconds = timed ? (t ? Math.min(elapsedSeconds(t, now), t.requiredSeconds) : 0) : undefined;
      const verification = await verifyProof(mission, {
        photos,
        timerSeconds,
        timerEndedAt: timed && t ? endsAt(t) ?? undefined : undefined,
        now,
        usedHashes: usedHashes(s.record),
        fromCamera: PROOF_FROM_CAMERA,
      });
      // Rejected attempts aren't written to the record: a later good proof still earns in full.
      if (verification.status !== 'accepted') return reject(photos, verification);
      const time = await settle(clockCheck.current ?? checkTrustedTime());
      if (today() !== day) return dayOver(photos);
      const result = useApp.getState().completeMission(missionId, photos, verification, { verifiedClock: time.verified, timerSeconds });
      unsent.current = [];
      clockCheck.current = null;
      if (timed) cancelTimerDone();
      pushCount();
      setStage({ kind: 'done', result, verification });
    } catch {
      // Nothing was credited (the store only changes once everything else has run): back to the
      // photo, or for a TIMER mission to its finished timer.
      setStage(photos.length ? { kind: 'review', photos } : { kind: 'detail' });
      showDialog(MISSION.checkFailed, undefined, OK);
    } finally {
      submitting.current = false;
    }
  };

  /** TIMER: the timer ran out, so the mission is done. No photo. */
  const markDone = () => {
    if (stage.kind !== 'detail') return;
    void submit([]);
  };

  /** Try again: straight back to the camera when the photo is the next step, else to the mission (a TIMER mission starts over). */
  const retry = () => {
    // The after photo came too soon after the before: it needs a few minutes yet, so the mission, not the camera.
    const tooSoon = stage.kind === 'rejected' && stage.checks.some(c => c.id === 'order');
    setStage({ kind: 'detail' });
    const s = useApp.getState();
    const type = mission.proofType;
    const ready =
      type === 'PHOTO' ||
      type === 'PHOTO_AFTER' ||
      (type === 'TIMER_AND_PHOTO' && isOurs(s.timer) && timerDone(s.timer!, Date.now())) ||
      (type === 'BEFORE_AFTER' && isOurs(s.pendingBefore) && !tooSoon);
    if (ready) void takeProof();
  };

  const openRewards = () => {
    navigation.goBack();
    navigation.navigate('Main', { screen: 'Rewards' });
  };

  /** Perfect day: the share card opens over this screen; closing it comes back here. */
  const openShare = () => navigation.navigate('Share');

  // The area it's in today's plan for, as its card on Today says (else the user's area it serves).
  const area = plannedArea(inPlan ? plan?.missions[index] : undefined, mission, tracks);

  // ── Stages ────────────────────────────────────────────────────────────────

  if (stage.kind === 'done') {
    return (
      <DoneStage
        mission={mission}
        result={stage.result}
        verification={stage.verification}
        day={day}
        nav={nav}
        onDone={close}
        onRewards={openRewards}
        onShare={openShare}
      />
    );
  }

  if (stage.kind === 'rejected') {
    return (
      <Screen nav={nav} contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 16 }} footer={<Button title={MISSION.rejected.retry} onPress={retry} />}>
        <T v="title.xl" accessibilityRole="header">
          {MISSION.rejected.title}
        </T>
        <T v="list" color={C.stone} style={[{ marginTop: 10 }, LINING]}>
          {mission.title}
        </T>
        {stage.checks.length ? (
          <View style={{ marginTop: GAP.block }} accessibilityLiveRegion="polite">
            <Card>
              <View style={{ gap: 10 }}>
                {stage.checks.map(c => (
                  <T key={c.id} v="body">
                    {c.note}
                  </T>
                ))}
              </View>
            </Card>
          </View>
        ) : null}
      </Screen>
    );
  }

  if (stage.kind === 'review' || stage.kind === 'checking') {
    const checking = stage.kind === 'checking';
    const photos = stage.photos;
    const footer = checking ? (
      <View style={{ minHeight: 106, justifyContent: 'center' }}>
        <T v="body" color={C.stone} align="center" accessibilityLiveRegion="polite">
          {MISSION.checking}
        </T>
      </View>
    ) : (
      <>
        <Button title={MISSION.review.submit} onPress={() => void submit(photos)} />
        <TextButton title={MISSION.review.retake} onPress={() => void takeProof()} style={{ marginTop: 8 }} />
      </>
    );
    return (
      <Screen nav={checking ? <NavRow step={MISSION.day(dayNo)} /> : nav} footer={footer}>
        {photos.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <ProofPhotos photos={photos} day={day} single={mission.title} />
          </View>
        ) : null}
        <T v="list" style={[{ marginTop: photos.length > 0 ? 20 : 24 }, LINING]}>
          {mission.title}
        </T>
        {photos.length > 0 ? (
          <T v="meta" color={C.stone} style={{ marginTop: 6 }}>
            {mission.proof}
          </T>
        ) : mission.timerMinutes ? (
          // A TIMER mission: no photo, the finished timer is what's being checked.
          <T v="meta" color={C.muted} style={{ marginTop: 6 }}>
            {MISSION.proven.timed(mission.timerMinutes)}
          </T>
        ) : null}
      </Screen>
    );
  }

  // Proven: the photo, its stamp and the points (a TIMER mission has no photo). Nothing left to do.
  if (proven) {
    const photos = proven.photos ?? [];
    const kept = photos.some(p => proofImage(p.uri));
    const minutes = Math.round((proven.timerSeconds ?? 0) / 60);
    return (
      <Screen nav={nav}>
        <MissionHeading mission={mission} area={area} />
        {photos.length > 0 ? (
          <View style={{ marginTop: GAP.block }}>
            {kept ? (
              photos.length === 1 ? (
                <ProofFrame photo={photos[0]} day={day} label={mission.title} a11y={MISSION.a11y.photo} style={{ width: '100%' }} />
              ) : (
                <ProofPhotos photos={photos} day={day} single={mission.title} />
              )
            ) : (
              <T v="note" color={C.stone}>
                {MISSION.proven.cleared}
              </T>
            )}
          </View>
        ) : null}
        <ProvenLine time={clockTime(proven.doneAt)} points={proven.points} style={{ marginTop: photos.length > 0 ? 16 : GAP.block }} />
        {minutes > 0 ? (
          <T v="meta" color={C.stone} style={{ marginTop: 6, marginLeft: 22 }}>
            {mission.proofType === 'TIMER' ? MISSION.proven.timed(minutes) : MISSION.proven.focused(minutes)}
          </T>
        ) : null}
      </Screen>
    );
  }

  if (inPlan && timerHere) {
    return (
      <TimerStage
        timer={timerHere}
        mission={mission}
        area={area}
        nav={nav}
        denied={denied}
        onPause={pause}
        onResume={resume}
        onEnd={endTimer}
        onPhoto={() => void takeProof()}
        onMarkDone={markDone}
      />
    );
  }

  if (inPlan && beforeHere) {
    return (
      <Screen
        nav={nav}
        footer={
          <>
            <CameraNote denied={denied} />
            <Button title={MISSION.button.after} onPress={() => void takeProof()} />
            <TextButton title={MISSION.before.retake} onPress={() => void takeBefore()} style={{ marginTop: 8 }} />
          </>
        }>
        <MissionHeading mission={mission} area={area} />
        {/* The pair as it will be proven: the before photo, and the after still to come. */}
        <View style={{ marginTop: GAP.block, flexDirection: 'row', gap: GAP.tight }}>
          <ProofFrame photo={beforeHere.photo} day={day} label={MISSION.before.label} small a11y={MISSION.a11y.before} style={{ flex: 1 }} />
          <AfterSlot style={{ flex: 1 }} />
        </View>
        <T v="title.m" style={{ marginTop: 24 }} accessibilityLiveRegion="polite">
          {MISSION.before.saved}
        </T>
        <Instruction>{mission.short}</Instruction>
        {/* Half the proof is in: what the after photo shows, not the whole Proof card again. */}
        {addsTo(mission, MISSION.method(mission.proofType)) ? (
          <T v="meta" color={C.stone} style={{ marginTop: 12 }}>
            {mission.proof}
          </T>
        ) : null}
      </Screen>
    );
  }

  // Detail: SCHOOL, the title, 30 min · +15 pts, the one instruction, the Proof card, then the button.
  const primary = timed
    ? { title: MISSION.button.timer(mission.timerMinutes ?? 25), onPress: timerPressed }
    : mission.proofType === 'BEFORE_AFTER'
      ? { title: MISSION.button.before, onPress: beforePressed }
      : { title: MISSION.button.prove, onPress: () => void takeProof() };
  // The button opens the camera itself (not a timer first).
  const usesCamera = !timed;

  return (
    <Screen
      nav={nav}
      footer={
        inPlan ? (
          <>
            {usesCamera ? <CameraNote denied={denied} /> : null}
            <Button title={primary.title} onPress={primary.onPress} />
            {swapsLeft > 0 ? <TextButton title={MISSION.swap.button} onPress={swap} style={{ marginTop: 8 }} /> : null}
          </>
        ) : undefined
      }>
      <MissionHeading mission={mission} area={area} />
      <Instruction>{mission.short}</Instruction>
      {!inPlan && plan ? (
        <T v="meta" color={C.stone} style={{ marginTop: 16 }}>
          {MISSION.notInPlan}
        </T>
      ) : null}
      <ProofCard mission={mission} />
    </Screen>
  );
}
