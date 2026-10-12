// The width a block really has. The browser preview draws the app inside a phone-sized frame,
// where the window's width is the browser's, so grids size themselves from their own layout.
import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

/** The widest a phone gets, for the first frame before the block is measured. */
const PHONE = 430;

/**
 * The laid-out width of the view `onLayout` is attached to. Until it's measured: the window's
 * width (no wider than a phone) less `inset` (the side margins, when the view sits inside them).
 */
export function useLayoutWidth(inset = 0): [number, (e: LayoutChangeEvent) => void] {
  const { width } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setMeasured(prev => (prev === w ? prev : w));
  }, []);
  return [measured ?? Math.min(width, PHONE) - inset, onLayout];
}
