import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { Colorway } from '../core/types';
import { PLATES, SWATCHES } from './colorwayAssets';

/** The reader's fixed background layer. It never scrolls with the pages. */
export function ColorwayBackground({ colorway, swatch = false }: { colorway: Colorway; swatch?: boolean }) {
  const plate = swatch ? SWATCHES[colorway.id] : colorway.kind === 'plate' ? PLATES[colorway.id] : undefined;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colorway.bg, pointerEvents: 'none' }]}>
      {plate ? (
        <Image source={plate} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} cachePolicy="memory" />
      ) : colorway.kind === 'gradient' && colorway.bgEnd ? (
        <LinearGradient colors={[colorway.bg, colorway.bgEnd]} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}
