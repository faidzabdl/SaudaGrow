import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeatherName, OrderPlatform } from '../../src/types';
import { notify } from '../../src/lib/dialog';
import { useApp } from '../../context/AppContext';
import { useLoginGuard } from '../../src/hooks/useLoginGuard';
import { RemoteImage } from '../../src/components/RemoteImage';
import { RatingSection, Stars, formatRating } from '../../src/components/RatingSection';
import { CommentSection } from '../../src/components/CommentSection';
import { ProductVideoModal } from '../../src/components/ProductVideoModal';

const ORDER_OPTIONS: { label: string; badge: string; color: string; key: OrderPlatform }[] = [
  { label: 'GoFood', badge: 'Go', color: '#00AA5B', key: 'gofood' },
  { label: 'GrabFood', badge: 'Gr', color: '#00B14F', key: 'grabfood' },
  { label: 'ShopeeFood', badge: 'Sh', color: '#EE4D2D', key: 'shopeefood' },
  { label: 'WhatsApp', badge: 'WA', color: '#25D366', key: 'whatsapp' },
];

export default function ProductDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { products, feed, loading, savedProductIds, toggleSave, trackOrder, reload } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guard = useLoginGuard();
  const [activeTab, setActiveTab] = useState<'info' | 'umkm' | 'komentar'>(
    tab === 'umkm' ? 'umkm' : tab === 'komentar' ? 'komentar' : 'info'
  );
  const [playIndex, setPlayIndex] = useState<number | null>(null); // video produk yang sedang diputar (null = tertutup)
  const [orderTick, setOrderTick] = useState(0); // naik setiap Pesan ditekan -> cek ulang syarat rating

  const product = products.find(p => p.id === id);
  const productVideos = feed.filter(f => f.product.id === id);
  const isSaved = savedProductIds.includes(id ?? '');

  if (!product) {
    if (loading) {
      return (
        <View style={styles.notFound}>
          <ActivityIndicator color="#FF6B35" />
        </View>
      );
    }
    return (
      <View style={styles.notFound}>
        <Feather name="alert-circle" size={48} color="#FF6B35" />
        <Text style={styles.notFoundText}>Produk tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const umkm = product.umkm;
  const availableOptions = ORDER_OPTIONS.filter(o => product.order_links.some(l => l.platform === o.key));

  // Langsung coba buka; canOpenURL tidak andal di Android 11+ tanpa deklarasi "queries".
  const openLink = async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      notify('Tidak bisa membuka link', `Link ${label} tidak dapat dibuka di perangkat ini.`);
    }
  };

  // Pesan wajib login. Klik dicatat (tidak ditunggu agar link langsung terbuka), lalu link dibuka.
  const handleOrder = (platform: OrderPlatform, label: string) => {
    const url = product.order_links.find(l => l.platform === platform)?.url;
    if (!url) return;
    guard(() => {
      trackOrder(product.id, platform).then(() => setOrderTick(t => t + 1));
      openLink(url, label);
    });
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${umkm.lat},${umkm.lng}`;
  const place = [umkm.address, umkm.city].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      {/* Header image */}
      <View style={styles.imageContainer}>
        <RemoteImage uri={product.image_url} style={styles.heroImage} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent']} style={styles.topGradient} />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => guard(() => toggleSave(product.id))} style={styles.saveCircle}>
            <Feather name="bookmark" size={20} color={isSaved ? '#FF6B35' : '#fff'} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Product header */}
        <View style={styles.productHeader}>
          {!!product.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          )}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rp {product.price.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.ratingLine}>
            {product.avg_rating !== null && product.rating_count > 0 ? (
              <>
                <Stars value={product.avg_rating} size={14} />
                <Text style={styles.ratingLineText}>
                  {formatRating(product.avg_rating)} ({product.rating_count})
                </Text>
              </>
            ) : (
              <Text style={styles.ratingLineText}>Belum ada rating</Text>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info Produk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'umkm' && styles.tabActive]}
            onPress={() => setActiveTab('umkm')}
          >
            <Text style={[styles.tabText, activeTab === 'umkm' && styles.tabTextActive]}>Tentang UMKM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'komentar' && styles.tabActive]}
            onPress={() => setActiveTab('komentar')}
          >
            <Text style={[styles.tabText, activeTab === 'komentar' && styles.tabTextActive]}>
              {product.comment_count > 0 ? `Komentar (${product.comment_count})` : 'Komentar'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'info' ? (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.description}>{product.description || 'Belum ada deskripsi.'}</Text>

            {product.tags.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tags}>
                  {product.tags.map(tag => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <RatingSection product={product} orderTick={orderTick} onChanged={reload} />

            {productVideos.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Video Produk ({productVideos.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videoScroll}>
                  {productVideos.map((v, i) => (
                    <TouchableOpacity
                      key={v.video.id}
                      style={styles.videoThumb}
                      onPress={() => setPlayIndex(i)}
                      activeOpacity={0.85}
                      accessibilityLabel={`Putar video ${i + 1}`}
                    >
                      <RemoteImage uri={v.video.thumbnail_url ?? product.image_url} icon="film" style={styles.videoThumbImg} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.videoGradient} />
                      <View style={styles.videoInfo}>
                        <Feather name="heart" size={14} color="#fff" />
                        <Text style={styles.videoLikes}>{v.like_count.toLocaleString('id-ID')}</Text>
                        <Feather name="message-circle" size={14} color="#fff" style={{ marginLeft: 8 }} />
                        <Text style={styles.videoLikes}>{v.comment_count.toLocaleString('id-ID')}</Text>
                      </View>
                      <View style={styles.playBadge}>
                        <Feather name="play" size={22} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        ) : activeTab === 'umkm' ? (
          <View style={styles.tabContent}>
            <View style={styles.umkmCard}>
              <RemoteImage uri={umkm.logo_url} icon="user" style={styles.umkmAvatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.umkmNameRow}>
                  <Text style={styles.umkmName}>{umkm.name}</Text>
                  <View style={styles.verifiedBadge}>
                    <Feather name="check-circle" size={12} color="#3B82F6" />
                    <Text style={styles.verifiedText}>Terverifikasi</Text>
                  </View>
                </View>
                <Text style={styles.umkmOwner}>Pemilik: {umkm.owner_name}</Text>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color="#FF8C42" />
                  <Text style={styles.locationText}> {place}</Text>
                </View>
              </View>
            </View>

            <View style={styles.umkmMeta}>
              <MetaItem icon="bookmark" color="#FF6B35" value={`${product.save_count}`} label="Disimpan" />
              <MetaItem icon="shopping-bag" color="#3B82F6" value={`${product.order_count}`} label="Klik Pesan" />
              <MetaItem
                icon="star"
                color="#FBBF24"
                value={product.umkm_avg_rating !== null ? formatRating(product.umkm_avg_rating) : '-'}
                label={product.umkm_rating_count > 0 ? `Rating UMKM (${product.umkm_rating_count})` : 'Rating UMKM'}
              />
            </View>

            <Text style={styles.sectionTitle}>Kontak</Text>
            <Text style={styles.description}>{umkm.contact}</Text>

            <TouchableOpacity style={styles.mapsBtn} onPress={() => openLink(mapsUrl, 'Google Maps')}>
              <Feather name="map" size={16} color="#fff" />
              <Text style={styles.mapsBtnText}>Lihat di Maps</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <CommentSection product={product} onChanged={reload} />
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <ProductVideoModal
        visible={playIndex !== null}
        startIndex={playIndex ?? 0}
        title={product.name}
        items={productVideos.map(v => ({ id: v.video.id, uri: v.videoUrl, caption: v.video.caption }))}
        onClose={() => setPlayIndex(null)}
      />

      {/* Order buttons */}
      <View style={[styles.orderContainer, { paddingBottom: 16 + insets.bottom }]}>
        {availableOptions.length === 0 ? (
          <Text style={styles.orderTitle}>UMKM ini belum menambahkan link pemesanan.</Text>
        ) : (
          <>
            <Text style={styles.orderTitle}>Pesan via:</Text>
            <View style={styles.orderButtons}>
              {availableOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.orderBtn, { borderColor: opt.color }]}
                  onPress={() => handleOrder(opt.key, opt.label)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.orderIcon, { backgroundColor: opt.color }]}>
                    <Text style={styles.orderIconText}>{opt.badge}</Text>
                  </View>
                  <Text style={[styles.orderBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function MetaItem({ icon, color, value, label }: { icon: FeatherName; color: string; value: string; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  notFound: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#fff', fontSize: 16, marginTop: 12 },
  backBtn: { marginTop: 16, backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  imageContainer: { position: 'relative' },
  heroImage: { width: '100%', aspectRatio: 1 / 0.65 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  topBar: {
    position: 'absolute', top: 0,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  saveCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  popularBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  popularBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  discountBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#FF3B5C', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  discountBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1 },
  productHeader: { backgroundColor: '#1A1A1A', padding: 16, marginBottom: 2 },
  categoryTag: { backgroundColor: '#FF6B3522', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { color: '#FF8C42', fontSize: 12, fontWeight: '600' },
  productName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  price: { color: '#FF6B35', fontSize: 22, fontWeight: '800' },
  originalPrice: { color: '#6B7280', fontSize: 14, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', gap: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { color: '#FBBF24', fontSize: 14, fontWeight: '700' },
  reviewCount: { color: '#9CA3AF', fontSize: 13 },
  tabs: { flexDirection: 'row', backgroundColor: '#1A1A1A', marginBottom: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FF6B35' },
  tabText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FF6B35' },
  tabContent: { backgroundColor: '#1A1A1A', padding: 16, marginBottom: 2 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  description: { color: '#D1D5DB', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: '#2A2A2A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { color: '#9CA3AF', fontSize: 12 },
  videoScroll: { marginBottom: 8 },
  videoThumb: { width: 120, height: 180, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  videoThumbImg: { width: '100%', height: '100%' },
  videoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  videoInfo: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoLikes: { color: '#fff', fontSize: 11, fontWeight: '600' },
  umkmCard: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  umkmAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#FF6B35' },
  umkmNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  umkmName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { color: '#3B82F6', fontSize: 10, fontWeight: '600' },
  umkmOwner: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#FF8C42', fontSize: 12 },
  umkmMeta: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 16, marginBottom: 16 },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  metaLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  mapsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14 },
  mapsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  orderContainer: { backgroundColor: '#1A1A1A', padding: 16, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  orderTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderButtons: { flexDirection: 'row', gap: 8 },
  orderBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#2A2A2A' },
  orderIcon: { width: 28, height: 28, borderRadius: 14, marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  orderIconText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  orderBtnText: { fontSize: 10, fontWeight: '700' },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingLineText: { color: '#9CA3AF', fontSize: 12 },
  playBadge: { position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
});
