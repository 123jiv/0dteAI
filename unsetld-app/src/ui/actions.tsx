// Action sheets and simple dialogs. iOS uses the native ActionSheetIOS and
// Alert; the browser preview draws the same thing itself (react-native-web has
// neither).
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { T } from './text';
import { color as C, font, hairline, MARGIN } from './tokens';

export interface ActionOption {
  label: string;
  onPress?: () => void;
  /** Kept for callers, but never drawn red: red means today on the record and nowhere else. */
  destructive?: boolean;
  cancel?: boolean;
}

interface Pending {
  kind: 'sheet' | 'dialog';
  title?: string;
  message?: string;
  options: ActionOption[];
}

const useActions = create<{ pending: Pending | null; set: (p: Pending | null) => void }>(set => ({
  pending: null,
  set: p => set({ pending: p }),
}));

/** An action sheet. Include a `cancel` option last. */
export function showActions(opts: { title?: string; message?: string; options: ActionOption[] }) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: opts.title,
        message: opts.message,
        options: opts.options.map(o => o.label),
        cancelButtonIndex: opts.options.findIndex(o => o.cancel),
        userInterfaceStyle: 'dark',
      },
      i => opts.options[i]?.onPress?.(),
    );
    return;
  }
  useActions.getState().set({ kind: 'sheet', ...opts });
}

/** A short dialog with one or two buttons. */
export function showDialog(title: string, message?: string, options: ActionOption[] = [{ label: 'OK', cancel: true }]) {
  if (Platform.OS !== 'web') {
    Alert.alert(
      title,
      message,
      options.map(o => ({ text: o.label, onPress: o.onPress, style: o.cancel ? 'cancel' : 'default' })),
      { userInterfaceStyle: 'dark' },
    );
    return;
  }
  useActions.getState().set({ kind: 'dialog', title, message, options });
}

/** Mounted once at the app root; only draws anything in the browser preview. */
export function ActionHost() {
  const pending = useActions(s => s.pending);
  const set = useActions(s => s.set);
  const insets = useSafeAreaInsets();
  const shown = pending;
  if (!shown) return null;
  const pick = (o?: ActionOption) => {
    set(null);
    o?.onPress?.();
  };
  const cancel = shown.options.find(o => o.cancel);
  const rest = shown.options.filter(o => !o.cancel);

  if (shown.kind === 'dialog') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: MARGIN }]}>
        <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 300, backgroundColor: '#1C1B19', borderRadius: 14, overflow: 'hidden' }}>
          <View style={{ padding: 20, gap: 6 }}>
            <T v="row" align="center" style={{ fontFamily: font.sansSemi }}>
              {shown.title ?? ''}
            </T>
            {shown.message ? (
              <T v="note" color={C.muted} align="center">
                {shown.message}
              </T>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: hairline, borderTopColor: C.ruleStrong }}>
            {shown.options.map((o, i) => (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                onPress={() => pick(o)}
                style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? hairline : 0, borderLeftColor: C.ruleStrong }}>
                <T v="row" color={C.bone} style={{ fontFamily: o.cancel ? font.sansSemi : font.sans }}>
                  {o.label}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={() => pick(cancel)} accessibilityLabel="Cancel" />
      <View style={{ position: 'absolute', left: 8, right: 8, bottom: insets.bottom + 8, gap: 8 }}>
        <View style={{ backgroundColor: '#1C1B19', borderRadius: 14, overflow: 'hidden' }}>
          {shown.title || shown.message ? (
            <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: hairline, borderBottomColor: C.ruleStrong, gap: 2 }}>
              {shown.title ? (
                <T v="note" color={C.stone} align="center" style={{ fontFamily: font.sansSemi }}>
                  {shown.title}
                </T>
              ) : null}
              {shown.message ? (
                <T v="note" color={C.stone} align="center">
                  {shown.message}
                </T>
              ) : null}
            </View>
          ) : null}
          {rest.map((o, i) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              onPress={() => pick(o)}
              style={({ pressed }) => ({
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderTopWidth: i ? hairline : 0,
                borderTopColor: C.ruleStrong,
                backgroundColor: pressed ? '#262522' : 'transparent',
              })}>
              <T v="row" color={C.bone} style={{ fontFamily: font.sans, fontSize: 18 }}>
                {o.label}
              </T>
            </Pressable>
          ))}
        </View>
        {cancel ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => pick(cancel)}
            style={({ pressed }) => ({ height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#262522' : '#1C1B19' })}>
            <T v="row" style={{ fontFamily: font.sansSemi, fontSize: 18 }}>
              {cancel.label}
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
