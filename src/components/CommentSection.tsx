import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COMMENT_MAX_CHARS } from '../config';
import { confirmDialog, notify } from '../lib/dialog';
import { timeAgo } from '../lib/timeAgo';
import { addComment, deleteComment, fetchComments } from '../services/comments';
import type { CatalogProduct, ProductComment } from '../types';

// Komentar (B2). Dua percakapan yang berbeda memakai komponen ini:
//  - tanpa `videoId`: komentar PRODUK (tab Komentar di halaman produk), pertanyaan seputar produknya;
//  - dengan `videoId`: komentar VIDEO (panel di feed Home), tanggapan atas satu video. Satu produk bisa punya
//    beberapa video, dan tiap video punya komentarnya sendiri.
// Membaca terbuka untuk semua; menulis wajib login. Aturan sebenarnya (atas nama sendiri, hanya produk UMKM approved,
// video harus milik produknya, batas 5 komentar per menit, siapa boleh menghapus) dijaga policy dan trigger di
// database; UI ini hanya menampilkan dan memberi petunjuk.
export function CommentSection({
  product, videoId, onChanged,
}: { product: CatalogProduct; videoId?: string; onChanged: () => void }) {
  const { session, profile, umkm, role } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? null;
  // Pemilik UMKM (approved) dan admin boleh menghapus komentar di produknya; RLS yang memutuskan.
  const canModerate = role === 'admin' || (!!umkm && umkm.id === product.umkm_id && umkm.status === 'approved');

  const isVideo = !!videoId;
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchComments({ productId: product.id, videoId });
    setComments(res.data);
    setLoadError(res.error);
    setLoading(false);
  }, [product.id, videoId]);

  // Muat awal / saat produk atau video berganti. setState hanya dipanggil setelah data datang (bukan sinkron).
  useEffect(() => {
    let cancelled = false;
    fetchComments({ productId: product.id, videoId }).then(res => {
      if (cancelled) return;
      setComments(res.data);
      setLoadError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, videoId]);

  const submit = async () => {
    if (!userId) return;
    setBusy(true);
    setFormError(null);
    const res = await addComment(userId, { productId: product.id, videoId }, text);
    setBusy(false);
    if (res.error) return setFormError(res.error);
    setText('');
    await load();
    onChanged(); // muat ulang katalog/feed agar jumlah komentar di layar lain ikut berubah
  };

  const remove = async (c: ProductComment) => {
    const ok = await confirmDialog({
      title: 'Hapus komentar?',
      message: c.body.length > 80 ? `${c.body.slice(0, 80)}…` : c.body,
      confirmText: 'Hapus',
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteComment(c.id);
    if (res.error) return notify('Gagal menghapus komentar', res.error);
    await load();
    onChanged();
  };

  const myName = profile?.display_name?.trim() || 'akunmu';
  const empty = text.trim() === '';

  return (
    <View>
      <Text style={styles.title}>
        {isVideo ? 'Komentar video' : 'Komentar produk'}{comments.length > 0 ? ` (${comments.length})` : ''}
      </Text>
      <Text style={styles.scopeNote}>
        {isVideo
          ? 'Tanggapan untuk video ini saja. Pertanyaan soal produknya ada di komentar produk.'
          : 'Pertanyaan dan cerita seputar produk ini. Komentar untuk tiap video ada di video itu sendiri.'}
      </Text>

      <View style={styles.box}>
        {!session ? (
          <>
            <Text style={styles.muted}>Masuk untuk menulis komentar.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
              <Text style={styles.btnText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={isVideo ? 'Tulis komentar tentang video ini' : 'Tanyakan atau ceritakan sesuatu tentang produk ini'}
              placeholderTextColor="#6B7280"
              multiline
              maxLength={COMMENT_MAX_CHARS}
            />
            <Text style={styles.hint}>Tampil dengan nama: {myName}</Text>
            {formError && <Text style={styles.error}>{formError}</Text>}
            <View style={styles.actions}>
              <Text style={styles.counter}>{text.length}/{COMMENT_MAX_CHARS}</Text>
              <TouchableOpacity
                style={[styles.btn, (busy || empty) && { opacity: 0.5 }]}
                onPress={submit}
                disabled={busy || empty}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Kirim</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {loading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 12 }} />}
      {!loading && loadError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Komentar belum bisa dimuat.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !loadError && comments.length === 0 && (
        <Text style={[styles.muted, { marginTop: 12 }]}>
          {isVideo ? 'Belum ada komentar untuk video ini.' : 'Belum ada komentar. Tanyakan sesuatu tentang produk ini.'}
        </Text>
      )}
      {comments.map(c => (
        <View key={c.id} style={styles.item}>
          <View style={styles.itemHead}>
            <Text style={styles.author}>{c.author_name}</Text>
            {c.is_owner && <Text style={styles.ownerTag}>Pemilik</Text>}
            {c.is_mine && !c.is_owner && <Text style={styles.mineTag}>Kamu</Text>}
            <Text style={styles.time}>{timeAgo(c.created_at)}</Text>
            {(c.is_mine || canModerate) && (
              <TouchableOpacity onPress={() => remove(c)} hitSlop={8} accessibilityLabel="Hapus komentar" style={styles.trash}>
                <Feather name="trash-2" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.body}>{c.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  scopeNote: { color: '#6B7280', fontSize: 11, lineHeight: 16, marginBottom: 10 },
  muted: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },
  box: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, gap: 10 },
  input: { backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', color: '#fff', padding: 12, minHeight: 70, textAlignVertical: 'top', fontSize: 14 },
  hint: { color: '#9CA3AF', fontSize: 11 },
  error: { color: '#EF4444', fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { color: '#6B7280', fontSize: 11 },
  btn: { backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, alignItems: 'center', minWidth: 90 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3B1F1F', borderRadius: 10, padding: 12, marginTop: 12 },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  retryText: { color: '#FF6B35', fontSize: 13, fontWeight: '700' },
  item: { borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingVertical: 12, gap: 4 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  author: { color: '#fff', fontSize: 13, fontWeight: '700' },
  time: { color: '#6B7280', fontSize: 11 },
  body: { color: '#D1D5DB', fontSize: 13, lineHeight: 19 },
  ownerTag: { color: '#FF8C42', fontSize: 10, fontWeight: '700', backgroundColor: '#FF6B3522', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  mineTag: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', backgroundColor: '#2A2A2A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  trash: { marginLeft: 'auto' },
});
