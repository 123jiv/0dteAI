import { HStack, Image, Rectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  opacity,
  resizable,
  strokeBorder,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

/**
 * The Today widget (kind "UnsetldStandard", kept so widgets already placed stay
 * put): the day's missions with a square each, filled once proven, and n / m.
 */
export type StandardWidgetProps = {
  /** 'TODAY' */
  label: string;
  /** '1 / 3'; '' without a plan. */
  count: string;
  /** Mission titles in plan order (at most three; typographic quotes applied). */
  titles: string[];
  /** Same order as titles: true = proven. */
  done: boolean[];
  /** Shown when there's no plan yet: 'Three missions are waiting.' */
  empty: string;
  /** file:// URL in the App Group folder, or ''. */
  walkerTemplate: string;
};

// Lock Screen only: no background, white text the system renders vibrant.
// Props can be empty (WidgetKit's placeholder, or a snapshot before the app
// has written a timeline), so every prop has a fallback. Additive modifiers
// (opacity) stay off Text: the widget renderer applies a Text's modifiers twice.
const UnsetldStandard = (props: Partial<StandardWidgetProps>) => {
  'widget';
  const white = '#FFFFFF';
  const titles = (props.titles || []).slice(0, 3);
  const done = props.done || [];
  const modifiers = [
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
    containerBackground('clear', 'widget'),
    widgetURL('unsetld://today'),
  ];
  const head = (
    <HStack spacing={4}>
      {props.walkerTemplate ? (
        <Image
          uiImage={props.walkerTemplate}
          modifiers={[resizable(), widgetAccentedRenderingMode('accented'), frame({ width: 6, height: 13 })]}
        />
      ) : null}
      <HStack spacing={0} modifiers={[opacity(0.7)]}>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1), foregroundStyle(white)]}>
          {props.label || 'TODAY'}
        </Text>
      </HStack>
      <Spacer />
      {props.count ? (
        <Text modifiers={[font({ size: 11, design: 'monospaced' }), foregroundStyle(white)]}>{props.count}</Text>
      ) : null}
    </HStack>
  );

  if (!titles.length) {
    return (
      <VStack alignment="leading" spacing={2} modifiers={modifiers}>
        {head}
        <Text
          modifiers={[
            font({ size: 14, design: 'serif', weight: 'semibold' }),
            foregroundStyle(white),
            lineLimit(2),
            minimumScaleFactor(0.8),
          ]}>
          {props.empty || 'Three missions are waiting.'}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={modifiers}>
      {head}
      {titles.map((title, i) => (
        <HStack key={String(i)} spacing={5}>
          <Rectangle
            modifiers={
              done[i]
                ? [foregroundStyle(white), frame({ width: 8, height: 8 })]
                : [foregroundStyle('clear'), frame({ width: 8, height: 8 }), strokeBorder({ content: white, style: { lineWidth: 1 } })]
            }
          />
          <Text
            modifiers={[
              font({ size: 13, design: 'serif', weight: 'semibold' }),
              foregroundStyle(white),
              lineLimit(1),
              minimumScaleFactor(0.8),
            ]}>
            {title}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
};

export default createWidget<StandardWidgetProps>('UnsetldStandard', UnsetldStandard);
