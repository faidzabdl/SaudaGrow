import React, { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

// Pembatas layar: hanya peran di `allow` yang melihat isinya.
// Pembatasan sebenarnya tetap di database (RLS); ini hanya UX agar layar tidak terbuka sia-sia.
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  if (!allow.includes(role)) {
    return (
      <View style={styles.center}>
        <Feather name="lock" size={44} color="#FF6B35" />
        <Text style={styles.title}>{role === 'guest' ? 'Masuk dulu' : 'Akses ditolak'}</Text>
        <Text style={styles.desc}>
          {role === 'guest'
            ? 'Halaman ini membutuhkan akun.'
            : 'Akun Anda tidak memiliki izin untuk membuka halaman ini.'}
        </Text>
        {role === 'guest' && (
          <TouchableOpacity style={styles.primary} onPress={() => router.replace('/login')}>
            <Text style={styles.primaryText}>Masuk / Daftar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  desc: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  primary: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { paddingHorizontal: 24, paddingVertical: 10 },
  secondaryText: { color: '#9CA3AF', fontWeight: '600' },
});
