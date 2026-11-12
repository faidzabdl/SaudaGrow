import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RequireRole } from '../src/components/RequireRole';
import { ProductForm } from '../src/components/ProductForm';
import { RemoteImage } from '../src/components/RemoteImage';
import { formatRating } from '../src/components/RatingSection';
import { useAuth } from '../src/context/AuthContext';
import { useApp } from '../context/AppContext';
import { confirmDialog, notify } from '../src/lib/dialog';
import {
  PLATFORMS, addVideoRow, deleteProduct, deleteVideo, emptyStats, fetchMyProducts,
  removeVideoFiles, setProductActive,
} from '../src/services/manage';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SEC, uploadVideo } from '../src/services/storage';
import type { DashboardStats, FeatherName, ManagedProduct } from '../src/types';

export default function UmkmDashboardScreen() {
  return (
    <RequireRole allow={['umkm']}>
      <DashboardContent />
    </RequireRole>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { session, umkm } = useAuth();
  const { reload: reloadCatalog } = useApp(); // agar Home/Cari ikut menampilkan perubahan
  const userId = session?.user.id ?? '';

  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedProduct | null>(null);

  const load = useCallback(async () => {
    if (!umkm) return;
    const res = await fetchMyProducts(umkm.id);
    setProducts(res.data);
    setStats(res.stats);
    setError(res.error);
  }, [umkm]);

  const syncAll = useCallback(async () => {
    await load();
    await reloadCatalog();
  }, [load, reloadCatalog]);

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

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: ManagedProduct) => { setEditing(p); setFormOpen(true); };

  const toggleActive = async (p: ManagedProduct, value: boolean) => {
    setBusyId(p.id);
    const res = await setProductActive(p.id, value);
    if (res.error) notify('Gagal mengubah status', res.error);
    await syncAll();
    setBusyId(null);
  };

  const removeProduct = async (p: ManagedProduct) => {
    const ok = await confirmDialog({
      title: 'Hapus produk?',
      message: `"${p.name}" beserta ${p.videos.length} video dan link pemesanannya akan dihapus permanen.`,
      confirmText: 'Hapus',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(p.id);
    const res = await deleteProduct(p);
    if (res.error) notify('Gagal menghapus produk', res.error);
    await syncAll();
    setBusyId(null);
  };

  const addVideo = async (p: ManagedProduct) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false });
    if (res.canceled) return;
    const a = res.assets[0];

    const mime = a.mimeType ?? 'video/mp4';
    if (mime !== 'video/mp4' && mime !== 'video/quicktime') {
      return notify('Format tidak didukung', 'Gunakan video MP4 atau MOV.');
    }
    const sec = a.duration != null ? Math.max(1, Math.ceil(a.duration / 1000)) : null;
    if (sec != null && sec > MAX_VIDEO_SEC) {
      return notify('Video terlalu panjang', `Maksimal ${MAX_VIDEO_SEC} detik. Video ini ${sec} detik.`);
    }
    if (a.fileSize != null && a.fileSize > MAX_VIDEO_BYTES) {
      return notify('Ukuran terlalu besar', `Maksimal ${MAX_VIDEO_BYTES / 1024 / 1024} MB. Kompres atau pilih video yang lebih pendek.`);
    }

    setUploadingId(p.id);
    const up = await uploadVideo(userId, a.uri, mime);
    if (!up.path) {
      setUploadingId(null);
      return notify('Gagal mengunggah video', up.error ?? 'Coba lagi.');
    }
    const row = await addVideoRow(p.id, up.path, sec);
    if (row.error) {
      await removeVideoFiles([up.path]); // jangan tinggalkan file yatim di Storage
      notify('Gagal menyimpan video', row.error);
    }
    await syncAll();
    setUploadingId(null);
  };

  const removeVideo = async (p: ManagedProduct, index: number) => {
    const v = p.videos[index];
    const ok = await confirmDialog({
      title: 'Hapus video?',
      message: `Video ${index + 1} dari "${p.name}" akan dihapus permanen.`,
      confirmText: 'Hapus',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(p.id);
    const res = await deleteVideo(v);
    if (res.error) notify('Gagal menghapus video', res.error);
    await syncAll();
    setBusyId(null);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{umkm?.name ?? 'Dashboard UMKM'}</Text>
            <Text style={styles.subtitle}>Kelola produk, video, dan lihat statistik</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <View style={styles.statsRow}>
          <Stat icon="package" label="Produk" value={stats.products} />
          <Stat icon="film" label="Video" value={stats.videos} />
          <Stat icon="heart" label="Suka" value={stats.likes} />
          <Stat icon="bookmark" label="Disimpan" value={stats.saves} />
          <Stat icon="shopping-bag" label="Klik Pesan" value={stats.orders} />
        </View>

        <View style={styles.platformCard}>
          <Text style={styles.platformTitle}>Klik Pesan per platform</Text>
          <View style={styles.platformRow}>
            {PLATFORMS.map(p => (
              <View key={p.key} style={styles.platformItem}>
                <Text style={styles.platformValue}>{stats.byPlatform[p.key]}</Text>
                <Text style={styles.platformLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Produk Saya</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Produk</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Gagal memuat data: {error}</Text>
          </View>
        )}
        {loading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 16 }} />}
        {!loading && products.length === 0 && !error && (
          <View style={styles.empty}>
            <Feather name="package" size={44} color="#374151" />
            <Text style={styles.emptyText}>Belum ada produk</Text>
            <Text style={styles.emptyHint}>Tambahkan produk pertama, lalu unggah videonya agar muncul di Home.</Text>
          </View>
        )}

        {products.map(p => (
          <View key={p.id} style={[styles.card, !p.is_active && { opacity: 0.7 }]}>
            <View style={styles.cardTop}>
              <RemoteImage uri={p.image_url} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.cardPrice}>Rp {p.price.toLocaleString('id-ID')}</Text>
                <Text style={styles.cardMeta}>
                  ♥ {p.videos.reduce((n, v) => n + v.like_count, 0)}  ·  ⚑ {p.save_count}  ·  🛒 {p.order_count}
                  {p.avg_rating !== null && p.rating_count > 0 ? `  ·  ★ ${formatRating(p.avg_rating)} (${p.rating_count})` : ''}
                </Text>
              </View>
              {busyId === p.id ? (
                <ActivityIndicator color="#FF6B35" />
              ) : (
                <Switch
                  value={p.is_active}
                  onValueChange={v => toggleActive(p, v)}
                  trackColor={{ true: '#FF6B35', false: '#374151' }}
                />
              )}
            </View>
            {!p.is_active && <Text style={styles.hiddenNote}>Disembunyikan dari aplikasi</Text>}
            {p.order_links.length === 0 && <Text style={styles.warnNote}>Belum ada link pemesanan</Text>}

            {/* Video */}
            <View style={styles.videoBlock}>
              <Text style={styles.videoTitle}>Video ({p.videos.length})</Text>
              {p.videos.map((v, i) => (
                <View key={v.id} style={styles.videoRow}>
                  <Feather name="film" size={14} color="#9CA3AF" />
                  <Text style={styles.videoText}>
                    Video {i + 1}{v.duration_sec ? ` · ${v.duration_sec} dtk` : ''} · ♥ {v.like_count}
                  </Text>
                  <TouchableOpacity onPress={() => removeVideo(p, i)} hitSlop={8}>
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {uploadingId === p.id ? (
                <View style={styles.uploading}>
                  <ActivityIndicator color="#FF6B35" />
                  <Text style={styles.uploadingText}>Mengunggah video… jangan tutup aplikasi.</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.videoAdd} onPress={() => addVideo(p)} disabled={uploadingId !== null}>
                  <Feather name="upload" size={14} color="#FF6B35" />
                  <Text style={styles.videoAddText}>Tambah video (maks. {MAX_VIDEO_SEC} dtk)</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(p)}>
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={styles.editBtnText}>Ubah</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeProduct(p)}>
                <Feather name="trash-2" size={14} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {umkm && (
        <ProductForm
          visible={formOpen}
          product={editing}
          umkmId={umkm.id}
          userId={userId}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            syncAll();
          }}
        />
      )}
    </View>
  );
}

function Stat({ icon, label, value }: { icon: FeatherName; label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={16} color="#FF6B35" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A', paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 2 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#9CA3AF', fontSize: 10 },
  platformCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  platformTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  platformRow: { flexDirection: 'row' },
  platformItem: { flex: 1, alignItems: 'center' },
  platformValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  platformLabel: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  errorBox: { padding: 10, borderRadius: 10, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: '#E5E7EB', fontWeight: '700' },
  emptyHint: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  card: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardPrice: { color: '#FF8C42', fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  hiddenNote: { color: '#FBBF24', fontSize: 12 },
  warnNote: { color: '#FBBF24', fontSize: 12 },
  videoBlock: { backgroundColor: '#111', borderRadius: 10, padding: 10, gap: 8 },
  videoTitle: { color: '#E5E7EB', fontSize: 13, fontWeight: '700' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  videoText: { flex: 1, color: '#9CA3AF', fontSize: 12 },
  videoAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FF6B35', backgroundColor: '#FF6B3522' },
  videoAddText: { color: '#FF6B35', fontWeight: '700', fontSize: 12 },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  uploadingText: { color: '#9CA3AF', fontSize: 12, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2A2A2A', paddingVertical: 10, borderRadius: 10 },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#EF4444', paddingVertical: 10, borderRadius: 10 },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
});
