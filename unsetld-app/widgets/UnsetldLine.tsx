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
  /**
   * The colorway plate per family, downscaled to stay under WidgetKit's image
   * size limit for that family. file:// URLs in the App Group folder, or ''.
   */
  plateSmall: string;
  plateMedium: string;
  plateLarge: string;
  /** file:// URLs in the App Group folder, or '' when the folder isn't available. */
  walker: string;
  walkerTemplate: string;
};

/** The runtime also reports whether the system draws the container background (off in StandBy). */
type LineEnvironment = WidgetEnvironment & { showsContainerBackground?: boolean };

// Runs in the widget's isolated runtime: no imports from the app, no outer
// constants, no React hooks. Everything comes in through props.
// Props can be empty: WidgetKit's placeholder, and any snapshot taken before
// the app has written a timeline, render with {}. Every prop has a fallback.
//
// The widget renderer applies a Text's modifiers twice (once in its UIBaseView
// wrapper, once in TextView itself), so additive modifiers such as opacity and
// padding go on a wrapping stack, never on the Text.
const UnsetldLine = (props: Partial<LineWidgetProps>, environment: LineEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const white = '#FFFFFF';
  const wordmark = props.wordmark || 'unsetld';
  const walkerImage = (src: string | undefined, width: number, height: number) =>
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
          widgetURL(props.lockNo ? 'unsetld://line/' + props.lockNo : 'unsetld://today'),
        ]}>
        <HStack spacing={4}>
          {walkerImage(props.walkerTemplate, 7, 15)}
          <HStack spacing={0} modifiers={[opacity(0.6)]}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(white)]}>{wordmark}</Text>
          </HStack>
        </HStack>
        {props.lockText ? (
          <Text
            modifiers={[
              font({ size: 15, design: 'serif', weight: 'semibold' }),
              foregroundStyle(white),
              lineLimit(3),
              minimumScaleFactor(0.8),
            ]}>
            {props.lockText}
          </Text>
        ) : null}
      </VStack>
    );
  }

  // Tinted (accented), vibrant or StandBy: no plate, all text white, template walker.
  const mode = environment.widgetRenderingMode;
  const bare = (mode !== undefined && mode !== 'fullColor') || environment.showsContainerBackground === false;
  const ink = bare ? white : props.ink || '#EDE9E3';
  const secondary = bare ? white : props.secondary || '#8F8A83';
  const walker = bare ? props.walkerTemplate : props.walker;
  const text = props.text || wordmark;
  const plate =
    family === 'systemMedium' ? props.plateMedium : family === 'systemLarge' ? props.plateLarge : props.plateSmall;
  const fill = frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' });

  const body =
    family === 'systemMedium' ? (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(secondary)]}>
            {props.chapter || ''}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 10, design: 'monospaced' }), foregroundStyle(secondary)]}>
            {props.catalogue || ''}
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
          {text}
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
            {props.date || ''}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 10, design: 'monospaced' }), foregroundStyle(secondary)]}>
            {props.catalogue || ''}
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
          {text}
        </Text>
        <Spacer />
        <HStack spacing={6} alignment="bottom">
          {walkerImage(walker, 14, 31)}
          <Text modifiers={[font({ size: 13, design: 'serif' }), foregroundStyle(ink)]}>{wordmark}</Text>
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
          {text}
        </Text>
        <Spacer />
        {walkerImage(walker, 9, 20)}
      </VStack>
    );

  return (
    <ZStack
      modifiers={[
        containerBackground(props.bg || '#0A0A0A', 'widget'),
        widgetURL(props.no ? 'unsetld://line/' + props.no : 'unsetld://today'),
      ]}>
      {!bare && plate ? (
        <Image
          uiImage={plate}
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
