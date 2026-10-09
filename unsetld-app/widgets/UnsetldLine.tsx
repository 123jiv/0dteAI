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

/**
 * The Next mission widget (kind "UnsetldLine", kept so widgets already placed
 * stay put): the next mission in today's plan that isn't proven yet, its title
 * and the line Home shows under it ("School · 30 min · +15").
 */
export type LineWidgetProps = {
  /** 'NEXT MISSION', or 'TODAY' when there's no mission to name. */
  label: string;
  /** Mission title ('Study for 30 Minutes'), or 'Perfect day.' / 'Three missions are waiting.'. Typographic quotes applied. */
  title: string;
  /** 'School · 30 min · +15', or '3 / 3 PROVEN'; '' when there's nothing to add. */
  meta: string;
  /** Today's count, '1 / 3'; '' without a plan. */
  progress: string;
  /** Mission id: a tap opens it. '' opens Home. */
  missionId: string;
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
  const label = props.label || 'NEXT MISSION';
  const title = props.title || wordmark;
  const url = props.missionId ? 'unsetld://mission/' + props.missionId : 'unsetld://today';
  const walkerImage = (src: string | undefined, width: number, height: number) =>
    src ? (
      <Image
        uiImage={src}
        modifiers={[resizable(), widgetAccentedRenderingMode('accented'), frame({ width, height })]}
      />
    ) : null;

  // Lock Screen: no background, white text the system renders vibrant.
  if (family === 'accessoryRectangular') {
    return (
      <VStack
        alignment="leading"
        spacing={1}
        modifiers={[
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
          containerBackground('clear', 'widget'),
          widgetURL(url),
        ]}>
        <HStack spacing={4}>
          {walkerImage(props.walkerTemplate, 7, 15)}
          <HStack spacing={0} modifiers={[opacity(0.7)]}>
            <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1), foregroundStyle(white), lineLimit(1)]}>
              {label}
            </Text>
          </HStack>
        </HStack>
        <Text
          modifiers={[
            font({ size: 15, design: 'serif', weight: 'semibold' }),
            foregroundStyle(white),
            lineLimit(2),
            minimumScaleFactor(0.8),
          ]}>
          {title}
        </Text>
        {props.meta ? (
          <HStack spacing={0} modifiers={[opacity(0.7)]}>
            <Text modifiers={[font({ size: 11, design: 'monospaced' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.75)]}>
              {props.meta}
            </Text>
          </HStack>
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
  const plate =
    family === 'systemMedium' ? props.plateMedium : family === 'systemLarge' ? props.plateLarge : props.plateSmall;
  const fill = frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' });
  const labelText = (text: string) => (
    <Text modifiers={[font({ size: 10, weight: 'semibold' }), kerning(1.5), foregroundStyle(secondary), lineLimit(1)]}>
      {text}
    </Text>
  );
  // "Organization · 45 min · +20" is the longest line: it shrinks a little before it cuts off.
  const monoText = (text: string, size: number) => (
    <Text modifiers={[font({ size, design: 'monospaced' }), foregroundStyle(secondary), lineLimit(1), minimumScaleFactor(0.75)]}>
      {text}
    </Text>
  );

  const body =
    family === 'systemMedium' ? (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <HStack spacing={8}>
          {labelText(label)}
          <Spacer />
          {props.progress ? monoText(props.progress, 10) : null}
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 24, design: 'serif', weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(2),
            minimumScaleFactor(0.8),
          ]}>
          {title}
        </Text>
        <HStack spacing={8} alignment="bottom" modifiers={[padding({ top: 6 })]}>
          {props.meta ? monoText(props.meta, 10) : null}
          <Spacer />
          {walkerImage(walker, 12, 27)}
        </HStack>
      </VStack>
    ) : family === 'systemLarge' ? (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        <HStack spacing={8}>
          {labelText(props.date || '')}
          <Spacer />
          {props.progress ? monoText(props.progress, 10) : null}
        </HStack>
        <Spacer />
        {labelText(label)}
        <HStack spacing={0} modifiers={[padding({ top: 8 })]}>
          <Text
            modifiers={[
              font({ size: 34, design: 'serif', weight: 'medium' }),
              foregroundStyle(ink),
              lineLimit(4),
              minimumScaleFactor(0.8),
            ]}>
            {title}
          </Text>
        </HStack>
        {props.meta ? <HStack spacing={0} modifiers={[padding({ top: 10 })]}>{monoText(props.meta, 11)}</HStack> : null}
        <Spacer />
        <HStack spacing={6} alignment="bottom">
          {walkerImage(walker, 14, 31)}
          <Text modifiers={[font({ size: 13, design: 'serif' }), foregroundStyle(ink)]}>{wordmark}</Text>
        </HStack>
      </VStack>
    ) : (
      <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 16 })]}>
        {labelText(label)}
        <Spacer />
        <Text
          modifiers={[
            font({ size: 19, design: 'serif', weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(3),
            minimumScaleFactor(0.75),
          ]}>
          {title}
        </Text>
        <HStack spacing={6} alignment="bottom" modifiers={[padding({ top: 6 })]}>
          {props.meta ? monoText(props.meta, 9) : null}
          <Spacer />
          {walkerImage(walker, 9, 20)}
        </HStack>
      </VStack>
    );

  return (
    <ZStack modifiers={[containerBackground(props.bg || '#0A0A0A', 'widget'), widgetURL(url)]}>
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
