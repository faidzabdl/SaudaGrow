import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="register-umkm" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="umkm-dashboard" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}
