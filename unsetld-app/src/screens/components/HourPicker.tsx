import { ScrollView, View } from 'react-native';
import { Chip, T } from '../../ui/components';
import { space } from '../../ui/theme';

export function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function HourPicker({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (h: number) => void }) {
  return (
    <View style={{ marginTop: space.md }}>
      <T variant="label" style={{ marginBottom: space.sm }}>
        {`${label} · ${hourLabel(value)}`}
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {options.map(h => (
          <Chip key={h} label={hourLabel(h)} selected={value === h} onPress={() => onChange(h)} />
        ))}
      </ScrollView>
    </View>
  );
}
