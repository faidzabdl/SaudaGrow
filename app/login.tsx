import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { signInWithEmail, signUpWithEmail } from '../src/services/auth';
import { APP_NAME } from '../src/config';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Sudah punya sesi (termasuk setelah berhasil masuk/daftar): kembali ke layar asal
  // (mis. feed saat menekan like/Pesan sebagai tamu), atau ke Profil bila tidak ada riwayat.
  useEffect(() => {
    if (!session) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }, [session, router]);
  if (session) return null;

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) return setError('Email dan kata sandi wajib diisi.');
    if (mode === 'register' && !name.trim()) return setError('Nama wajib diisi.');
    if (mode === 'register' && password.length < 6) return setError('Kata sandi minimal 6 karakter.');

    setBusy(true);
    if (mode === 'login') {
      const { error: e } = await signInWithEmail(email, password);
      if (e) setError(e);
    } else {
      const { error: e, needsConfirmation } = await signUpWithEmail(email, password, name);
      if (e) setError(e);
      else if (needsConfirmation) {
        setInfo('Pendaftaran berhasil. Buka email Anda untuk konfirmasi, lalu masuk.');
        setMode('login');
      }
    }
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Masuk untuk menyimpan, menyukai, dan memesan.' : 'Buat akun baru, gratis.'}
          </Text>

          <View style={styles.tabs}>
            {(['login', 'register'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.tab, mode === m && styles.tabActive]}
                onPress={() => { setMode(m); setError(null); }}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === 'login' ? 'Masuk' : 'Daftar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Nama"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Kata sandi"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>{mode === 'login' ? 'Masuk' : 'Daftar'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  backBtn: { margin: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, gap: 12 },
  brand: { color: '#FF6B35', fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#2A2A2A' },
  tabText: { color: '#9CA3AF', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  input: { backgroundColor: '#1E1E1E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { color: '#EF4444', fontSize: 13 },
  info: { color: '#10B981', fontSize: 13 },
  submit: { backgroundColor: '#FF6B35', borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
