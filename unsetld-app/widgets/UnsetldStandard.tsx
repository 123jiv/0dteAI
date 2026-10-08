import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type StandardWidgetProps = {
  /** The user's rules (up to three), typographic quotes applied. */
  rules: string[];
  /** Shown when no rules are set yet: 'Set your standard.' */
  empty: string;
  /** file:// URL in the App Group folder, or ''. */
  walkerTemplate: string;
};

// Lock Screen only: no background, white text the system renders vibrant.
const UnsetldStandard = (props: StandardWidgetProps) => {
  'widget';
  const white = '#FFFFFF';
  const rules = props.rules.slice(0, 3);
  const modifiers = [
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'leading' }),
    containerBackground('clear', 'widget'),
    widgetURL('unsetld://record'),
  ];

  if (!rules.length) {
    return (
      <HStack spacing={4} modifiers={modifiers}>
        {props.walkerTemplate ? (
          <Image
            uiImage={props.walkerTemplate}
            modifiers={[resizable(), widgetAccentedRenderingMode('accented'), frame({ width: 7, height: 15 })]}
          />
        ) : null}
        <Text
          modifiers={[
            font({ size: 13, design: 'serif', weight: 'semibold' }),
            foregroundStyle(white),
            lineLimit(1),
            minimumScaleFactor(0.8),
          ]}>
          {props.empty}
        </Text>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={2} modifiers={modifiers}>
      {rules.map((rule, i) => (
        <HStack key={String(i)} spacing={0} alignment="firstTextBaseline">
          <Text modifiers={[font({ size: 13, design: 'monospaced' }), foregroundStyle(white)]}>
            {'0' + (i + 1) + ' '}
          </Text>
          <Text
            modifiers={[
              font({ size: 13, design: 'serif', weight: 'semibold' }),
              foregroundStyle(white),
              lineLimit(1),
              minimumScaleFactor(0.8),
            ]}>
            {rule}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
};

export default createWidget<StandardWidgetProps>('UnsetldStandard', UnsetldStandard);
