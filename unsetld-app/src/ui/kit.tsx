import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../content/copy';
import { selection } from '../services/haptics';
import { Icon } from './icons';
import { T } from './text';
import { color as C, font, hairline, MARGIN, radius } from './tokens';

/** A full-width hairline. */
export function Rule({ color = C.rule, inset = 0, style }: { color?: string; inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: hairline, backgroundColor: color, marginLeft: inset }, style]} />;
}

type ButtonKind = 'primary' | 'outline';

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
  accessibilityLabel,
  ink = C.bone,
  ground = C.ink,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Fill of a primary button (the page's ink colour on colorway pages). */
  ink?: string;
  /** Label colour on a primary button (the page's background). */
  ground?: string;
}) {
  const outline = kind === 'outline';
  const outlineBorder = ink === C.bone ? 'rgba(237,233,227,0.4)' : `${ink}66`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      // aria-* rather than accessibilityState: react-native-web only reads the former, iOS reads both.
      aria-disabled={Boolean(disabled)}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 54,
          paddingHorizontal: 16,
          borderRadius: radius.button,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled || outline ? 'transparent' : ink,
          borderWidth: disabled || outline ? 1 : 0,
          borderColor: disabled ? C.ash : outlineBorder,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}>
      <T v="button" align="center" color={disabled ? C.ash : outline ? ink : ground}>
        {title}
      </T>
    </Pressable>
  );
}

/** Inter 15 stone, no underline. */
export function TextButton({
  title,
  onPress,
  color = C.stone,
  align = 'center',
  style,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  align?: 'center' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: 'center',
          alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <T v="body" color={color}>
        {title}
      </T>
    </Pressable>
  );
}

/** Bone text with a thin underline. */
export function InlineLink({
  title,
  onPress,
  color = C.bone,
  v = 'body',
}: {
  title: string;
  onPress: () => void;
  color?: string;
  v?: 'body' | 'fine' | 'note';
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}>
      <T v={v} color={color} style={{ textDecorationLine: 'underline', textDecorationColor: color }}>
        {title}
      </T>
    </Pressable>
  );
}

/** The only selection mark: a 14pt square, filled bone = on, ash outline = off. */
export function Square({ on, size = 14, onColor = C.bone, offColor = C.ash }: { on: boolean; size?: number; onColor?: string; offColor?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: on ? onColor : 'transparent',
        borderWidth: on ? 0 : 1,
        borderColor: offColor,
      }}
    />
  );
}

