import { Gauge, HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  clipped,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  italic,
  kerning,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  resizable,
  strokeBorder,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type RecordWidgetProps = {
  /** Days on record. */
  count: number;
  /** 'RECORD' */
  label: string;
  /** 'days on record' (or 'day on record' for 1). */
  unit: string;
  /** Inline Lock Screen text: 'Day 41'. */
  inline: string;
  /** The last 7 days, oldest first, today last: true = on record. */
  week: boolean[];
  ink: string;
  secondary: string;
  bg: string;
  /** file:// URLs in the App Group folder, or '' when the folder isn't available. */
  plate: string;
  walkerTemplate: string;
  /** A 7x15 pt template walker drawn at its own size, for the inline family. */
  walkerInline: string;
};

/** The runtime also reports whether the system draws the container background (off in StandBy). */
type RecordEnvironment = WidgetEnvironment & { showsContainerBackground?: boolean };

const UnsetldRecord = (props: RecordWidgetProps, environment: RecordEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const white = '#FFFFFF';
  const url = 'unsetld://record';

  if (family === 'accessoryInline') {
    return (
      <HStack spacing={4} modifiers={[containerBackground('clear', 'widget'), widgetURL(url)]}>
        {props.walkerInline ? (
          <Image uiImage={props.walkerInline} modifiers={[widgetAccentedRenderingMode('accented')]} />
        ) : null}
        <Text>{props.inline}</Text>
      </HStack>
    );
  }

  if (family === 'accessoryCircular') {
    const on = props.week.filter(d => d).length;
    // The widget renderer draws a Gauge without its label slots, so the count and
    // the walker sit over the gauge instead of in currentValueLabel / label.
    return (
      <ZStack modifiers={[containerBackground('clear', 'widget'), widgetURL(url)]}>
        <Gauge value={on / 7} modifiers={[gaugeStyle('circular')]} />
        <Text
          modifiers={[
            font({ size: 20, design: 'serif', weight: 'medium' }),
            monospacedDigit(),
            foregroundStyle(white),
            lineLimit(1),
            minimumScaleFactor(0.5),
            padding({ horizontal: 10 }),
          ]}>
          {String(props.count)}
        </Text>
        {props.walkerTemplate ? (
          <VStack spacing={0} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'bottom' })]}>
            <Image
              uiImage={props.walkerTemplate}
              modifiers={[resizable(), widgetAccentedRenderingMode('accented'), frame({ width: 7, height: 15 })]}
            />
          </VStack>
        ) : null}
      </ZStack>
    );
  }

  // systemSmall. Tinted (accented), vibrant or StandBy: no plate, all white, no red.
  const mode = environment.widgetRenderingMode;
  const bare = (mode !== undefined && mode !== 'fullColor') || environment.showsContainerBackground === false;
  const ink = bare ? white : props.ink;
  const secondary = bare ? white : props.secondary;
  const signal = bare ? white : '#C41E1E';
  const last = props.week.length - 1;

  return (
    <ZStack modifiers={[containerBackground(props.bg, 'widget'), widgetURL(url)]}>
      {!bare && props.plate ? (
        <Image
          uiImage={props.plate}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: 'fill' }),
            frame({ maxWidth: 10000, maxHeight: 10000 }),
            clipped(),
          ]}
        />
      ) : null}
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }), padding({ all: 16 })]}>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(secondary)]}>
          {props.label}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 56, design: 'serif', weight: 'regular' }),
            monospacedDigit(),
            foregroundStyle(ink),
            lineLimit(1),
            minimumScaleFactor(0.5),
          ]}>
          {String(props.count)}
        </Text>
        <Text modifiers={[font({ size: 13, design: 'serif' }), italic(), foregroundStyle(secondary), lineLimit(1)]}>
          {props.unit}
        </Text>
        <HStack spacing={4} modifiers={[padding({ top: 10 })]}>
          {props.week.map((onRecord, i) => (
            <Rectangle
              key={String(i)}
              modifiers={
                i === last
                  ? [
                      foregroundStyle(onRecord ? ink : 'clear'),
                      frame({ width: 12, height: 12 }),
                      strokeBorder({ content: signal, style: { lineWidth: 1.5 } }),
                    ]
                  : onRecord
                    ? [foregroundStyle(ink), frame({ width: 12, height: 12 })]
                    : [
                        foregroundStyle('clear'),
                        frame({ width: 12, height: 12 }),
                        strokeBorder({ content: secondary, style: { lineWidth: 1 } }),
                      ]
              }
            />
          ))}
        </HStack>
      </VStack>
    </ZStack>
  );
};

export default createWidget<RecordWidgetProps>('UnsetldRecord', UnsetldRecord);
