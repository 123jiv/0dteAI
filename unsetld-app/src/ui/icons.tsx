import { Platform } from 'react-native';
import Svg, { Path, type SvgProps } from 'react-native-svg';
import { color as C } from './tokens';

/**
 * Keeps a drawing out of VoiceOver. On the web react-native-svg hands its props
 * straight to the <svg> element, where the iOS props are unknown attributes;
 * aria-hidden is the web's own word for the same thing.
 */
export const SVG_HIDDEN: SvgProps =
  Platform.OS === 'web' ? { 'aria-hidden': true } : { accessibilityElementsHidden: true, importantForAccessibility: 'no' };

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
  | 'plus'
  // Proof types
  | 'camera'
  | 'timer'
  | 'before-after'
  | 'check'
  // Tabs
  | 'tab-today'
  | 'tab-progress'
  | 'tab-rewards'
  | 'tab-you';

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
    <Svg width={size} height={size} viewBox="0 0 24 24" {...SVG_HIDDEN}>
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
      {name === 'camera' && (
        <>
          <Path {...p} d="M3.75 8.25h3.5l1.75-2.5h6l1.75 2.5h3.5v11H3.75z" />
          <Path {...p} d="M12 16.75a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z" />
        </>
      )}
      {name === 'timer' && (
        <>
          <Path {...p} d="M12 20.75a7.75 7.75 0 1 0 0-15.5 7.75 7.75 0 0 0 0 15.5z" />
          <Path {...p} d="M12 9v4l2.75 1.75" />
          <Path {...p} d="M9.75 2.75h4.5" />
        </>
      )}
      {name === 'before-after' && (
        <>
          <Path {...p} d="M2.75 6.75h7v10.5h-7z" />
          <Path {...p} d="M14.25 6.75h7v10.5h-7z" />
          <Path {...p} d="M10.75 12h2.25" />
        </>
      )}
      {name === 'check' && <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />}
      {name === 'tab-today' && (
        <>
          <Path {...p} d="M4.75 5.25h14.5v14.5H4.75z" />
          <Path {...p} d="M4.75 9.75h14.5" />
          <Path {...p} d="M8.5 13.75h2.5" />
        </>
      )}
      {name === 'tab-progress' && (
        <>
          <Path {...p} d="M5.5 19.5v-5" />
          <Path {...p} d="M12 19.5v-9" />
          <Path {...p} d="M18.5 19.5v-14" />
        </>
      )}
      {name === 'tab-rewards' && (
        <>
          <Path {...p} d="M3.75 8.25V5.5h16.5v2.75a2.75 2.75 0 0 0 0 5.5v2.75H3.75v-2.75a2.75 2.75 0 0 0 0-5.5z" />
          <Path {...p} d="M14.5 6v2.5M14.5 11.25v1.5M14.5 15.5V18" />
        </>
      )}
      {name === 'tab-you' && (
        <>
          <Path {...p} d="M12 11.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5z" />
          <Path {...p} d="M4.75 20.25c1.1-3.6 3.9-5.5 7.25-5.5s6.15 1.9 7.25 5.5" />
        </>
      )}
    </Svg>
  );
}
