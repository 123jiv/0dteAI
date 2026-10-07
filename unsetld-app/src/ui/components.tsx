import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../services/haptics';
import { Icon, type IconName } from './icons';
import { fonts, radius, space, textures, useTheme } from './theme';

export function TextureBackground({ texture }: { texture?: string | null }) {
  const t = texture ? textures[texture] : null;
  if (!t) return null;
  return (
    <Image
      source={t.source}
      resizeMode={t.repeat ? 'repeat' : 'cover'}
      style={[StyleSheet.absoluteFill, { opacity: t.opacity, width: '100%', height: '100%' }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  texture?: boolean;
  footer?: ReactNode;
  edges?: { top?: boolean; bottom?: boolean };
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll, padded = true, texture = true, footer, edges, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const top = edges?.top === false ? 0 : insets.top;
  const bottom = edges?.bottom === false ? 0 : insets.bottom;
  const inner = [padded && { paddingHorizontal: space.xl }, contentStyle];
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {texture && <TextureBackground texture={theme.texture} />}
      <View style={{ flex: 1, paddingTop: top }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[{ paddingBottom: space.xxl + (footer ? 0 : bottom) }, inner]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
        {footer ? (
          <View style={{ paddingHorizontal: space.xl, paddingBottom: bottom + space.lg, paddingTop: space.md }}>
            {footer}
          </View>
        ) : null}
      </View>
    </View>
  );
}

type Variant = 'title' | 'h2' | 'body' | 'muted' | 'caption' | 'label' | 'line';

export function T({
  children,
  variant = 'body',
  style,
  color,
  center,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  color?: string;
  center?: boolean;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  const base: Record<Variant, TextStyle> = {
    title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 40, color: theme.text },
    h2: { fontFamily: fonts.sansSemi, fontSize: 18, lineHeight: 24, color: theme.text },
    body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: theme.text },
    muted: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: theme.muted },
    caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: theme.muted },
    label: { fontFamily: fonts.sansSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, color: theme.muted, textTransform: 'uppercase' },
    line: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: theme.text },
  };
  return (
    <Text
      style={[base[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}
      maxFontSizeMultiplier={variant === 'line' || variant === 'title' ? 1.5 : 1.8}
      numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  accessibilityHint,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.accent : variant === 'secondary' ? theme.surface : 'transparent';
  const fg = variant === 'primary' ? theme.onAccent : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: 54,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          paddingHorizontal: space.xl,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={fg} size={18} /> : null}
          <Text style={{ color: fg, fontFamily: fonts.sansSemi, fontSize: 16 }} maxFontSizeMultiplier={1.4}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  locked,
  sub,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  locked?: boolean;
  sub?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        paddingVertical: sub ? space.md : 11,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? `${theme.accent}22` : theme.surface,
        opacity: pressed ? 0.85 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
      })}>
      <View style={{ flex: sub ? 1 : undefined }}>
        <Text style={{ color: theme.text, fontFamily: fonts.sansMedium, fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {locked ? <Icon name="lock" size={14} color={theme.muted} /> : null}
      {selected && sub ? <Icon name="check" size={18} color={theme.accent} /> : null}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: space.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Row({
  title,
  value,
  onPress,
  icon,
  right,
  danger,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  icon?: IconName;
  right?: ReactNode;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: space.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      {icon ? <Icon name={icon} size={20} color={danger ? theme.danger : theme.muted} /> : null}
      <Text style={{ flex: 1, color: danger ? theme.danger : theme.text, fontFamily: fonts.sans, fontSize: 16 }}>{title}</Text>
      {value ? <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 15 }}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Icon name="chevron-right" size={16} color={theme.muted} /> : null}
    </Pressable>
  );
}

export function ToggleRow({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: space.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
      }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontFamily: fonts.sans, fontSize: 16 }}>{title}</Text>
        {sub ? <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 3, lineHeight: 18 }}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={v => {
          tap();
          onChange(v);
        }}
        trackColor={{ true: theme.accent, false: theme.border }}
        thumbColor="#ffffff"
        accessibilityLabel={title}
      />
    </View>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const theme = useTheme();
  const btn = (delta: number, glyph: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? `More ${label}` : `Fewer ${label}`}
      disabled={delta > 0 ? value >= max : value <= min}
      onPress={() => {
        tap();
        onChange(Math.max(min, Math.min(max, value + delta)));
      }}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: (delta > 0 ? value >= max : value <= min) ? 0.3 : pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: theme.text, fontSize: 22, fontFamily: fonts.sansMedium }}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }} accessibilityLabel={`${label}: ${value}`}>
      {btn(-1, '−')}
      <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 36, minWidth: 56, textAlign: 'center' }}>{value}</Text>
      {btn(1, '+')}
    </View>
  );
}

export function ProgressBar({ fraction, color, track, height = 6 }: { fraction: number; color?: string; track?: string; height?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={{ height, borderRadius: height, backgroundColor: track ?? theme.border, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%`, height, backgroundColor: color ?? theme.accent }} />
    </View>
  );
}

export function IconButton({ icon, label, onPress, color, size = 24 }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, marginHorizontal: -8 }}>
      {onBack ? <IconButton icon="chevron-left" label="Back" onPress={onBack} /> : <View style={{ width: 40 }} />}
      <Text
        accessibilityRole="header"
        style={{ flex: 1, textAlign: 'center', color: theme.text, fontFamily: fonts.sansSemi, fontSize: 16 }}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <T variant="label" style={{ marginTop: space.xl, marginBottom: space.sm }}>
      {children}
    </T>
  );
}
