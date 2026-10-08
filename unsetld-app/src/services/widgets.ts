import type { WidgetInput } from './widgets.types';

// Widgets are iOS-only (see widgets.ios.ts). Web preview and Android no-op.
export const widgetsAvailable = () => false;

export function updateWidgets(_input: WidgetInput) {}

export async function prepareWidgetAssets() {}
