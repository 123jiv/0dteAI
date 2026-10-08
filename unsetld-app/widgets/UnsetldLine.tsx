import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  clipped,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type LineWidgetProps = {
  /** The line for the Home Screen sizes: clean, typographic quotes applied. */
  text: string;
  no: number;
  /** Clean and 60 characters or fewer, for the Lock Screen. Often the same line as `text`. */
  lockText: string;
  lockNo: number;
  /** Chapter label, uppercased ('DISCIPLINE'). */
  chapter: string;
  /** 'No. 0412' */
  catalogue: string;
  /** 'WED 7 OCT' */
  date: string;
  /** 'unsetld' */
  wordmark: string;
  ink: string;
  secondary: string;
  bg: string;
  /** file:// URLs in the App Group folder, or '' when the folder isn't available. */
  plate: string;
  walker: string;
  walkerTemplate: string;
};

/** The runtime also reports whether the system draws the container background (off in StandBy). */
type LineEnvironment = WidgetEnvironment & { showsContainerBackground?: boolean };

// Runs in the widget's isolated runtime: no imports from the app, no outer
// constants, no React hooks. Everything comes in through props.
const UnsetldLine = (props: LineWidgetProps, environment: LineEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const white = '#FFFFFF';
  const walkerImage = (src: string, width: number, height: number) =>
    src ? (
      <Image
        uiImage={src}
        modifiers={[resizable(), widgetAccentedRenderingMode('accented'), frame({ width, height })]}
      />
    ) : null;

  // Lock Screen: no background, clean lines of 60 characters or fewer.
  if (family === 'accessoryRectangular') {
    return (
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
          containerBackground('clear', 'widget'),
          widgetURL('unsetld://line/' + props.lockNo),
        ]}>
        <HStack spacing={4}>
          {walkerImage(props.walkerTemplate, 7, 15)}
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(white), opacity(0.6)]}>
            {props.wordmark}
          </Text>
        </HStack>
        <Text
          modifiers={[
            font({ size: 15, design: 'serif', weight: 'semibold' }),
            foregroundStyle(white),
            lineLimit(3),
            minimumScaleFactor(0.8),
          ]}>
          {props.lockText}
        </Text>
      </VStack>
    );
  }

  // Tinted (accented), vibrant or StandBy: no plate, all text white, template walker.
  const mode = environment.widgetRenderingMode;
  const bare = (mode !== undefined && mode !== 'fullColor') || environment.showsContainerBackground === false;
  const ink = bare ? white : props.ink;
  const secondary = bare ? white : props.secondary;
  const walker = bare ? props.walkerTemplate : props.walker;
  const fill = frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' });

  const body =
    family === 'systemMedium' ? (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(secondary)]}>
            {props.chapter}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 10, design: 'monospaced' }), foregroundStyle(secondary)]}>
            {props.catalogue}
          </Text>
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 22, design: 'serif', weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(3),
            minimumScaleFactor(0.8),
          ]}>
          {props.text}
        </Text>
        <HStack spacing={0}>
          <Spacer />
          {walkerImage(walker, 12, 27)}
        </HStack>
      </VStack>
    ) : family === 'systemLarge' ? (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(secondary)]}>
            {props.date}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 10, design: 'monospaced' }), foregroundStyle(secondary)]}>
            {props.catalogue}
          </Text>
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 30, design: 'serif', weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(6),
            minimumScaleFactor(0.8),
          ]}>
          {props.text}
        </Text>
        <Spacer />
        <HStack spacing={6} alignment="bottom">
          {walkerImage(walker, 14, 31)}
          <Text modifiers={[font({ size: 13, design: 'serif' }), foregroundStyle(ink)]}>{props.wordmark}</Text>
        </HStack>
      </VStack>
    ) : (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <Text
          modifiers={[
            font({ size: 18, design: 'serif', weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(5),
            minimumScaleFactor(0.75),
          ]}>
          {props.text}
        </Text>
        <Spacer />
        {walkerImage(walker, 9, 20)}
      </VStack>
    );

  return (
    <ZStack modifiers={[containerBackground(props.bg, 'widget'), widgetURL('unsetld://line/' + props.no)]}>
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
      {body}
    </ZStack>
  );
};

export default createWidget<LineWidgetProps>('UnsetldLine', UnsetldLine);
