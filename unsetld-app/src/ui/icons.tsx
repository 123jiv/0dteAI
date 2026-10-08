import Svg, { Path } from 'react-native-svg';
import { color as C } from './tokens';

export type IconName =
  | 'bookmark'
  | 'bookmark-filled'
  | 'share'
  | 'index'
  | 'colorway'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'close'
  | 'plus';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

// Custom stroke icons on a 24 grid: 1.5pt stroke, round caps and joins. The
// stroke is in viewBox units, so it's scaled by 24/size to stay 1.5pt at any size.
export function Icon({ name, size = 24, color = C.stone }: Props) {
  const p = {
    stroke: color,
    strokeWidth: (1.5 * 24) / size,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {(name === 'bookmark' || name === 'bookmark-filled') && (
        <Path {...p} fill={name === 'bookmark-filled' ? color : 'none'} d="M6.5 3.75h11v16.5L12 16.4l-5.5 3.85V3.75z" />
      )}
      {name === 'share' && (
        <>
          <Path {...p} d="M12 3.5v11" />
          <Path {...p} d="M8 7.25 12 3.5l4 3.75" />
          <Path {...p} d="M8.5 10.25H6.25v10h11.5v-10H15.5" />
        </>
      )}
      {name === 'index' && (
        <>
          <Path {...p} d="M3 7h18" />
          <Path {...p} d="M3 12h14" />
          <Path {...p} d="M3 17h10" />
        </>
      )}
      {name === 'colorway' && (
        <>
          <Path {...p} d="M4.25 4.25h15.5v15.5H4.25z" />
          <Path stroke="none" fill={color} d="M19.75 4.25v15.5H4.25z" />
        </>
      )}
      {name === 'chevron-left' && <Path {...p} d="M15 5.5 8.5 12l6.5 6.5" />}
      {name === 'chevron-right' && <Path {...p} d="M9.5 6l6 6-6 6" />}
      {name === 'chevron-up' && <Path {...p} d="M6 15l6-6 6 6" />}
      {name === 'close' && (
        <>
          <Path {...p} d="M6 6l12 12" />
          <Path {...p} d="M18 6 6 18" />
        </>
      )}
      {name === 'plus' && (
        <>
          <Path {...p} d="M12 5v14" />
          <Path {...p} d="M5 12h14" />
        </>
      )}
    </Svg>
  );
}
