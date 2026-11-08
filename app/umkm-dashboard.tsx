import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Modal, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { FeatherName } from '../src/types';
import { notify } from '../src/lib/dialog';
import { RequireRole } from '../src/components/RequireRole';
import { UMKM_LIST, CATEGORIES, PRODUCTS, VIDEO_FEEDS, Product, VideoFeed } from '../data/mockData';

// SEMENTARA (sampai Gelombang 3): data dashboard masih mock milik UMKM 'u1'.
const MY_UMKM_ID = 'u1';

function DashboardContent() {
  // SEMENTARA (sampai Gelombang 3b): dashboard memakai data contoh lokal yang TIDAK tersimpan di server.
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [videos, setVideos] = useState<VideoFeed[]>(VIDEO_FEEDS);
  const updateProduct = (p: Product) => setProducts(prev => prev.map(x => (x.id === p.id ? p : x)));
  const addProduct = (p: Product) => setProducts(prev => [...prev, p]);
  const addVideo = (v: VideoFeed) => setVideos(prev => [v, ...prev]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'videos'>('products');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const myProducts = products.filter(p => p.umkmId === MY_UMKM_ID);
  const myVideos = videos.filter(v => v.umkmId === MY_UMKM_ID);
  const myUMKM = UMKM_LIST.find(u => u.id === MY_UMKM_ID)!;

  const totalLikes = myVideos.reduce((acc, v) => acc + v.likes, 0);
  const totalSaves = myVideos.reduce((acc, v) => acc + v.saves, 0);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dashboard UMKM</Text>
            <Text style={styles.subtitle}>{myUMKM.name}</Text>
          </View>
          <Image source={{ uri: myUMKM.avatar }} style={styles.umkmAvatar} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="package" color="#FF6B35" label="Produk" value={myProducts.length} />
          <StatCard icon="film" color="#3B82F6" label="Video" value={myVideos.length} />
          <StatCard icon="heart" color="#FF3B5C" label="Likes" value={totalLikes} />
          <StatCard icon="bookmark" color="#10B981" label="Saved" value={totalSaves} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.tabActive]}
            onPress={() => setActiveTab('products')}
          >
            <Feather name="package" size={15} color={activeTab === 'products' ? '#FF6B35' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Produk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Feather name="film" size={15} color={activeTab === 'videos' ? '#FF6B35' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'products' ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingProduct(null); setShowProductModal(true); }}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Tambah Produk</Text>
            </TouchableOpacity>

            {myProducts.map(p => (
              <View key={p.id} style={styles.productRow}>
                <Image source={{ uri: p.image }} style={styles.productThumb} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.productPrice}>Rp {p.price.toLocaleString('id-ID')}</Text>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={11} color="#FBBF24" />
                    <Text style={styles.ratingText}>{p.rating} ({p.reviewCount})</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => { setEditingProduct(p); setShowProductModal(true); }}
                >
                  <Feather name="edit-2" size={16} color="#FF8C42" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowVideoModal(true)}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Tambah Video</Text>
            </TouchableOpacity>

            {myVideos.map(v => {
              const prod = products.find(p => p.id === v.productId);
              return (
                <View key={v.id} style={styles.videoRow}>
                  <Image source={{ uri: v.image }} style={styles.videoThumb} />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoCaption} numberOfLines={2}>{v.caption}</Text>
                    <Text style={styles.videoProduct}>📦 {prod?.name}</Text>
                    <Text style={styles.videoProductPrice}>💰 Rp {prod?.price.toLocaleString('id-ID')}</Text>
                    <View style={styles.videoStats}>
                      <View style={styles.videoStat}>
                        <Feather name="heart" size={11} color="#FF3B5C" />
                        <Text style={styles.videoStatText}>{v.likes.toLocaleString()}</Text>
                      </View>
                      <View style={styles.videoStat}>
                        <Feather name="message-circle" size={11} color="#3B82F6" />
                        <Text style={styles.videoStatText}>{v.comments}</Text>
                      </View>
                      <View style={styles.videoStat}>
                        <Feather name="bookmark" size={11} color="#10B981" />
                        <Text style={styles.videoStatText}>{v.saves}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Product Modal */}
      <ProductModal
        visible={showProductModal}
        product={editingProduct}
        umkmId={MY_UMKM_ID}
        onClose={() => setShowProductModal(false)}
        onSave={(p) => {
          if (editingProduct) updateProduct(p);
          else addProduct(p);
          setShowProductModal(false);
          notify('Berhasil', editingProduct ? 'Produk diperbarui!' : 'Produk ditambahkan!');
        }}
      />

      {/* Video Modal */}
      <VideoModal
        visible={showVideoModal}
        myProducts={myProducts}
        umkmId={MY_UMKM_ID}
        onClose={() => setShowVideoModal(false)}
        onSave={(v) => {
          addVideo(v);
          setShowVideoModal(false);
          notify('Berhasil', 'Video ditambahkan ke feed!');
        }}
      />
    </View>
  );
}

