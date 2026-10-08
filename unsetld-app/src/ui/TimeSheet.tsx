import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../content/copy';
import { Button } from './kit';
import { Sheet } from './Sheet';
import { T } from './text';
import { TimeWheel } from './TimeWheel';
import { MARGIN } from './tokens';

// The native wheel is about 216pt tall. Grabber 22, top padding 4, the title
// (22, up to 1.3x with larger text), two 12 gaps and the 54 button sit around it.
const WHEEL = 216;
const CHROME = 22 + 4 + 12 + 12 + 54;

/** Time picker sheet (detent 0.42, taller when the wheel needs it): title, wheel, Done. */
export function TimeSheet({
  title,
  value,
  visible,
  onDone,
  onClose,
}: {
  title: string;
  value: number;
  visible: boolean;
  onDone: (minutes: number) => void;
  onClose: () => void;
}) {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }
  // Done's bottom edge at safeBottom + 16, like every primary button.
  const bottom = insets.bottom + 16;
  const titleH = Math.ceil(22 * Math.min(1.3, Math.max(1, fontScale)));
  const detent = Math.max(0.42, (CHROME + titleH + WHEEL + bottom) / height);
  return (
    <Sheet visible={visible} onClose={onClose} detent={detent} accessibilityLabel={title}>
      <View style={{ flex: 1, paddingHorizontal: MARGIN, paddingTop: 4, gap: 12 }}>
        <T v="row" align="center">
          {title}
        </T>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TimeWheel value={draft} onChange={setDraft} />
        </View>
        <Button title={COPY.day.done} onPress={() => onDone(draft)} style={{ marginBottom: bottom }} />
      </View>
    </Sheet>
  );
}
