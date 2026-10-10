// Building blocks for the redesigned screens (docs/UX_REDESIGN.md): a raised card instead of
// rules around everything, a meter for progress, the proof-type line, quiet link rows and an
// empty state that says what to do instead of showing zeros.
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ProofType } from '../core/types';
import { PROOF_KIND } from '../content/copy/proof';
import { Button } from './kit';
import { Icon } from './icons';
import { T } from './text';
import { color as C, radius } from './tokens';

/**
 * A raised surface for one thing (a mission, the next reward, an area). `onPress` makes the
 * whole card a button. `surface` overrides the fill (colorway pages pass a translucent one).
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  surface = C.card,
  pressed = C.cardPressed,
  padding = 18,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  surface?: string;
  pressed?: string;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const base: ViewStyle = { backgroundColor: surface, borderRadius: radius.card, padding };
  if (!onPress) {
    return (
      <View style={[base, style]} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed: down }) => [base, down ? { backgroundColor: pressed } : null, style]}>
      {children}
    </Pressable>
  );
}

/** A thin progress bar: `value` of `max`, filled from the left. */
export function Meter({
  value,
  max,
  color = C.bone,
  track = C.track,
  height = 4,
  accessibilityLabel,
}: {
  value: number;
  max: number;
  color?: string;
  track?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityLabel ? { min: 0, max: Math.max(1, max), now: Math.min(value, max) } : undefined}
      style={{ height, borderRadius: radius.meter, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${share * 100}%`, height, borderRadius: radius.meter, backgroundColor: color }} />
    </View>
  );
}

/** How a mission is proven: its icon(s) and a short label ("Timer + photo"). Visible before the user starts. */
export function ProofMeta({ type, color = C.muted, size = 15 }: { type: ProofType; color?: string; size?: number }) {
  const k = PROOF_KIND[type] ?? PROOF_KIND.PHOTO;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible={false}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {k.icons.map(name => (
          <Icon key={name} name={name} size={size} color={color} />
        ))}
      </View>
      <T v="meta" color={color}>
        {k.label}
      </T>
    </View>
  );
}

/** A quiet link to a deeper page: title, an optional line under it, a chevron. No rules. */
export function LinkRow({
  title,
  detail,
  value,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  detail?: string;
  /** Right-aligned value before the chevron ("12"). */
  value?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, detail, value].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="row">{title}</T>
        {detail ? (
          <T v="note" color={C.stone} style={{ marginTop: 2 }}>
            {detail}
          </T>
        ) : null}
      </View>
      {value ? (
        <T v="meta" color={C.muted}>
          {value}
        </T>
      ) : null}
      <Icon name="chevron-right" size={18} color={C.stone} />
    </Pressable>
  );
}

/** What to do instead of a wall of zeros: a short title, one line and (optionally) the next step as a button. */
export function EmptyState({ title, body, action, onAction }: { title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <Card>
      <T v="saved">{title}</T>
      {body ? (
        <T v="small" color={C.stone} style={{ marginTop: 6 }}>
          {body}
        </T>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: 18 }} /> : null}
    </Card>
  );
}

/** A big serif number with a small label under it ("12" / "Day streak"). */
export function StatBlock({ value, label, align = 'left' }: { value: string; label: string; align?: 'left' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }} accessible accessibilityLabel={`${value} ${label}`}>
      <T v="stat">{value}</T>
      <T v="meta" color={C.stone} style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
}

/** A small section label above a block ("Your areas"). Kicker style, used once per section. */
export function SectionLabel({ children, right, style }: { children: string; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, style]}>
      <T v="kicker" color={C.stone} accessibilityRole="header">
        {children}
      </T>
      {right}
    </View>
  );
}
