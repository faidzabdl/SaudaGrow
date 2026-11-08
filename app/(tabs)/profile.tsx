import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { FeatherName, Role } from '../../src/types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../src/context/AuthContext';
import { confirmDialog, notify } from '../../src/lib/dialog';
import { APP_NAME } from '../../src/config';

const ROLE_INFO: Record<Role, { label: string; icon: FeatherName; color: string }> = {
  guest: { label: 'Tamu', icon: 'user', color: '#6B7280' },
  user: { label: 'Pengguna', icon: 'smile', color: '#3B82F6' },
  umkm: { label: 'UMKM', icon: 'briefcase', color: '#FF6B35' },
  admin: { label: 'Admin', icon: 'shield', color: '#8B5CF6' },
};

export default function ProfileScreen() {
  const { savedProducts } = useApp();
  const { session, profile, umkm, role, loading, refresh, signOut } = useAuth();
  const router = useRouter();

  // Peran bisa berubah di server (mis. UMKM disetujui admin), jadi muat ulang setiap layar dibuka.
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const confirmSignOut = async () => {
    const ok = await confirmDialog({
      title: 'Keluar',
      message: 'Anda akan keluar dari akun ini.',
      confirmText: 'Keluar',
      destructive: true,
    });
    if (ok) await signOut();
  };

  if (loading && !session) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  const info = ROLE_INFO[role];
  const email = session?.user.email ?? '';
  const displayName = profile?.display_name || email.split('@')[0] || 'Pengguna';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Profil</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        {!session ? (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Feather name="user" size={36} color="#FF6B35" />
            </View>
            <Text style={styles.name}>Belum masuk</Text>
            <Text style={styles.email}>Masuk untuk menyimpan, menyukai, dan memesan.</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: info.color + '22', borderColor: info.color, marginTop: 14 }]}>
                <Feather name={info.icon} size={14} color={info.color} />
                <Text style={[styles.roleText, { color: info.color }]}>{info.label}</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <Stat icon="bookmark" count={savedProducts.length} label="Tersimpan" />
            </View>

            {(role === 'user' || role === 'umkm' || role === 'admin') && (
              <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Akses</Text>
                {role === 'user' && !umkm && (
                  <MenuItem icon="briefcase" label="Daftar sebagai UMKM" color="#FF6B35" onPress={() => router.push('/register-umkm')} />
                )}
                {role === 'user' && umkm && (
                  <MenuItem
                    icon={umkm.status === 'rejected' ? 'x-circle' : 'clock'}
                    label={umkm.status === 'rejected' ? 'Pendaftaran UMKM ditolak' : 'Pendaftaran UMKM menunggu verifikasi'}
                    color={umkm.status === 'rejected' ? '#EF4444' : '#FBBF24'}
                    onPress={() => router.push('/register-umkm')}
                  />
                )}
                {role === 'umkm' && (
                  <MenuItem icon="briefcase" label="Dashboard UMKM" color="#FF6B35" onPress={() => router.push('/umkm-dashboard')} />
                )}
                {role === 'admin' && (
                  <MenuItem icon="shield" label="Panel Admin" color="#8B5CF6" onPress={() => router.push('/admin')} />
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Lainnya</Text>
          <MenuItem
            icon="info"
            label={`Tentang ${APP_NAME}`}
            onPress={() => notify(`Tentang ${APP_NAME}`, 'Platform discovery UMKM kuliner lewat video pendek. Pesanan dilakukan lewat GoFood, GrabFood, ShopeeFood, atau WhatsApp; aplikasi ini tidak memproses transaksi.')}
          />
          {session && <MenuItem icon="log-out" label="Keluar" color="#EF4444" onPress={confirmSignOut} />}
        </View>

        <Text style={styles.version}>{APP_NAME} v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, count, label }: { icon: FeatherName; count: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={20} color="#FF6B35" />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: FeatherName; label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuIconWrap}>
        <Feather name={icon} size={18} color={color ?? '#9CA3AF'} />
      </View>
      <Text style={[styles.menuLabel, color ? { color } : {}]}>{label}</Text>
      <Feather name="chevron-right" size={16} color="#4B5563" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A' },
  headerInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  content: { paddingBottom: 100 },
  profileCard: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#1A1A1A', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#FF6B35', marginBottom: 12, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FF6B35', fontSize: 36, fontWeight: '800' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  email: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  joinDate: { color: '#6B7280', fontSize: 12, marginTop: 2, marginBottom: 14 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1,
  },
  roleText: { fontSize: 13, fontWeight: '700' },
  stats: {
    flexDirection: 'row', backgroundColor: '#1A1A1A',
    marginBottom: 12, paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statCount: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  menuSection: { backgroundColor: '#1A1A1A', marginBottom: 12, paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingVertical: 10, letterSpacing: 0.8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  menuIconWrap: { width: 34, alignItems: 'flex-start' },
  menuLabel: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '500' },
  version: { textAlign: 'center', color: '#4B5563', fontSize: 12, padding: 20 },
  loginBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  loginBtnText: { color: '#fff', fontWeight: '800' },
});
