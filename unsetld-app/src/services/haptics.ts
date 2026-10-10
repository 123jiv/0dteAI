import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// The spec's haptics, and no others.
const on = Platform.OS === 'ios';

/** A proof accepted (the Mission screen's done stage). */
export function success() {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Day recorded; a perfect day. */
export function soft() {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

/** Save, copy. */
export function light() {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Squares, segmented controls, plan rows. */
export function selection() {
  if (on) Haptics.selectionAsync().catch(() => {});
}

/** Held. */
export function medium() {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Tapping a 4th standard rule. */
export function warning() {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
