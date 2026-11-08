import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Variabel env Supabase belum diisi. Salin .env.example menjadi .env lalu isi ' +
      'EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, lalu restart Expo.'
  );
}

// Hanya kunci publik (publishable / anon) yang boleh dipakai di aplikasi.
// Kunci secret / service_role TIDAK BOLEH ada di sini.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh token hanya berjalan saat aplikasi aktif (sesuai panduan Supabase untuk React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
