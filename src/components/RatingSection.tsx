import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { confirmDialog } from '../lib/dialog';
import { deleteMyRating, fetchMyRating, fetchReviews, hasOrdered, saveRating } from '../services/ratings';
import type { CatalogProduct, MyRating, Review } from '../types';

export const formatRating = (avg: number) => avg.toFixed(1).replace('.', ',');

export function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(i => {
        const icon = <Ionicons name={i <= Math.round(value) ? 'star' : 'star-outline'} size={size} color="#FBBF24" />;
        return onChange ? (
          <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={6} accessibilityLabel={`${i} bintang`}>
            {icon}
          </TouchableOpacity>
        ) : (
          <View key={i}>{icon}</View>
        );
      })}
    </View>
  );
}

// Rating & ulasan di halaman produk. Rating hanya untuk pengguna yang pernah menekan Pesan (dipaksa juga oleh
// policy database). Ulasan tampil anonim. `orderTick` dinaikkan halaman setiap kali Pesan ditekan agar syaratnya
// dicek ulang tanpa membuka ulang halaman.
export function RatingSection({
  product, orderTick, onChanged,
}: { product: CatalogProduct; orderTick: number; onChanged: () => void }) {
  const { session, umkm } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? null;
  const isOwner = !!umkm && umkm.id === product.umkm_id;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [mine, setMine] = useState<MyRating | null>(null);
  const [eligible, setEligible] = useState(false);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rv, my, ok] = await Promise.all([
      fetchReviews(product.id),
      userId ? fetchMyRating(userId, product.id) : Promise.resolve(null),
      userId ? hasOrdered(userId, product.id) : Promise.resolve(false),
    ]);
    setReviews(rv);
    setMine(my);
    setEligible(ok);
    setStars(my?.rating ?? 0);
    setText(my?.review ?? '');
    setLoading(false);
  }, [product.id, userId]);

  // Muat awal / saat produk atau pengguna berganti. setState hanya dipanggil setelah data datang (bukan sinkron).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchReviews(product.id),
      userId ? fetchMyRating(userId, product.id) : Promise.resolve(null),
      userId ? hasOrdered(userId, product.id) : Promise.resolve(false),
    ]).then(([rv, my, ok]) => {
      if (cancelled) return;
      setReviews(rv);
      setMine(my);
      setEligible(ok);
      setStars(my?.rating ?? 0);
      setText(my?.review ?? '');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, userId]);

  // Setelah Pesan ditekan: cek ulang syarat (tanpa menimpa isian yang sedang diketik).
  useEffect(() => {
    if (orderTick > 0 && userId) hasOrdered(userId, product.id).then(setEligible);
  }, [orderTick, userId, product.id]);

  const submit = async () => {
    if (!userId) return;
    if (stars < 1) return setError('Pilih jumlah bintang dulu.');
    setBusy(true);
    setError(null);
    const res = await saveRating(userId, product.id, stars, text, mine !== null);
    setBusy(false);
    if (res.error) return setError(res.error);
    await load();
    onChanged(); // muat ulang katalog agar rata-rata di layar lain ikut berubah
  };

  const remove = async () => {
    if (!userId) return;
    const ok = await confirmDialog({
      title: 'Hapus rating?',
      message: 'Rating dan ulasanmu untuk produk ini akan dihapus.',
      confirmText: 'Hapus',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await deleteMyRating(userId, product.id);
    setBusy(false);
    if (res.error) return setError(res.error);
    await load();
    onChanged();
  };

  return (
    <View>
      <Text style={styles.title}>Rating & Ulasan</Text>

      {product.rating_count > 0 && product.avg_rating !== null ? (
        <View style={styles.summary}>
          <Text style={styles.avg}>{formatRating(product.avg_rating)}</Text>
          <View>
            <Stars value={product.avg_rating} size={18} />
            <Text style={styles.count}>{product.rating_count} rating</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.muted}>Belum ada rating untuk produk ini.</Text>
      )}

      {/* Formulir sesuai keadaan pengguna */}
      <View style={styles.box}>
        {!session ? (
          <>
            <Text style={styles.muted}>Masuk untuk memberi rating setelah memesan.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
              <Text style={styles.btnText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </>
        ) : isOwner ? (
          <Text style={styles.muted}>Pemilik UMKM tidak dapat menilai produknya sendiri.</Text>
        ) : !eligible && !mine ? (
          <Text style={styles.muted}>
            Rating bisa diberikan setelah kamu menekan Pesan pada produk ini. (Ini bukan bukti pembelian; aplikasi
            tidak memproses transaksi.)
          </Text>
        ) : (
          <>
            <Text style={styles.boxTitle}>{mine ? 'Ratingmu' : 'Beri rating'}</Text>
            <Stars value={stars} size={30} onChange={setStars} />
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Tulis ulasan (opsional, maks. 500 karakter)"
              placeholderTextColor="#6B7280"
              multiline
              maxLength={500}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mine ? 'Perbarui' : 'Kirim'}</Text>}
              </TouchableOpacity>
              {mine && (
                <TouchableOpacity style={styles.btnGhost} onPress={remove} disabled={busy}>
                  <Text style={styles.btnGhostText}>Hapus</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* Daftar ulasan (anonim) */}
      {loading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 12 }} />}
      {!loading && reviews.length === 0 && product.rating_count > 0 && (
        <Text style={styles.muted}>Belum ada ulasan tertulis.</Text>
      )}
      {reviews.map((r, i) => (
        <View key={`${r.created_at}-${i}`} style={styles.review}>
          <View style={styles.reviewTop}>
            <Stars value={r.rating} size={13} />
            <Text style={styles.reviewMeta}>
              {r.is_mine ? 'Ulasan Anda' : 'Pembeli'} ·{' '}
              {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.reviewText}>{r.review}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 2 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avg: { color: '#fff', fontSize: 34, fontWeight: '800' },
  count: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  muted: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },
  box: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, gap: 10, marginTop: 6 },
  boxTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: '700' },
  input: { backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', color: '#fff', padding: 12, minHeight: 70, textAlignVertical: 'top', fontSize: 14 },
  error: { color: '#EF4444', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, alignItems: 'center', minWidth: 90 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: '#EF4444', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  btnGhostText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  review: { borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingVertical: 12, gap: 6 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewMeta: { color: '#6B7280', fontSize: 11 },
  reviewText: { color: '#D1D5DB', fontSize: 13, lineHeight: 19 },
});
