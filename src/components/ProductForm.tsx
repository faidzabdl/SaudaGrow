import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Switch,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RemoteImage } from './RemoteImage';
import { uploadImage } from '../services/storage';
import { PLATFORMS, createProduct, normalizeLink, updateProduct } from '../services/manage';
import type { ManagedProduct, OrderPlatform, ProductInput } from '../types';

const CATEGORY_HINTS = ['Nasi & Lauk', 'Bakso & Mie', 'Camilan', 'Minuman', 'Dessert'];

interface Photo { uri: string; base64: string; mimeType: string | null | undefined }
type LinkState = Record<OrderPlatform, string>;
const EMPTY_LINKS: LinkState = { gofood: '', grabfood: '', shopeefood: '', whatsapp: '' };

export function ProductForm({
  visible, product, umkmId, userId, onClose, onSaved,
}: {
  visible: boolean;
  product: ManagedProduct | null; // null = produk baru
  umkmId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [active, setActive] = useState(true);
  const [links, setLinks] = useState<LinkState>(EMPTY_LINKS);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Isi ulang formulir setiap dibuka (kosong untuk produk baru, terisi untuk edit). Disesuaikan saat render
  // (pola resmi React) ketika `visible` atau `product` berubah, alih-alih lewat effect.
  const [synced, setSynced] = useState<{ visible: boolean; product: ManagedProduct | null }>({ visible: false, product: null });
  if (synced.visible !== visible || synced.product !== product) {
    setSynced({ visible, product });
    if (visible) {
      setName(product?.name ?? '');
      setPrice(product ? String(product.price) : '');
      setCategory(product?.category ?? '');
      setDescription(product?.description ?? '');
      setTags(product?.tags.join(', ') ?? '');
      setActive(product?.is_active ?? true);
      const l: LinkState = { ...EMPTY_LINKS };
      product?.order_links.forEach(o => (l[o.platform] = o.url));
      setLinks(l);
      setImageUrl(product?.image_url ?? null);
      setPhoto(null);
      setError(null);
    }
  }

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.6,
      base64: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    if (!a.base64) return setError('Gambar tidak bisa dibaca. Coba pilih gambar lain.');
    setPhoto({ uri: a.uri, base64: a.base64, mimeType: a.mimeType });
  };

  const submit = async () => {
    setError(null);
    const priceN = Number(price.replace(/\D/g, ''));
    if (!name.trim()) return setError('Nama produk wajib diisi.');
    if (!price.trim() || Number.isNaN(priceN)) return setError('Harga wajib diisi dengan angka.');

    const cleanLinks: ProductInput['links'] = {};
    for (const p of PLATFORMS) {
      const r = normalizeLink(p.key, links[p.key]);
      if (r.error) return setError(r.error);
      if (r.url) cleanLinks[p.key] = r.url;
    }

    setBusy(true);
    let finalImage = imageUrl;
    if (photo) {
      const up = await uploadImage(userId, photo.base64, photo.mimeType, 'produk');
      if (!up.url) {
        setBusy(false);
        return setError(up.error ?? 'Gagal mengunggah foto.');
      }
      finalImage = up.url;
    }

    const input: ProductInput = {
      name: name.trim(),
      description: description.trim(),
      price: priceN,
      category: category.trim(),
      tags: Array.from(new Set(tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))).slice(0, 8),
      image_url: finalImage,
      is_active: active,
      links: cleanLinks,
    };
    const res = product ? await updateProduct(product.id, input) : await createProduct(umkmId, input);
    setBusy(false);
    if (res.error) return setError(res.error);
    onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>{product ? 'Ubah Produk' : 'Produk Baru'}</Text>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
              <RemoteImage uri={photo?.uri ?? imageUrl} style={styles.photo} />
              <View style={styles.photoBadge}>
                <Feather name="camera" size={14} color="#fff" />
                <Text style={styles.photoBadgeText}>{photo || imageUrl ? 'Ganti foto' : 'Tambah foto'}</Text>
              </View>
            </TouchableOpacity>

            <Field label="Nama produk *" value={name} onChangeText={setName} />
            <Field label="Harga (Rp) *" value={price} onChangeText={setPrice} keyboardType="numeric" />

            <Text style={styles.label}>Kategori</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Mis. Nasi & Lauk"
              placeholderTextColor="#6B7280"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hints}>
              {CATEGORY_HINTS.map(c => (
                <TouchableOpacity key={c} style={[styles.hint, category === c && styles.hintActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.hintText, category === c && { color: '#FF6B35' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline />
            <Field label="Tag (pisahkan dengan koma)" value={tags} onChangeText={setTags} placeholder="pedas, ayam, geprek" />

            <Text style={styles.section}>Link pemesanan</Text>
            <Text style={styles.sectionHint}>Isi platform yang dipakai. Yang kosong tidak ditampilkan ke pembeli.</Text>
            {PLATFORMS.map(p => (
              <Field
                key={p.key}
                label={p.label}
                value={links[p.key]}
                onChangeText={t => setLinks(prev => ({ ...prev, [p.key]: t }))}
                placeholder={p.placeholder}
                autoCapitalize="none"
              />
            ))}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Tampilkan di aplikasi</Text>
                <Text style={styles.sectionHint}>Nonaktifkan untuk menyembunyikan produk tanpa menghapusnya.</Text>
              </View>
              <Switch value={active} onValueChange={setActive} trackColor={{ true: '#FF6B35', false: '#374151' }} />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Simpan</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  label, multiline, ...rest
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: 'numeric';
  autoCapitalize?: 'none';
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        placeholderTextColor="#6B7280"
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A', paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  photoPicker: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#1E1E1E' },
  photo: { width: '100%', aspectRatio: 3 / 2 },
  photoBadge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  photoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1E1E1E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  hints: { gap: 8, paddingTop: 2 },
  hint: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2A2A2A' },
  hintActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B3522' },
  hintText: { color: '#9CA3AF', fontSize: 12 },
  section: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 8 },
  sectionHint: { color: '#6B7280', fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  switchTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  error: { color: '#EF4444', fontSize: 13 },
  submit: { backgroundColor: '#FF6B35', borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
