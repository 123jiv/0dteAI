import { useState } from 'react';
import { View } from 'react-native';
import { COPY } from '../content/copy';
import { Button } from './kit';
import { Sheet } from './Sheet';
import { T } from './text';
import { TimeWheel } from './TimeWheel';
import { MARGIN } from './tokens';

/** Time picker sheet (detent 0.42): title, wheel, Done. */
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
  const [draft, setDraft] = useState(value);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }
  return (
    <Sheet visible={visible} onClose={onClose} detent={0.42} accessibilityLabel={title}>
      <View style={{ flex: 1, paddingHorizontal: MARGIN, paddingTop: 4, gap: 12 }}>
        <T v="row" align="center">
          {title}
        </T>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TimeWheel value={draft} onChange={setDraft} />
        </View>
        <Button title={COPY.day.done} onPress={() => onDone(draft)} style={{ marginBottom: 24 }} />
      </View>
    </Sheet>
  );
}