/** Back chevron left, something small on the right. Sits at safeTop + 8, 44 tall. */
export function NavRow({
  onBack,
  onClose,
  right,
  step,
}: {
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
  step?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        marginTop: insets.top + 8,
        height: 44,
        paddingHorizontal: MARGIN - 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      {onBack || onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onClose ? COPY.reader.a11y.close : COPY.reader.a11y.back}
          onPress={onBack ?? onClose}
          hitSlop={8}
          style={({ pressed }) => ({ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6, opacity: pressed ? 0.6 : 1 })}>
          <Icon name={onClose ? 'close' : 'chevron-left'} size={24} color={C.stone} />
        </Pressable>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={{ paddingRight: 10, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}>
        {step ? <T v="mono">{step}</T> : right}
      </View>
    </View>
  );
}

/**
 * Ink page with the 28pt margin. `footer` is a fixed bottom bar (primary
 * button at safeBottom + 16) with a 24pt ink fade above it.
 */
export function Screen({
  nav,
  children,
  footer,
  scroll = true,
  contentStyle,
  scrollProps,
  background = C.ink,
}: {
  nav?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  background?: string;
}) {
  const insets = useSafeAreaInsets();
  const [footerH, setFooterH] = useState(footer ? 120 : 0);
  const onFooter = (e: LayoutChangeEvent) => setFooterH(e.nativeEvent.layout.height);
  const pad = { paddingHorizontal: MARGIN, paddingBottom: (footer ? footerH : insets.bottom) + 24 };
  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      {nav}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[pad, contentStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View onLayout={onFooter} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
          <LinearGradient colors={['rgba(10,10,10,0)', background]} style={{ height: 24, pointerEvents: 'none' }} />
          <View style={{ backgroundColor: background, paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 16 }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

/** Custom segmented control: 32 tall, square cells, bone fill when selected. */
export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  disabled = [],
  labels,
  style,
}: {
  options: readonly V[];
  value: V;
  onChange: (v: V) => void;
  disabled?: readonly V[];
  labels?: Partial<Record<string, string>>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="tablist" style={[{ flexDirection: 'row', borderWidth: 1, borderColor: C.ruleStrong }, style]}>
      {options.map((o, i) => {
        const on = o === value;
        const off = disabled.includes(o);
        return (
          <Pressable
            key={String(o)}
            accessibilityRole="tab"
            aria-selected={on}
            aria-disabled={off}
            disabled={off}
            onPress={() => {
              if (on || off) return;
              selection();
              onChange(o);
            }}
            // 32pt cells; the slop makes the hit area 44 tall.
            hitSlop={{ top: 6, bottom: 6 }}
            style={{
              flex: 1,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? C.bone : 'transparent',
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: C.ruleStrong,
            }}>
            <T
              v="small"
              style={{ fontFamily: font.sansMedium }}
              color={on ? C.ink : off ? C.ash : C.stone}>
              {labels?.[String(o)] ?? String(o)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The native switch in the spec's colours. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={v => {
        selection();
        onChange(v);
      }}
      trackColor={{ false: C.rule, true: C.bone }}
      thumbColor={value ? C.ink : C.bone}
      ios_backgroundColor={C.rule}
      {...({ activeThumbColor: C.ink } as object)}
    />
  );
}

/** Section header in label style: 32 above, 8 below. */
export function SectionHeader({ children, first }: { children: string; first?: boolean }) {
  return (
    <T v="label" style={{ marginTop: first ? 8 : 32, marginBottom: 8, paddingHorizontal: MARGIN }}>
      {children}
    </T>
  );
}

/**
 * Settings row: 52 tall, hairline inset 28 left. A `right` control (a Toggle)
 * sits beside the pressable part, not inside it: an accessible Pressable hides
 * its children from VoiceOver, so the switch could not be reached.
 */
export function SettingsRow({
  title,
  value,
  onPress,
  chevron = true,
  right,
  first,
  accessibilityLabel,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  right?: ReactNode;
  first?: boolean;
  accessibilityLabel?: string;
}) {
  // A switch-only row: the switch carries the label, so the title is not read twice.
  const switchOnly = Boolean(right) && !onPress;
  // The pressed shade covers the whole row, the switch's part included.
  const [pressed, setPressed] = useState(false);
  return (
    <View>
      {first ? <Rule inset={MARGIN} /> : null}
      <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: pressed && onPress ? '#121211' : 'transparent' }}>
        <Pressable
          accessible={!switchOnly}
          accessibilityElementsHidden={switchOnly}
          importantForAccessibility={switchOnly ? 'no-hide-descendants' : 'auto'}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
          disabled={!onPress}
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={{
            flex: 1,
            minHeight: 52,
            paddingLeft: MARGIN,
            paddingRight: right ? 12 : MARGIN - (chevron && onPress ? 8 : 0),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
          <T v="row" style={{ flex: 1, fontFamily: font.sans }} numberOfLines={1}>
            {title}
          </T>
          {value ? (
            <T v="small" color={C.stone} numberOfLines={1} style={{ maxWidth: '58%', textAlign: 'right' }}>
              {value}
            </T>
          ) : null}
          {/* 24 box: the 6x12 glyph's right edge lands on the 28 margin. */}
          {chevron && onPress ? <Icon name="chevron-right" size={24} color={C.stone} /> : null}
        </Pressable>
        {right ? <View style={{ paddingRight: MARGIN }}>{right}</View> : null}
      </View>
      <Rule inset={MARGIN} />
    </View>
  );
}

export function Footnote({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: MARGIN, paddingTop: 8 }, style]}>
      <T v="note" color={C.stone}>
        {children}
      </T>
    </View>
  );
}

/** A full-width row with hairline above; whole row is the hit area. */
export function ListRow({
  children,
  onPress,
  onLongPress,
  height = 48,
  style,
  accessibilityLabel,
  state,
  accessibilityRole = 'button',
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Read out as aria-checked, aria-selected and aria-disabled, which iOS and the web both understand. */
  state?: { checked?: boolean; selected?: boolean; disabled?: boolean };
  accessibilityRole?: 'button' | 'checkbox' | 'radio';
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? accessibilityRole : undefined}
      accessibilityLabel={accessibilityLabel}
      aria-checked={state?.checked}
      aria-selected={state?.selected}
      aria-disabled={state?.disabled}
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          minHeight: height,
          borderTopWidth: hairline,
          borderTopColor: C.rule,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/** Title + body block used at the top of most pages. */
export function PageTitle({ title, body, style }: { title: string; body?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 24, gap: 12 }, style]}>
      <T v="title.xl" accessibilityRole="header" style={{ textAlign: 'left' }}>
        {title}
      </T>
      {body ? (
        <T v="body" color={C.stone}>
          {body}
        </T>
      ) : null}
    </View>
  );
}
