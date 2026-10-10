// Stage 2 of a TIMER_AND_PHOTO or TIMER mission: the focus timer. The timer itself
// lives in the store on wall-clock time (core/timer), so it keeps running when this
// screen or the app is closed; this view only redraws it once a second. When it
// reaches zero: the proof photo (TIMER_AND_PHOTO), or Mark it done (TIMER, no photo).
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { clock, remainingSeconds, timerDone, type FocusTimer } from '../../core/timer';
import type { Mission, TrackId } from '../../core/types';
import { MISSION } from '../../content/copy/mission';
import { Button, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';
import { areaName, Bar, CameraNote } from './parts';

export function TimerStage({
  timer,
  mission,
  area,
  nav,
  denied,
  onPause,
  onResume,
  onEnd,
  onPhoto,
  onMarkDone,
}: {
  timer: FocusTimer;
  mission: Mission;
  /** The area it's in today's plan for. */
  area?: TrackId;
  nav: ReactNode;
  denied: boolean;
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

  const left = remainingSeconds(timer, now);
  const text = clock(left);
  // As big as the width allows: Plex Mono's figures are 0.6 em wide.
  const size = boxW ? Math.min(104, Math.floor(boxW / (text.length * 0.62))) : 88;
  const line = done ? (photo ? MISSION.timer.done : MISSION.timer.doneNoPhoto) : paused ? MISSION.timer.paused : MISSION.timer.line;

  const footer = done ? (
    photo ? (
      <>
        <CameraNote denied={denied} />
        <Button title={MISSION.button.proofPhoto} onPress={onPhoto} />
      </>
    ) : (
      <Button title={MISSION.button.markDone} onPress={onMarkDone} />
    )
  ) : (
    <>
      {paused ? <Button title={MISSION.timer.resume} onPress={onResume} /> : <Button title={MISSION.timer.pause} kind="outline" onPress={onPause} />}
      <TextButton title={MISSION.timer.end} onPress={onEnd} style={{ marginTop: 8 }} />
    </>
  );

  return (
    <Screen nav={nav} scroll={false} contentStyle={{ justifyContent: 'center' }} footer={footer}>
      <View onLayout={e => setBoxW(e.nativeEvent.layout.width)}>
        <T v="mono.s" align="center">
          {areaName(mission, area).toUpperCase()}
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
        <Bar value={1 - left / Math.max(1, timer.requiredSeconds)} style={{ marginTop: 20 }} />
        <T v="title.m" align="center" style={{ marginTop: 32 }}>
          {mission.title}
        </T>
        <T v="body" color={C.stone} align="center" style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
          {line}
        </T>
      </View>
    </Screen>
  );
}
