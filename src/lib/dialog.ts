import { Alert, Platform } from 'react-native';

// Alert.alert dari React Native TIDAK melakukan apa-apa di web (tombol tampak "mati").
// Dua fungsi ini memakai dialog bawaan browser di web dan Alert di Android/iOS.
type WebDialogs = { alert?: (m: string) => void; confirm?: (m: string) => boolean };
const web = globalThis as unknown as WebDialogs;

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    web.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  const { title, message, confirmText = 'Ya', destructive = false } = opts;
  if (Platform.OS === 'web') {
    return Promise.resolve(web.confirm?.(message ? `${title}\n\n${message}` : title) ?? false);
  }
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
