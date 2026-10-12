// Stage 2 of a TIMER_AND_PHOTO or TIMER mission: the lock-in screen START opens. Calm and
// nothing else on it: LOCK IN FOR 30 MINUTES, the clock as big as the width allows, a hairline
// meter, the mission, and one line ("Stay here. Get it done."). Pause and End timer stay quiet.
// The timer itself lives in the store on wall-clock time (core/timer), so it keeps running when
// this screen or the app is closed; this view only redraws it once a second. When it reaches
// zero: "Time." and Take proof (TIMER_AND_PHOTO, the camera) or Prove it (TIMER: the timer is
// the proof), with a soft haptic if the screen was open to see it. The line at zero is said
// with VoiceOver on iOS.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { clock, remainingSeconds, timerDone, type FocusTimer } from '../../core/timer';
import type { Mission, TrackId } from '../../core/types';
import { MISSION } from '../../content/copy/mission';
import { soft } from '../../services/haptics';
import { Meter } from '../../ui/blocks';
import { Button, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';
import { useAnnounce } from '../../ui/useAnnounce';
import { CameraNote, LINING } from './parts';

export function TimerStage({
  timer,
  mission,
  nav,
  denied,
  canRing,
  onPause,
  onResume,
  onEnd,
  onPhoto,
  onMarkDone,
}: {
  timer: FocusTimer;
  mission: Mission;
  /** The area it's in today's plan for. Not shown: the lock-in screen is the mission alone. */
  area?: TrackId;
  nav: ReactNode;
  denied: boolean;
  /** The timer-done notification will ring: notifications are allowed, and it isn't the browser preview. */
  canRing: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  /** TIMER_AND_PHOTO, once the timer is done: open the camera. */
  onPhoto: () => void;
  /** TIMER, once the timer is done: submit with no photo. */
  onMarkDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [boxW, setBoxW] = useState(0);
  const paused = timer.pausedAt != null;
  const done = timerDone(timer, now);
  const running = !paused && !done;
  const photo = mission.proofType !== 'TIMER';

  // Tick while it runs. A new timer object (started, resumed) ticks straight away.
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, timer.speed > 1 ? 200 : 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running, timer]);

  // A soft haptic when the time runs out with this screen open (not when it opens already done).
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) soft();
    wasDone.current = done;
  }, [done]);

  const left = remainingSeconds(timer, now);
  const text = clock(left);
  // As big as the width allows: Plex Mono's figures are 0.6 em wide.
  const size = boxW ? Math.min(104, Math.floor(boxW / (text.length * 0.62))) : 88;
  const minutes = Math.max(1, Math.round(timer.requiredSeconds / 60) || mission.timerMinutes || mission.minutes);
  const line = done ? MISSION.timer.time : paused ? MISSION.timer.paused : MISSION.timer.stay;
  useAnnounce(done ? MISSION.timer.timeSaid(photo) : null);

  const footer = done ? (
    photo ? (
      <>
        <CameraNote denied={denied} />
        <Button title={MISSION.button.takeProof} onPress={onPhoto} />
      </>
    ) : (
      <Button title={MISSION.button.prove} onPress={onMarkDone} />
    )
  ) : paused ? (
    <>
      <Button title={MISSION.timer.resume} onPress={onResume} />
      <TextButton title={MISSION.timer.end} onPress={onEnd} style={{ marginTop: 8 }} />
    </>
  ) : (
    // Running: two quiet controls side by side, nothing to pull the eye off the clock.
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <TextButton title={MISSION.timer.pause} color={C.muted} align="left" onPress={onPause} style={{ minWidth: 88 }} />
      <TextButton title={MISSION.timer.end} align="right" onPress={onEnd} style={{ minWidth: 88 }} />
    </View>
  );

  return (
    <Screen nav={nav} scroll={false} contentStyle={{ justifyContent: 'center' }} footer={footer}>
      <View onLayout={e => setBoxW(e.nativeEvent.layout.width)}>
        <T v="kicker" color={C.stone} align="center">
          {MISSION.timer.lockIn(minutes)}
        </T>
        <T
          v="mono.l"
          align="center"
          color={paused ? C.stone : C.bone}
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          accessibilityRole="timer"
          accessibilityLabel={paused ? `${MISSION.timer.a11yPaused}. ${MISSION.timer.a11y(left)}` : MISSION.timer.a11y(left)}
          style={{ marginTop: 20, fontSize: size, lineHeight: Math.round(size * 1.12), letterSpacing: -size * 0.02 }}>
          {text}
        </T>
        <View style={{ marginTop: 20 }}>
          <Meter value={timer.requiredSeconds - left} max={Math.max(1, timer.requiredSeconds)} height={2} />
        </View>
        <T v="title.m" align="center" style={[{ marginTop: 32 }, LINING]}>
          {mission.title}
        </T>
        {/* Live only for paused and done: nothing that changes while it runs. */}
        <T v="body" color={done ? C.bone : C.muted} align="center" style={{ marginTop: 14 }} accessibilityLiveRegion={done || paused ? 'polite' : 'none'}>
          {line}
        </T>
        {running && canRing ? (
          <T v="note" color={C.stone} align="center" style={{ marginTop: 6 }}>
            {MISSION.timer.ring}
          </T>
        ) : null}
      </View>
    </Screen>
  );
}
