import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { FeatherName, Umkm, UmkmStatus } from '../src/types';
import { confirmDialog, notify } from '../src/lib/dialog';
import { RequireRole } from '../src/components/RequireRole';
import { fetchAllUmkm, setUmkmStatus } from '../src/services/umkm';

type Filter = 'all' | UmkmStatus;

export default function AdminScreen() {
  return (
    <RequireRole allow={['admin']}>
      <AdminContent />
    </RequireRole>
  );
}

function AdminContent() {
  const router = useRouter();
  const [items, setItems] = useState<Umkm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    const res = await fetchAllUmkm();
    setItems(res.data);
    setError(res.error);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const counts = {
    all: items.length,
    pending: items.filter(s => s.status === 'pending').length,
    approved: items.filter(s => s.status === 'approved').length,
    rejected: items.filter(s => s.status === 'rejected').length,
  };
  const filtered = items.filter(s => activeFilter === 'all' || s.status === activeFilter);

  const updateStatus = async (u: Umkm, status: UmkmStatus) => {
    const approve = status === 'approved';
    const ok = await confirmDialog({
      title: 'Konfirmasi',
      message: `${u.name} akan ${approve ? 'disetujui' : 'ditolak'}?`,
      confirmText: approve ? 'Setujui' : 'Tolak',
      destructive: !approve,
    });
    if (!ok) return;
    setBusyId(u.id);
    const res = await setUmkmStatus(u.id, status);
    if (res.error) notify('Gagal mengubah status', res.error);
    else await load();
    setBusyId(null);
  };

  const FILTERS: { label: string; value: Filter; color: string }[] = [
    { label: `Semua (${counts.all})`, value: 'all', color: '#9CA3AF' },
    { label: `Pending (${counts.pending})`, value: 'pending', color: '#FBBF24' },
    { label: `Disetujui (${counts.approved})`, value: 'approved', color: '#10B981' },
    { label: `Ditolak (${counts.rejected})`, value: 'rejected', color: '#EF4444' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Panel Admin</Text>
            <Text style={styles.subtitle}>Manajemen Verifikasi UMKM</Text>
          </View>
          <View style={styles.adminBadge}>
            <Feather name="shield" size={14} color="#8B5CF6" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.statsRow}>
        <AdminStat icon="clock" color="#FBBF24" label="Pending" value={counts.pending} />
        <AdminStat icon="check-circle" color="#10B981" label="Disetujui" value={counts.approved} />
        <AdminStat icon="x-circle" color="#EF4444" label="Ditolak" value={counts.rejected} />
        <AdminStat icon="users" color="#3B82F6" label="Total" value={counts.all} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && { backgroundColor: f.color + '22', borderColor: f.color }]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[styles.filterText, activeFilter === f.value && { color: f.color, fontWeight: '700' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Gagal memuat data: {error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        {loading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 24 }} />}
        {!loading && filtered.length === 0 && !error && <Text style={styles.emptyText}>Belum ada UMKM di kategori ini.</Text>}

        {filtered.map(u => (
          <UmkmCard key={u.id} umkm={u} busy={busyId === u.id} onChange={status => updateStatus(u, status)} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function UmkmCard({ umkm, busy, onChange }: { umkm: Umkm; busy: boolean; onChange: (s: UmkmStatus) => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const date = new Date(umkm.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const place = [umkm.address, umkm.city].filter(Boolean).join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {logoFailed ? (
          <View style={[styles.avatar, styles.logoFallback]}>
            <Text style={styles.logoFallbackText}>{umkm.name.charAt(0)}</Text>
          </View>
        ) : (
          <Image source={{ uri: umkm.logo_url }} style={styles.avatar} onError={() => setLogoFailed(true)} />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.umkmName}>{umkm.name}</Text>
            <StatusBadge status={umkm.status} />
          </View>
          <Text style={styles.owner}>Pemilik: {umkm.owner_name}</Text>
          <Text style={styles.category}>Kontak: {umkm.contact}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={12} color="#FF8C42" />
          <Text style={styles.metaText}>{place}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="navigation" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{umkm.lat.toFixed(5)}, {umkm.lng.toFixed(5)}</Text>
        </View>
        {umkm.legal_id ? (
          <View style={styles.metaItem}>
            <Feather name="file-text" size={12} color="#9CA3AF" />
            <Text style={styles.metaText}>Legalitas: {umkm.legal_id}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>Daftar: {date}</Text>
        </View>
      </View>

      {busy ? (
        <ActivityIndicator color="#FF6B35" />
      ) : (
        <>
          {umkm.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => onChange('rejected')}>
                <Feather name="x" size={14} color="#EF4444" />
                <Text style={styles.rejectBtnText}>Tolak</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => onChange('approved')}>
                <Feather name="check" size={14} color="#fff" />
                <Text style={styles.approveBtnText}>Setujui</Text>
              </TouchableOpacity>
            </View>
          )}
          {umkm.status === 'approved' && (
            <TouchableOpacity style={styles.revokeBtn} onPress={() => onChange('rejected')}>
              <Feather name="x-circle" size={14} color="#EF4444" />
              <Text style={styles.revokeBtnText}>Cabut Persetujuan</Text>
            </TouchableOpacity>
          )}
          {umkm.status === 'rejected' && (
            <TouchableOpacity style={styles.restoreBtn} onPress={() => onChange('approved')}>
              <Feather name="refresh-cw" size={14} color="#10B981" />
              <Text style={styles.restoreBtnText}>Pulihkan & Setujui</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: UmkmStatus }) {
  const map: Record<UmkmStatus, { color: string; bg: string; label: string; icon: FeatherName }> = {
    pending: { color: '#FBBF24', bg: '#FBBF2422', label: 'Pending', icon: 'clock' },
    approved: { color: '#10B981', bg: '#10B98122', label: 'Disetujui', icon: 'check-circle' },
    rejected: { color: '#EF4444', bg: '#EF444422', label: 'Ditolak', icon: 'x-circle' },
  };
  const { color, bg, label, icon } = map[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Feather name={icon} size={11} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function AdminStat({ icon, color, label, value }: { icon: FeatherName; color: string; label: string; value: number }) {
  return (
    <View style={[styles.adminStat, { borderColor: color + '44' }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.adminStatValue}>{value}</Text>
      <Text style={styles.adminStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A', paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF622', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#8B5CF6' },
  adminBadgeText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  adminStat: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  adminStatValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  adminStatLabel: { color: '#9CA3AF', fontSize: 10, marginTop: 2 },
  filterScroll: { marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#374151' },
  filterText: { color: '#9CA3AF', fontSize: 12 },
  list: { padding: 16 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#2A2A2A' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  umkmName: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  owner: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  category: { color: '#9CA3AF', fontSize: 12 },
  cardMeta: { backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, marginBottom: 10, gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#D1D5DB', fontSize: 12 },
  desc: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#10B981' },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF4444' },
  revokeBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10B98122', borderWidth: 1, borderColor: '#10B981' },
  restoreBtnText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  logoFallback: { backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: '#FF6B35', fontWeight: '800', fontSize: 18 },
  errorBox: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
});
