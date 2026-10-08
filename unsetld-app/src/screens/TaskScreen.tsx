import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lineForTask, todayLine } from '../core/feed';
import { pointsBalance, provenOn } from '../core/points';
import { dayCount } from '../core/record';
import { typo } from '../core/typography';
import { LINES, POINTS, SCHEDULE } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { syncProof } from '../services/access';
import { light, medium } from '../services/haptics';
import { cameraPermission, capture, keepPhoto, proofImage } from '../services/proof';
import { useAccessEnabled, useApp, useEntitlements } from '../state/store';
import { useWork } from '../state/work';
import { Icon } from '../ui/icons';
import { Button, TextButton } from '../ui/kit';
import { clockTime, ProofStamp } from '../ui/ProofStamp';
import { T } from '../ui/text';
import { color as C, font, hairline, MARGIN } from '../ui/tokens';
import { sourceLabel } from './today/parts';

const P = COPY.proof;
const K = COPY.task;
type Stage = { kind: 'task' } | { kind: 'review'; uri: string; takenAt: number } | { kind: 'done'; earned: number };

/** One task: what it is, a line about it, and the camera to prove it. */
export function TaskScreen({ navigation, route }: RootProps<'Task'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const current = useApp(s => s.currentDay);
  // The day this task belongs to. If 4:00 AM comes while it's open, that day is over: back to the new Today.
  const [day] = useState(current);
  useEffect(() => {
    if (current !== day) navigation.goBack();
  }, [current, day, navigation]);
  const salt = useApp(s => s.installSalt);
  const strong = useApp(s => s.settings.strongLanguage);
  const record = useApp(s => s.record);
  const ent = useEntitlements();
  const accessEnabled = useAccessEnabled();
  const work = useWork(day);
  const item = work.find(w => w.key === route.params.key) ?? null;
  const done = item ? record.work[day]?.[item.key] : undefined;
  const [stage, setStage] = useState<Stage>({ kind: 'task' });
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const lineNo = todayLine(LINES, SCHEDULE, day)?.no ?? null;
  const w = width - MARGIN * 2;
  const h = Math.round((w * 5) / 4);
  const n = dayCount(record);
  // The line about this task: its chapter for the daily task, the user's mix for their own.
  const line = item ? lineForTask(LINES, item.chapter ? [item.chapter] : ent.mix, `${salt}:${day}:${item.key}`, strong) : null;

  useEffect(() => {
    cameraPermission().then(p => setDenied(p === 'denied'));
  }, []);

  const close = () => navigation.goBack();
  // The server keeps today's proven count for codes; it never sees a photo.
  const pushCount = () => {
    const s = useApp.getState();
    if (s.account.userId) syncProof(day, Math.min(POINTS.maxPerDay, provenOn(s.record, day))).catch(() => {});
  };

  const take = async () => {
    const r = await capture();
    if (r.ok) setStage({ kind: 'review', uri: r.uri, takenAt: Date.now() });
    else if (r.reason === 'denied') setDenied(true);
  };

  const keep = async () => {
    if (stage.kind !== 'review' || busy || !item) return;
    setBusy(true);
    try {
      const uri = await keepPhoto(stage.uri, `${day}-${item.key.replace(/[^a-z0-9]/gi, '')}`);
      const earned = useApp.getState().completeTask(item, { uri, takenAt: stage.takenAt, lineNo });
      medium();
      pushCount();
      setStage({ kind: 'done', earned });
    } finally {
      setBusy(false);
    }
  };

  const noPhoto = () => {
    if (!item) return;
    useApp.getState().completeTask(item, null);
    light();
    close();
  };

  const header = (
    <View style={{ marginTop: insets.top + 8, height: 44, paddingHorizontal: MARGIN - 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={COPY.reader.a11y.close} onPress={close} style={{ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6 }}>
        <Icon name="close" size={24} />
      </Pressable>
      <T v="mono" style={{ paddingRight: 10 }}>{`DAY ${String(n).padStart(3, '0')}`}</T>
    </View>
  );

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        {header}
      </View>
    );
  }

  if (stage.kind === 'done') {
    const total = pointsBalance(useApp.getState().record, POINTS);
    const capped = stage.earned === 0 && accessEnabled && provenOn(useApp.getState().record, day) > POINTS.maxPerDay;
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        {header}
        <View style={{ flex: 1, paddingHorizontal: MARGIN, justifyContent: 'center' }} accessibilityLiveRegion="polite">
          <T v="title.l" accessibilityRole="header">
            {capped ? K.capped(POINTS.perProof * POINTS.maxPerDay) : K.proven}
          </T>
          <T v="list" color={C.stone} style={{ marginTop: 12 }}>
            {item.text}
          </T>
          {accessEnabled && stage.earned > 0 ? (
            <T v="mono" style={{ marginTop: 24 }}>
              {P.pointsLine(stage.earned, total)}
            </T>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>
          <Button title={P.done} onPress={close} />
        </View>
      </View>
    );
  }

  if (stage.kind === 'review') {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        {header}
        <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 24 }}>
          <View style={{ marginTop: 16, width: w, height: h, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise }}>
            <Image source={{ uri: stage.uri }} style={{ width: w, height: h }} contentFit="cover" accessibilityLabel="Your proof photo" />
            <View style={{ position: 'absolute', left: 12, bottom: 12 }}>
              <ProofStamp day={day} takenAt={stage.takenAt} lineNo={lineNo} />
            </View>
          </View>
          <T v="list" style={{ marginTop: 16 }}>
            {item.text}
          </T>
        </ScrollView>
        <View style={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>
          <Button title={P.keep} onPress={keep} disabled={busy} />
          <TextButton title={P.retake} onPress={take} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const photo = done?.proof ? proofImage(done.proof.uri) : null;
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 24 }}>
        <T v="label" style={{ marginTop: 24 }}>
          {sourceLabel(item)}
        </T>
        <T v="title.xl" style={{ marginTop: 12 }} accessibilityRole="header">
          {item.text}
        </T>
        {item.proof ? (
          <T v="body" color={C.stone} style={{ marginTop: 12 }}>
            {K.what(item.proof)}
          </T>
        ) : null}
        {line ? (
          <T v="italic" color={C.stone} style={{ marginTop: 28, fontSize: 20, lineHeight: 25, fontFamily: font.serifItalic }}>
            {typo(line.text)}
          </T>
        ) : null}

        {done ? (
          <View style={{ marginTop: 32, gap: 12 }}>
            {done.proof ? (
              <View style={{ width: 160, height: 200, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise }}>
                {photo ? <Image source={{ uri: photo }} style={{ width: 160, height: 200 }} contentFit="cover" /> : null}
                <View style={{ position: 'absolute', left: 6, bottom: 6 }}>
                  <ProofStamp day={day} takenAt={done.proof.takenAt} lineNo={done.proof.lineNo} small />
                </View>
              </View>
            ) : (
              <T v="note" color={C.stone}>
                {K.doneAt(clockTime(done.doneAt))}
              </T>
            )}
          </View>
        ) : null}

        {denied ? (
          <View style={{ marginTop: 24, gap: 4 }}>
            <T v="small">{P.cameraOff}</T>
            <TextButton title={P.openSettings} align="left" onPress={() => Linking.openSettings().catch(() => {})} />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16, gap: 8 }}>
        {Platform.OS === 'web' ? (
          <T v="mono.s" align="center">
            {P.previewNote}
          </T>
        ) : null}
        <Button title={done?.proof ? P.retake : Platform.OS === 'web' ? P.choose : P.take} onPress={take} />
        {done ? (
          <TextButton
            title={K.markNotDone}
            onPress={() => {
              useApp.getState().uncompleteTask(item.key);
              if (done.proof) pushCount();
              close();
            }}
          />
        ) : (
          <TextButton title={K.noPhoto} onPress={noPhoto} />
        )}
      </View>
    </View>
  );
}
