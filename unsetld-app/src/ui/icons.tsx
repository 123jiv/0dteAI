import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'heart'
  | 'heart-filled'
  | 'share'
  | 'flame'
  | 'shield'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'check'
  | 'lock'
  | 'plus'
  | 'trash'
  | 'bolt'
  | 'home'
  | 'rank'
  | 'me'
  | 'bag'
  | 'bell'
  | 'quote';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

// Minimal line icons drawn with SVG so they look the same on iOS and web.
export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'heart' && <Path {...p} d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.5 3.8 4 7.3 4c2 0 3.5 1.1 4.7 2.8C13.2 5.1 14.7 4 16.7 4c3.5 0 5.7 3.5 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" />}
      {name === 'heart-filled' && (
        <Path {...p} fill={color} d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.5 3.8 4 7.3 4c2 0 3.5 1.1 4.7 2.8C13.2 5.1 14.7 4 16.7 4c3.5 0 5.7 3.5 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" />
      )}
      {name === 'share' && (
        <>
          <Path {...p} d="M12 3v12" />
          <Path {...p} d="M7.5 7.5 12 3l4.5 4.5" />
          <Path {...p} d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </>
      )}
      {name === 'flame' && (
        <Path {...p} d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.4-2.3-5.6-3.8-7.6-.4 2-1.4 3-2.6 3.4.3-2.9-.8-5.6-3.3-7.5.2 3.2-1.6 5.2-3 7.1-1.2 1.6-2.3 3.1-2.3 4.9C3.5 18.6 6.6 21 12 21z" />
      )}
      {name === 'shield' && <Path {...p} d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3z" />}
      {name === 'chevron-right' && <Path {...p} d="m9 5 7 7-7 7" />}
      {name === 'chevron-left' && <Path {...p} d="m15 5-7 7 7 7" />}
      {name === 'close' && (
        <>
          <Path {...p} d="M6 6l12 12" />
          <Path {...p} d="M18 6 6 18" />
        </>
      )}
      {name === 'check' && <Path {...p} d="m5 12.5 4.5 4.5L19 7.5" />}
      {name === 'lock' && (
        <>
          <Rect {...p} x={5} y={10.5} width={14} height={10} rx={2} />
          <Path {...p} d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
        </>
      )}
      {name === 'plus' && (
        <>
          <Path {...p} d="M12 5v14" />
          <Path {...p} d="M5 12h14" />
        </>
      )}
      {name === 'trash' && (
        <>
          <Path {...p} d="M4 7h16" />
          <Path {...p} d="M9 7V4h6v3" />
          <Path {...p} d="M6.5 7l1 13h9l1-13" />
        </>
      )}
      {name === 'bolt' && <Path {...p} d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2z" />}
      {name === 'home' && (
        <>
          <Path {...p} d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V20" />
          <Path {...p} d="M8 9h8" />
          <Path {...p} d="M8 13h5" />
        </>
      )}
      {name === 'rank' && (
        <>
          <Path {...p} d="m6 15 6-5 6 5" />
          <Path {...p} d="m6 20 6-5 6 5" />
          <Path {...p} d="m6 10 6-5 6 5" />
        </>
      )}
      {name === 'me' && (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4.5 21c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
        </>
      )}
      {name === 'bag' && (
        <>
          <Path {...p} d="M5 8h14l-1 13H6L5 8z" />
          <Path {...p} d="M9 8V6a3 3 0 0 1 6 0v2" />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path {...p} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
          <Path {...p} d="M10 20.5a2 2 0 0 0 4 0" />
        </>
      )}
      {name === 'quote' && (
        <Path
          {...p}
          fill={color}
          d="M5 18c0-4 1.5-7.5 5-10l1 1.2C9.2 11 8.5 12.6 8.5 14H11v4H5zm8 0c0-4 1.5-7.5 5-10l1 1.2c-1.8 1.8-2.5 3.4-2.5 4.8H19v4h-6z"
        />
      )}
    </Svg>
  );
}