// ── Product Modal ──────────────────────────────────────────────────────────────
function ProductModal({ visible, product, umkmId, onClose, onSave }: {
  visible: boolean;
  product: Product | null;
  umkmId: string;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);

  React.useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(String(product.price));
      setDesc(product.description);
      setCategory(product.category);
    } else {
      setName(''); setPrice(''); setDesc(''); setCategory(CATEGORIES[1]);
    }
  }, [product, visible]);

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      notify('Error', 'Nama dan harga wajib diisi');
      return;
    }
    const saved: Product = {
      id: product?.id ?? `p_${Date.now()}`,
      umkmId,
      name: name.trim(),
      price: parseInt(price.replace(/\D/g, '')) || 0,
      description: desc.trim() || 'Produk UMKM terpercaya.',
      category,
      rating: product?.rating ?? 4.5,
      reviewCount: product?.reviewCount ?? 0,
      image: product?.image ?? `https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600`,
      tags: [category.toLowerCase().split(' ')[0]],
      isPopular: product?.isPopular,
    };
    onSave(saved);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</Text>

          <Text style={styles.inputLabel}>Nama Produk</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Nasi Uduk Spesial"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.inputLabel}>Harga (Rp)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Contoh: 25000"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>Deskripsi (opsional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Ceritakan produkmu..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Video Modal ────────────────────────────────────────────────────────────────
function VideoModal({ visible, myProducts, umkmId, onClose, onSave }: {
  visible: boolean;
  myProducts: Product[];
  umkmId: string;
  onClose: () => void;
  onSave: (v: VideoFeed) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [caption, setCaption] = useState('');

  React.useEffect(() => {
    if (visible) { setSelectedProductId(''); setCaption(''); }
  }, [visible]);

  const handleSave = () => {
    if (!selectedProductId) { notify('Error', 'Pilih produk terlebih dahulu'); return; }
    const prod = myProducts.find(p => p.id === selectedProductId);
    const video: VideoFeed = {
      id: `v_${Date.now()}`,
      productId: selectedProductId,
      umkmId,
      image: prod?.image ?? 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=1200&fit=crop',
      caption: caption.trim() || `Coba ${prod?.name} sekarang! 🔥`,
      likes: 0, comments: 0, saves: 0,
    };
    onSave(video);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Tambah Video Baru</Text>

          <Text style={styles.inputLabel}>Pilih Produk</Text>
          <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
            {myProducts.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.productPick, selectedProductId === p.id && styles.productPickActive]}
                onPress={() => setSelectedProductId(p.id)}
              >
                <Image source={{ uri: p.image }} style={styles.productPickImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productPickName}>{p.name}</Text>
                  <Text style={styles.productPickPrice}>Rp {p.price.toLocaleString('id-ID')}</Text>
                </View>
                {selectedProductId === p.id && <Feather name="check-circle" size={20} color="#FF6B35" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Caption Video</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Tulis caption menarik..."
            placeholderTextColor="#6B7280"
            multiline numberOfLines={3}
          />
          <Text style={styles.inputHint}>*Gambar produk akan digunakan sebagai thumbnail video</Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Tambahkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function StatCard({ icon, color, label, value }: { icon: FeatherName; color: string; label: string; value: number }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Feather name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  umkmAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FF6B35' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 16 },
  statCard: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 6 },
  statLabel: { color: '#9CA3AF', fontSize: 10, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#1A1A1A', marginBottom: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FF6B35' },
  tabText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FF6B35' },
  section: { padding: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  productRow: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' },
  productThumb: { width: 80, height: 80 },
  productInfo: { flex: 1, padding: 12 },
  productName: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  productPrice: { color: '#FF8C42', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#FBBF24', fontSize: 11 },
  editBtn: { padding: 16 },
  videoRow: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' },
  videoThumb: { width: 70, height: 100 },
  videoInfo: { flex: 1, padding: 12 },
  videoCaption: { color: '#E5E7EB', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  videoProduct: { color: '#9CA3AF', fontSize: 11, marginBottom: 2 },
  videoProductPrice: { color: '#FF8C42', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  videoStats: { flexDirection: 'row', gap: 12 },
  videoStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  videoStatText: { color: '#9CA3AF', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#2A2A2A', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: '#374151' },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  inputHint: { color: '#6B7280', fontSize: 11, marginBottom: 14 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#2A2A2A', alignItems: 'center' },
  cancelBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#FF6B35', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#374151' },
  catChipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  catChipText: { color: '#9CA3AF', fontSize: 12 },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  productPick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: '#2A2A2A', marginBottom: 6 },
  productPickActive: { backgroundColor: '#2D1F18', borderWidth: 1, borderColor: '#FF6B35' },
  productPickImg: { width: 40, height: 40, borderRadius: 8 },
  productPickName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  productPickPrice: { color: '#FF8C42', fontSize: 11 },
});

export default function UmkmDashboardScreen() {
  return (
    <RequireRole allow={['umkm']}>
      <DashboardContent />
    </RequireRole>
  );
}
