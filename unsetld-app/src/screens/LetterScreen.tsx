import { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isKnownStatus } from '../core/rewards';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Icon } from '../ui/icons';
import { Button, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, MARGIN } from '../ui/tokens';
import { Walker } from '../ui/Walker';
import { STATUS_DEFAULTS } from '../services/access';
import { accessDays, enableDropAlerts, runMilestoneAction, useStatusTiers, type ActionResult } from './access';
import { ActionError } from './MilestoneScreen';

/**
 * A status letter (one of the app's own tiers, reached) or the comeback letter. Shown once;
 * opaque ink, fades in from black. The tier is the one at the letter's day in the status
 * tiers in effect (the built-in one at that day when the config moved it).
 */
export function LetterScreen({ navigation, route }: RootProps<'Letter'>) {
  const { letter } = route.params;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Active days, as Rewards and the milestone pages count them.
  const n = useApp(s => accessDays(s.record));
  const [result, setResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    useApp.getState().letterShown(letter);
  }, [letter]);

  const tiers = useStatusTiers();
  const atDay = (t: { id: string; day: number; letter?: unknown }) => letter.kind === 'milestone' && t.day === letter.day && isKnownStatus(t.id) && Boolean(t.letter);
  const m = letter.kind === 'milestone' ? (tiers.find(atDay) ?? STATUS_DEFAULTS.find(atDay) ?? null) : null;
  const L = m?.letter ?? null;
  const id = m && isKnownStatus(m.id) ? m.id : null;
  const day = letter.kind === 'milestone' ? letter.day : n;
  const close = () => navigation.goBack();

  // Day 7's button turns on drop alerts; the others claim, which needs an account.
  const primary = async () => {
    if (!id || !L) return close();
    if (id !== 'early-access' && !useApp.getState().account.userId) return navigation.replace('Milestone', { id });
    const r = id === 'early-access' ? await enableDropAlerts() : await runMilestoneAction(id);
    if (r === 'done') close();
    else if (r === 'needs-account' || r === 'used') navigation.replace('Milestone', { id });
    else setResult(r);
  };
  const secondary = () => {
    if (!id || !L) return close();
    if (L.secondary === 'Details') navigation.replace('Milestone', { id });
    else close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={COPY.reader.a11y.close}
        onPress={close}
        style={{ position: 'absolute', top: insets.top + 8, left: MARGIN - 10, width: 44, height: 44, justifyContent: 'center', paddingLeft: 6, zIndex: 1 }}>
        <Icon name="close" size={24} />
      </Pressable>
      <View style={{ position: 'absolute', top: Math.round(Math.min(height * 0.28, height - 540)), left: MARGIN, right: MARGIN }}>
        <T v="mono">{COPY.letter.dayLabel(day)}</T>
        <T v="letter.day" style={{ marginTop: 12 }} accessibilityRole="header">
          {COPY.letter.dayTitle(day)}
        </T>
        <T v="letter.sub" color={C.stone} style={{ marginTop: 16 }}>
          {L ? L.sub : COPY.letter.comebackSub}
        </T>
        <T v="body" style={{ marginTop: 24 }}>
          {L ? L.body : COPY.letter.comebackBody}
        </T>
        <View style={{ marginTop: 32 }}>
          <Button title={L ? L.primary : COPY.letter.close} onPress={primary} />
          {L ? <TextButton title={L.secondary} onPress={secondary} style={{ marginTop: 8 }} /> : null}
          <ActionError result={result} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 0, right: 0, alignItems: 'center' }}>
        <Walker height={49} />
      </View>
    </View>
  );
}
