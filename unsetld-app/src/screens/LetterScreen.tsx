import { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayCount, type MilestoneId } from '../core/record';
import { MILESTONES } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Icon } from '../ui/icons';
import { Button, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, MARGIN } from '../ui/tokens';
import { Walker } from '../ui/Walker';
import { runMilestoneAction } from './access';
import { errorText } from './MilestoneScreen';

/** A milestone or comeback letter. Shown once; opaque ink, fades in from black. */
export function LetterScreen({ navigation, route }: RootProps<'Letter'>) {
  const { letter } = route.params;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const n = useApp(s => dayCount(s.record));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useApp.getState().letterShown(letter);
  }, [letter]);

  const m = letter.kind === 'milestone' ? MILESTONES.find(x => x.day === letter.day) : null;
  const day = letter.kind === 'milestone' ? letter.day : n;
  const close = () => navigation.goBack();

  const primary = async () => {
    if (!m) return close();
    const needsAccount = m.id !== 'early-access' && !useApp.getState().account.userId;
    if (needsAccount) return navigation.replace('Milestone', { id: m.id as MilestoneId });
    const r = await runMilestoneAction(m.id as MilestoneId);
    if (r === 'done') close();
    else if (r === 'needs-account') navigation.replace('Milestone', { id: m.id as MilestoneId });
    else setError(errorText(r));
  };
  const secondary = () => {
    if (!m) return close();
    if (m.letter.secondary === 'Details') navigation.replace('Milestone', { id: m.id as MilestoneId });
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
          {m ? m.letter.sub : COPY.letter.comebackSub}
        </T>
        <T v="body" style={{ marginTop: 24 }}>
          {m ? m.letter.body : COPY.letter.comebackBody}
        </T>
        <View style={{ marginTop: 32 }}>
          <Button title={m ? m.letter.primary : COPY.letter.close} onPress={primary} />
          {m ? <TextButton title={m.letter.secondary} onPress={secondary} style={{ marginTop: 8 }} /> : null}
          {error ? (
            <T v="note" color={C.stone} style={{ marginTop: 8 }}>
              {error}
            </T>
          ) : null}
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 0, right: 0, alignItems: 'center' }}>
        <Walker height={49} />
      </View>
    </View>
  );
}
