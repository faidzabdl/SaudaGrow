import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions,
  LayoutChangeEvent, ViewToken, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { useLoginGuard } from '../../src/hooks/useLoginGuard';
import { RemoteImage } from '../../src/components/RemoteImage';
import { FeedVideo } from '../../src/components/FeedVideo';
import { VideoCommentsSheet } from '../../src/components/VideoCommentsSheet';
import { distanceKm, formatDistance } from '../../src/lib/geo';
import { subscribeHomeRefresh } from '../../src/lib/homeRefresh';
import { APP_NAME } from '../../src/config';
import type { FeatherName, FeedItem } from '../../src/types';

const { width: W, height: H } = Dimensions.get('window');
const VIEW_CONFIG = { viewAreaCoveragePercentThreshold: 60 };
const SEEN_AFTER_MS = 1500; // video dianggap "sudah ditonton" bila tampil minimal segini lama

export default function HomeScreen() {
  const {
    feed: forYouFeed, nearbyFeed, loading, error, reload, markSeen, coords, requestLocation,
    savedProductIds, toggleSave, likedVideoIds, toggleLike,
  } = useApp();
  const router = useRouter();
  const navigation = useNavigation();
  const guard = useLoginGuard();
  const listRef = useRef<FlatList<FeedItem>>(null);
  // Video dijeda saat layar Home tidak tampil (pindah tab atau membuka halaman produk) dan lanjut saat kembali.
  const [focused, setFocused] = useState(true);
  // Video yang komentarnya sedang dibuka (null = panel tertutup). Komentar video terpisah dari komentar produk.
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  useEffect(() => {
    const unFocus = navigation.addListener('focus', () => setFocused(true));
    const unBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unFocus();
      unBlur();
    };
  }, [navigation]);
  // Dua halaman FYP: "Untuk Anda" (ranking, diacak berbobot) dan "Terdekat" (jarak dominan + ranking).
  const [tab, setTab] = useState<'foryou' | 'nearby'>('foryou');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const feed = tab === 'nearby' ? nearbyFeed : forYouFeed;
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Poster disembunyikan setelah frame pertama video tampil (agar tidak terlihat di ruang hitam video landscape).
  const [readyId, setReadyId] = useState<string | null>(null);
  // Browser memblokir autoplay bersuara, jadi di web video mulai senyap.
  const [muted, setMuted] = useState(Platform.OS === 'web');
  // Ukuran slide = ukuran area layar di atas tab bar, DIUKUR dari wadahnya (bukan Dimensions saat
  // aplikasi dimuat), sehingga tetap benar saat jendela web diubah ukurannya atau HP diputar.
  const [itemHeight, setItemHeight] = useState(H);
  const [itemWidth, setItemWidth] = useState(W);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const h = Math.round(height);
    const w = Math.round(width);
    if (h > 0 && h !== itemHeight) setItemHeight(h);
    if (w > 0 && w !== itemWidth) setItemWidth(w);
  };

  // FlatList menuntut callback ini stabil; useCallback tanpa dependensi menjaganya (setState sudah stabil).
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  const askLocation = useCallback(async () => {
    setLocating(true);
    setLocError(null);
    const r = await requestLocation();
    if (!r.coords) setLocError(r.error);
    setLocating(false);
  }, [requestLocation]);

  const selectTab = useCallback(
    (next: 'foryou' | 'nearby') => {
      if (next === tab) return;
      setTab(next);
      setActiveIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      // Lokasi baru diminta saat tab Terdekat dibuka (bukan saat aplikasi dibuka).
      if (next === 'nearby' && !coords) askLocation();
    },
    [tab, coords, askLocation]
  );

  // Refresh: muat ulang data, urutan diacak ulang (seed baru), lalu kembali ke video pertama.
  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setActiveIndex(0);
    setRefreshing(false);
  }, [reload]);

  // Ketuk tab Home yang sudah aktif -> refresh (dipancarkan dari layout tab).
  useEffect(() => subscribeHomeRefresh(() => { doRefresh(); }), [doRefresh]);

  // Tandai video sudah ditonton setelah tampil beberapa detik (memengaruhi refresh berikutnya).
  const activeVideoId = feed[activeIndex]?.video.id;
  useEffect(() => {
    if (!activeVideoId) return;
    const t = setTimeout(() => markSeen(activeVideoId), SEEN_AFTER_MS);
    return () => clearTimeout(t);
  }, [activeVideoId, markSeen]);

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const { product, video } = item;
      const umkm = product.umkm;
      const isLiked = likedVideoIds.includes(video.id);
      const isSaved = savedProductIds.includes(product.id);
      const active = index === activeIndex;
      const poster = video.thumbnail_url ?? product.image_url;
      const km = coords ? distanceKm(coords, { lat: umkm.lat, lng: umkm.lng }) : null;
      const openProduct = () => router.push(`/product/${product.id}`);
      // Ketuk akun UMKM -> halaman produk langsung di tab "Tentang UMKM"
      const openUmkm = () => router.push(`/product/${product.id}?tab=umkm`);

      return (
        <View style={[styles.slide, { width: itemWidth, height: itemHeight }]}>
          {readyId !== video.id && (
            <RemoteImage uri={poster} icon="film" style={[styles.bg, { width: itemWidth, height: itemHeight }]} />
          )}
          {active && (
            <FeedVideo
              uri={item.videoUrl}
              width={itemWidth}
              height={itemHeight}
              muted={muted}
              paused={!focused}
              onReady={() => setReadyId(video.id)}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            style={[styles.gradient, { height: itemHeight * 0.65, pointerEvents: 'none' }]}
          />

          {/* Right actions (bagikan menyusul di Tingkat B) */}
          <View style={styles.actions}>
            <ActionBtn
              icon="heart"
              color={isLiked ? '#FF3B5C' : '#fff'}
              label={formatCount(item.like_count)}
              onPress={() => guard(() => toggleLike(video.id))}
            />
            <ActionBtn
              icon="bookmark"
              color={isSaved ? '#FF6B35' : '#fff'}
              label={formatCount(product.save_count)}
              onPress={() => guard(() => toggleSave(product.id))}
            />
            {/* Komentar VIDEO ini (panel). Membaca terbuka untuk semua; menulis butuh login (diatur di panel) */}
            <ActionBtn
              icon="message-circle"
              color="#fff"
              label={formatCount(item.comment_count)}
              onPress={() => setCommentItem(item)}
            />
          </View>

          {/* Bottom info */}
          <View style={styles.info}>
            <TouchableOpacity onPress={openProduct}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.price}>Rp {product.price.toLocaleString('id-ID')}</Text>
            </TouchableOpacity>
            {!!(video.caption || product.description) && (
              <Text style={styles.caption} numberOfLines={3}>{video.caption || product.description}</Text>
            )}

            <View style={styles.umkmRow}>
              <TouchableOpacity style={styles.umkmTap} onPress={openUmkm} activeOpacity={0.8}>
                <RemoteImage uri={umkm.logo_url} icon="user" style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.umkmName} numberOfLines={1}>{umkm.name}</Text>
                  {(!!umkm.city || km !== null) && (
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={11} color="#FFA07A" />
                      <Text style={styles.location}>
                        {' '}{[umkm.city, km !== null ? formatDistance(km) : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.orderBtn} onPress={openProduct}>
                <Text style={styles.orderBtnText}>Pesan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [likedVideoIds, savedProductIds, itemWidth, itemHeight, activeIndex, muted, readyId, coords, focused, router, guard, toggleLike, toggleSave]
  );

  // Top bar tetap (tidak ikut bergeser): nama + suara, lalu pilihan halaman FYP.
  const topBar = (
    <SafeAreaView edges={['top']} style={styles.topBar}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={doRefresh} hitSlop={8} accessibilityLabel="Muat ulang feed">
          <Text style={styles.appName}>{APP_NAME}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMuted(m => !m)} style={styles.muteBtn} hitSlop={8}>
          <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <TabSwitch tab={tab} onSelect={selectTab} />
    </SafeAreaView>
  );

  let body: React.ReactNode;
  if (feed.length > 0) {
    body = (
      <FlatList
        key={tab}
        ref={listRef}
        data={feed}
        renderItem={renderItem}
        extraData={[itemWidth, itemHeight, activeIndex, muted, readyId, coords]}
        keyExtractor={item => item.video.id}
        pagingEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={doRefresh}
        progressViewOffset={96}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEW_CONFIG}
      />
    );
  } else if (tab === 'nearby') {
    body = (
      <View style={[styles.container, styles.center]}>
        {locating ? (
          <>
            <ActivityIndicator color="#FF6B35" />
            <Text style={styles.emptyDesc}>Mencari lokasimu…</Text>
          </>
        ) : !coords ? (
          <>
            <Feather name="map-pin" size={48} color="#374151" />
            <Text style={styles.emptyTitle}>Aktifkan lokasi untuk melihat yang terdekat</Text>
            <Text style={styles.emptyDesc}>
              {locError ?? 'Lokasi hanya dipakai di perangkat untuk menghitung jarak dan tidak dikirim ke server.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={askLocation}>
              <Text style={styles.retryText}>Aktifkan lokasi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Feather name="film" size={48} color="#374151" />
            <Text style={styles.emptyTitle}>Belum ada video di sekitarmu</Text>
            <Text style={styles.emptyDesc}>Coba lagi nanti, atau lihat halaman &quot;Untuk Anda&quot;.</Text>
          </>
        )}
      </View>
    );
  } else if (loading) {
    body = (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  } else {
    body = (
      <View style={[styles.container, styles.center]}>
        <Feather name={error ? 'wifi-off' : 'film'} size={48} color="#374151" />
        <Text style={styles.emptyTitle}>{error ? 'Gagal memuat feed' : 'Belum ada video'}</Text>
        <Text style={styles.emptyDesc}>
          {error ?? 'UMKM yang sudah terverifikasi akan menampilkan video produknya di sini.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => reload()}>
          <Text style={styles.retryText}>Muat ulang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {body}
      {topBar}
      <VideoCommentsSheet
        item={commentItem}
        onClose={() => setCommentItem(null)}
        onChanged={reload}
        onOpenProduct={productId => {
          setCommentItem(null);
          router.push(`/product/${productId}?tab=komentar`);
        }}
      />
    </View>
  );
}

// Pilihan halaman FYP di bawah nama aplikasi (gaya TikTok: teks, yang aktif bergaris bawah).
function TabSwitch({ tab, onSelect }: { tab: 'foryou' | 'nearby'; onSelect: (t: 'foryou' | 'nearby') => void }) {
  const items: { key: 'foryou' | 'nearby'; label: string }[] = [
    { key: 'foryou', label: 'Untuk Anda' },
    { key: 'nearby', label: 'Terdekat' },
  ];
  return (
    <View style={styles.tabs}>
      {items.map(i => (
        <TouchableOpacity key={i.key} onPress={() => onSelect(i.key)} style={styles.tabBtn} hitSlop={6}>
          <Text style={[styles.tabText, tab === i.key && styles.tabTextActive]}>{i.label}</Text>
          <View style={[styles.tabLine, tab === i.key && styles.tabLineActive]} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ActionBtn({ icon, color, label, onPress }: { icon: FeatherName; color: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <Feather name={icon} size={28} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 8 },
  emptyDesc: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 22, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  slide: { backgroundColor: '#000' },
  bg: { position: 'absolute', top: 0, left: 0 },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 4, pointerEvents: 'box-none' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', alignSelf: 'center', gap: 22, marginTop: 4 },
  tabBtn: { alignItems: 'center', paddingVertical: 4 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  tabLine: { height: 2, width: 24, marginTop: 3, backgroundColor: 'transparent', borderRadius: 1 },
  tabLineActive: { backgroundColor: '#fff' },
  appName: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  muteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', right: 12, bottom: 144, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center' },
  actionLabel: { color: '#fff', fontSize: 12, marginTop: 2, fontWeight: '600' },
  info: { position: 'absolute', left: 16, right: 72, bottom: 38 },
  productName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  price: { color: '#FF8C42', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  caption: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  umkmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  umkmTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FF6B35' },
  umkmName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  location: { color: '#FFA07A', fontSize: 11 },
  orderBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  orderBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
