import { createContext, useContext, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { ThemeDef } from '../content';

// Brand tokens from unsetld.com: near-black, white, red accent,
// Cormorant Garamond for lines, Inter for UI.
export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifMedium: 'CormorantGaramond_500Medium',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const textures: Record<string, { source: ImageSourcePropType; repeat: boolean; opacity: number }> = {
  grain: { source: require('../../assets/textures/grain.png'), repeat: true, opacity: 0.35 },
  'heavy-grain': { source: require('../../assets/textures/heavy-grain.png'), repeat: true, opacity: 0.55 },
  marble: { source: require('../../assets/textures/marble.png'), repeat: false, opacity: 0.9 },
  carbon: { source: require('../../assets/textures/carbon.png'), repeat: true, opacity: 0.8 },
  brushed: { source: require('../../assets/textures/brushed.png'), repeat: true, opacity: 0.35 },
};

export interface Theme extends ThemeDef {
  danger: string;
  success: string;
  onAccent: string;
}

export function toTheme(def: ThemeDef): Theme {
  const light = isLight(def.accent);
  return { ...def, danger: '#e5484d', success: '#3fb950', onAccent: light ? '#0a0a0a' : '#ffffff' };
}

function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('ThemeProvider missing');
  return t;
}
