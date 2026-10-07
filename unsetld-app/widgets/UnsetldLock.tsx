import { AccessoryWidgetBackground, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type LockWidgetProps = {
  text: string;
  short: string;
  streak: number;
};

// Lock Screen widgets render in iOS "vibrant" mode (monochrome), so this one
// is pure typography. Lines here are clean unless the user turned that off.
const UnsetldLock = (props: LockWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  if (environment.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL('unsetld://today')]}>{props.short}</Text>;
  }
  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <ZStack modifiers={[containerBackground('clear', 'widget'), widgetURL('unsetld://today')]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Text modifiers={[font({ size: 20, weight: 'bold' })]}>{String(props.streak)}</Text>
          <Text modifiers={[font({ size: 8, weight: 'semibold' })]}>DAYS</Text>
        </VStack>
      </ZStack>
    );
  }
  return (
    <VStack
      alignment="leading"
      modifiers={[
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'leading' }),
        containerBackground('clear', 'widget'),
        widgetURL('unsetld://today'),
      ]}>
      <Text
        modifiers={[
          font({ size: 15, design: 'serif', weight: 'semibold' }),
          lineLimit(3),
          minimumScaleFactor(0.7),
          multilineTextAlignment('leading'),
        ]}>
        {props.text}
      </Text>
    </VStack>
  );
};

export default createWidget<LockWidgetProps>('UnsetldLock', UnsetldLock);
