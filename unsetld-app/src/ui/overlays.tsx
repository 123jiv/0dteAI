import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/store';
import { fonts, radius, space, useTheme } from './theme';

export function ToastHost() {
  const toasts = useApp(s => s.toasts);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'center', gap: 6 }}>
      {toasts.map(t => (
        <View
          key={t.id}
          style={{
            backgroundColor: t.kind === 'xp' ? theme.accent : t.kind === 'warn' ? '#2a1414' : theme.surface,
            borderColor: t.kind === 'warn' ? '#5a2020' : theme.border,
            borderWidth: t.kind === 'xp' ? 0 : 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: radius.pill,
            maxWidth: 420,
          }}>
          <Text
            style={{
              color: t.kind === 'xp' ? theme.onAccent : theme.text,
              fontFamily: fonts.sansSemi,
              fontSize: 14,
              textAlign: 'center',
            }}>
            {t.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
        />
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.lg + 6,
            borderTopRightRadius: radius.lg + 6,
            borderWidth: 1,
            borderColor: theme.border,
            padding: space.xl,
            paddingBottom: insets.bottom + space.xl,
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
          }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: space.lg }} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
