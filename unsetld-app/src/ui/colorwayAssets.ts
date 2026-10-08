// Colorway plates from scripts/gen_colorways.py. Metro needs static requires.
import type { ImageSourcePropType } from 'react-native';

/** Full-screen reader plates (1290×2796). Solid and gradient colorways draw themselves. */
export const PLATES: Record<string, ImageSourcePropType> = {
  bone: require('../../assets/colorways/bone.jpg'),
  'snow-wash': require('../../assets/colorways/snow-wash.jpg'),
  'sun-fade': require('../../assets/colorways/sun-fade.jpg'),
  concrete: require('../../assets/colorways/concrete.jpg'),
  charcoal: require('../../assets/colorways/charcoal.jpg'),
  midnight: require('../../assets/colorways/midnight.jpg'),
};

/** 9:16 swatches (324×576) for the colorway sheet and share-sheet squares. */
export const SWATCHES: Record<string, ImageSourcePropType> = {
  black: require('../../assets/colorways/black-swatch.jpg'),
  bone: require('../../assets/colorways/bone-swatch.jpg'),
  'snow-wash': require('../../assets/colorways/snow-wash-swatch.jpg'),
  'sun-fade': require('../../assets/colorways/sun-fade-swatch.jpg'),
  concrete: require('../../assets/colorways/concrete-swatch.jpg'),
  charcoal: require('../../assets/colorways/charcoal-swatch.jpg'),
  plum: require('../../assets/colorways/plum-swatch.jpg'),
  coffee: require('../../assets/colorways/coffee-swatch.jpg'),
  olive: require('../../assets/colorways/olive-swatch.jpg'),
  midnight: require('../../assets/colorways/midnight-swatch.jpg'),
};
