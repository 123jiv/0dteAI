import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';

/** Native wheel time picker. `value` and `onChange` are minutes after midnight. */
export function TimeWheel({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const d = new Date();
  d.setHours(Math.floor(value / 60), value % 60, 0, 0);
  return (
    <Host matchContents colorScheme="dark" style={{ alignSelf: 'stretch' }}>
      <DatePicker
        selection={d}
        displayedComponents={['hourAndMinute']}
        onDateChange={date => onChange(date.getHours() * 60 + date.getMinutes())}
        modifiers={[datePickerStyle('wheel'), labelsHidden()]}
      />
    </Host>
  );
}
