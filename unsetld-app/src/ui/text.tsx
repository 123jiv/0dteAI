import { Children, type ReactNode } from 'react';
import { Text, useWindowDimensions, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { typo } from '../core/typography';
import { color as C, TYPE, type TextVariant } from './tokens';

/** Serif sizes scale down on narrow phones: min(1, width / 390). */
export function useSerifScale(): number {
  const { width } = useWindowDimensions();
  return Math.min(1, width / 390);
}

function typoChildren(children: ReactNode): ReactNode {
  return Children.map(children, c => (typeof c === 'string' ? typo(c) : c));
}

interface Props extends Omit<TextProps, 'style'> {
  v: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  align?: TextStyle['textAlign'];
  children?: ReactNode;
}

/** All UI text. Applies the type scale, typographic quotes and the 1.3× Dynamic Type cap. */
export function T({ v, color, style, align, children, ...rest }: Props) {
  const spec = TYPE[v];
  const scale = useSerifScale();
  const s = spec.serif ? scale : 1;
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        {
          fontFamily: spec.fontFamily,
          fontSize: spec.fontSize * s,
          lineHeight: spec.lineHeight * s,
          letterSpacing: (spec.letterSpacing ?? 0) * s,
          color: color ?? (v === 'label' || v.startsWith('mono') ? C.stone : C.bone),
          textTransform: spec.uppercase ? 'uppercase' : undefined,
          fontVariant: spec.tabular ? ['lining-nums', 'tabular-nums'] : undefined,
          textAlign: align,
        },
        style,
      ]}>
      {typoChildren(children)}
    </Text>
  );
}
