import Svg, { Path } from 'react-native-svg';
import { SVG_HIDDEN } from './icons';
import { color as C } from './tokens';
import { WALKER_FIG, WALKER_LAP, WALKER_VIEWBOX } from './walkerPaths';

export const WALKER_RATIO = 301 / 669;

interface Props {
  height: number;
  /** Body colour. Defaults to bone (on dark). */
  color?: string;
  /** Lapel colour. Defaults to stone on dark, #6E6A65 on light. */
  lapelColor?: string;
}

/** The faceless walking figure: the only illustration in the app. */
export function Walker({ height, color = C.bone, lapelColor }: Props) {
  const lapel = lapelColor ?? (color === C.bone ? C.stone : '#6E6A65');
  return (
    <Svg
      width={height * WALKER_RATIO}
      height={height}
      viewBox={WALKER_VIEWBOX}
      {...SVG_HIDDEN}>
      <Path d={WALKER_FIG} fill={color} fillRule="evenodd" />
      <Path d={WALKER_LAP} fill={lapel} fillRule="evenodd" />
    </Svg>
  );
}
