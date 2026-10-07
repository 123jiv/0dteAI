import { Spacer, Text, VStack, HStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type HomeWidgetProps = {
  text: string;
  lane: string;
  streak: number;
  rank: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
};

// Runs in the widget's isolated runtime: no imports from the app, no outer
// constants; everything comes in through props (see expo-widgets docs).
const UnsetldHome = (props: HomeWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const tinted = environment.widgetRenderingMode === 'accented';
  const fg = tinted ? '#ffffff' : props.fg;
  const muted = tinted ? '#ffffff' : props.muted;
  const accent = tinted ? '#ffffff' : props.accent;
  const small = environment.widgetFamily === 'systemSmall';

  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        padding({ all: small ? 2 : 4 }),
        containerBackground(props.bg, 'widget'),
        widgetURL('unsetld://today'),
      ]}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(accent)]}>
          {props.lane.toUpperCase()}
        </Text>
        <Spacer />
        {small ? null : (
          <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted)]}>
            {`${props.streak}d · ${props.rank}`}
          </Text>
        )}
      </HStack>
      <Spacer />
      <Text
        modifiers={[
          font({ size: small ? 17 : 21, design: 'serif', weight: 'medium' }),
          foregroundStyle(fg),
          lineLimit(small ? 5 : 3),
          minimumScaleFactor(0.6),
        ]}>
        {props.text}
      </Text>
      <Spacer />
      <Text modifiers={[font({ size: 9, weight: 'semibold' }), kerning(2), foregroundStyle(muted)]}>unsetld</Text>
    </VStack>
  );
};

export default createWidget<HomeWidgetProps>('UnsetldHome', UnsetldHome);
