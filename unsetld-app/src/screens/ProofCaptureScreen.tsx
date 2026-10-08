import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pointsBalance } from '../core/points';
import { dayCount } from '../core/record';
import { todayLine } from '../core/feed';
import { LINES, POINTS, SCHEDULE } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { syncProof } from '../services/access';
import { medium, selection } from '../services/haptics';
import { cameraPermission, capture, keepPhoto, proofImage } from '../services/proof';
import { useAccessEnabled, useApp } from '../state/store';
import { Icon } from '../ui/icons';
import { Button, ListRow, Square, TextButton } from '../ui/kit';
import { ProofStamp } from '../ui/ProofStamp';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

const P = COPY.proof;
type Stage = { kind: 'intro' } | { kind: 'review'; uri: string; takenAt: number } | { kind: 'done'; earned: number };

/** Add today's proof: pick the rule it proves, take the photo live, keep it. */
export function ProofCaptureScreen({ navigation }: RootProps<'ProofCapture'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const day = useApp(s => s.currentDay);
  const rules = useApp(s => s.settings.standard);
  const existing = useApp(s => s.record.proofs[s.currentDay]);
  const record = useApp(s => s.record);
  const accessEnabled = useAccessEnabled();
  const [rule, setRule] = useState<number | null>(existing?.rule ?? null);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const lineNo = todayLine(LINES, SCHEDULE, day)?.no ?? null;
  const w = width - MARGIN * 2;
  const h = Math.round((w * 5) / 4);

  useEffect(() => {
    cameraPermission().then(p => setDenied(p === 'denied'));
  }, []);

  const take = async () => {
    const r = await capture();
    if (r.ok) setStage({ kind: 'review', uri: r.uri, takenAt: Date.now() });
    else if (r.reason === 'denied') setDenied(true);
  };

  const keep = async () => {
    if (stage.kind !== 'review' || busy) return;
    setBusy(true);
    try {
      const uri = await keepPhoto(stage.uri, day);
      const earned = useApp.getState().addProof({ uri, rule, takenAt: stage.takenAt, lineNo });
      medium();
      if (useApp.getState().account.userId) syncProof(day).catch(() => {});
      setStage({ kind: 'done', earned });
    } finally {
      setBusy(false);
    }
  };

  const close = () => navigation.goBack();
  const n = dayCount(record);
  const existingImage = existing ? proofImage(existing.uri) : null;

  const header = (
    <View style={{ marginTop: insets.top + 8, height: 44, paddingHorizontal: MARGIN - 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={COPY.reader.a11y.close} onPress={close} style={{ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6 }}>
        <Icon name="close" size={24} />
      </Pressable>
      <T v="mono" style={{ paddingRight: 10 }}>{`DAY ${String(n).padStart(3, '0')}`}</T>
    </View>
  );

  if (stage.kind === 'done') {
    const total = pointsBalance(useApp.getState().record, POINTS);
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        {header}
        <View style={{ flex: 1, paddingHorizontal: MARGIN, justifyContent: 'center' }} accessibilityLiveRegion="polite">
          <T v="title.l" accessibilityRole="header">
            {P.added}
          </T>
          <T v="body" color={C.stone} style={{ marginTop: 12 }}>
            {P.addedBody(n)}
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
          {rule !== null && rules[rule] ? (
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
              <T v="mono" style={{ width: 40 }}>
                {String(rule + 1).padStart(2, '0')}
              </T>
              <T v="list">{rules[rule]}</T>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>
          <Button title={P.keep} onPress={keep} disabled={busy} />
          <TextButton title={P.retake} onPress={take} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 24 }}>
        <T v="label" style={{ marginTop: 24 }}>
          {P.label}
        </T>
        <T v="title.xl" style={{ marginTop: 12 }} accessibilityRole="header">
          {P.title}
        </T>
        <T v="body" color={C.stone} style={{ marginTop: 12 }}>
          {P.body}
        </T>

        {existing ? (
          <View style={{ marginTop: 24, gap: 12 }}>
            {existingImage ? (
              <View style={{ width: 120, height: 150, borderWidth: hairline, borderColor: C.rule }}>
                <Image source={{ uri: existingImage }} style={{ width: 120, height: 150 }} contentFit="cover" />
              </View>
            ) : null}
            <T v="note" color={C.stone}>
              {P.already}
            </T>
          </View>
        ) : null}

        {rules.length ? (
          <>
            <T v="label" style={{ marginTop: 32, marginBottom: 8 }}>
              {P.which}
            </T>
            <View style={{ borderBottomWidth: hairline, borderBottomColor: C.rule }}>
              {rules.map((r, i) => (
                <ListRow
                  key={r}
                  accessibilityRole="radio"
                  accessibilityLabel={r}
                  accessibilityState={{ selected: rule === i }}
                  onPress={() => {
                    selection();
                    setRule(rule === i ? null : i);
                  }}>
                  <T v="mono" style={{ width: 40 }}>
                    {String(i + 1).padStart(2, '0')}
                  </T>
                  <T v="list" color={rule === i ? C.bone : C.muted} style={{ flex: 1 }} numberOfLines={1}>
                    {r}
                  </T>
                  <Square on={rule === i} />
                </ListRow>
              ))}
            </View>
          </>
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
        <Button title={Platform.OS === 'web' ? P.choose : existing ? P.retake : P.take} onPress={take} />
      </View>
    </View>
  );
}
