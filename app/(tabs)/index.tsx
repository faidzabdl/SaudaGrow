import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Pressable, PanResponder,
  LayoutChangeEvent, ViewToken, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import { useApp } from '../../context/AppContext';
import { useLoginGuard } from '../../src/hooks/useLoginGuard';
import { RemoteImage } from '../../src/components/RemoteImage';
import { subscribeHomeRefresh } from '../../src/lib/homeRefresh';
import { APP_NAME } from '../../src/config';
import type { FeatherName, FeedItem } from '../../src/types';

const { width: W, height: H } = Dimensions.get('window');
const SEEN_AFTER_MS = 1500; // video dianggap "sudah ditonton" bila tampil minimal segini lama

export default function HomeScreen() {
  const {
    feed, loading, error, reload, markSeen,
    savedProductIds, toggleSave, likedVideoIds, toggleLike,
  } = useApp();
  const router = useRouter();
  const guard = useLoginGuard();
  const listRef = useRef<FlatList<FeedItem>>(null);
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

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

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
              onReady={() => setReadyId(video.id)}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            style={[styles.gradient, { height: itemHeight * 0.65, pointerEvents: 'none' }]}
          />

          {/* Top bar */}
          <SafeAreaView edges={['top']} style={styles.topBar}>
            <TouchableOpacity onPress={doRefresh} hitSlop={8} accessibilityLabel="Muat ulang feed">
              <Text style={styles.appName}>{APP_NAME}</Text>
            </TouchableOpacity>
            <View style={styles.topRight}>
              <Text style={styles.tagline}>Discover F&B UMKM</Text>
              <TouchableOpacity onPress={() => setMuted(m => !m)} style={styles.muteBtn} hitSlop={8}>
                <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Right actions (komentar & bagikan menyusul di Tingkat B) */}
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
                  {!!umkm.city && (
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={11} color="#FFA07A" />
                      <Text style={styles.location}> {umkm.city}</Text>
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
    [likedVideoIds, savedProductIds, itemWidth, itemHeight, activeIndex, muted, readyId, router, guard, toggleLike, toggleSave, doRefresh]
  );

  if (loading && feed.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
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
      <FlatList
        ref={listRef}
        data={feed}
        renderItem={renderItem}
        extraData={[itemWidth, itemHeight, activeIndex, muted, readyId]}
        keyExtractor={item => item.video.id}
        pagingEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={doRefresh}
        progressViewOffset={56}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
      />
    </View>
  );
}

// Hanya slide aktif yang memasang pemutar, sehingga hanya satu video yang diunduh/diputar sekali waktu
// (hemat kuota dan baterai). Gagal memuat: poster tetap terlihat.
function FeedVideo({
  uri, width, height, muted, onReady,
}: { uri: string; width: number; height: number; muted: boolean; onReady: () => void }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack ?? null });
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  // Video tegak (kira-kira 9:16) memenuhi layar; video persegi/landscape tampil utuh dengan ruang hitam.
  const size = videoTrack?.size;
  const aspect = size && size.height > 0 ? size.width / size.height : null;
  const fit = aspect !== null && aspect > 0.65 ? 'contain' : 'cover';

  const toggle = () => {
    if (player.playing) {
      player.pause();
      setUserPaused(true);
    } else {
      player.play();
      setUserPaused(false);
    }
  };

  if (status === 'error') return null;
  return (
    <>
      <VideoView
        player={player}
        style={[styles.bg, { width, height }]}
        contentFit={fit}
        nativeControls={false}
        onFirstFrameRender={onReady}
      />
      <Pressable
        style={[styles.tapLayer, { width, height }]}
        onPress={toggle}
        accessibilityLabel="Putar atau jeda video"
      />
      {userPaused && (
        <View style={styles.pauseIcon}>
          <Feather name="play" size={64} color="rgba(255,255,255,0.85)" />
        </View>
      )}
      {status === 'loading' && <ActivityIndicator style={styles.spinner} color="#fff" />}
      <SeekBar player={player} />
    </>
  );
}

const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

// Bilah putar di tepi bawah video: ketuk untuk lompat, geser untuk maju/mundur (seperti TikTok).
// Saat digeser, video dijeda dan kembali berputar bila sebelumnya sedang diputar.
function SeekBar({ player }: { player: VideoPlayer }) {
  const [ratio, setRatio] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [label, setLabel] = useState('');
  const widthRef = useRef(1);
  const startRatio = useRef(0);
  const scrubbingRef = useRef(false);
  const resume = useRef(false);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (scrubbingRef.current || !(player.duration > 0)) return;
    setRatio(Math.min(1, currentTime / player.duration));
  });

  const seek = useCallback(
    (r: number) => {
      const clamped = Math.min(1, Math.max(0, r));
      setRatio(clamped);
      if (player.duration > 0) {
        player.currentTime = clamped * player.duration;
        setLabel(`${fmtTime(clamped * player.duration)} / ${fmtTime(player.duration)}`);
      }
    },
    [player]
  );

  const pan = useMemo(() => {
    const end = () => {
      scrubbingRef.current = false;
      setScrubbing(false);
      player.scrubbingModeOptions = { scrubbingModeEnabled: false };
      if (resume.current) player.play();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // jangan biarkan daftar video merebut sentuhan saat menggeser
      onPanResponderGrant: e => {
        scrubbingRef.current = true;
        setScrubbing(true);
        resume.current = player.playing;
        player.pause();
        player.scrubbingModeOptions = { scrubbingModeEnabled: true };
        startRatio.current = e.nativeEvent.locationX / widthRef.current;
        seek(startRatio.current);
      },
      onPanResponderMove: (_e, g) => seek(startRatio.current + g.dx / widthRef.current),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, [player, seek]);

  return (
    <>
      {scrubbing && (
        <View style={styles.scrubLabelWrap}>
          <Text style={styles.scrubLabel}>{label}</Text>
        </View>
      )}
      <View
        style={styles.seekZone}
        onLayout={e => {
          widthRef.current = e.nativeEvent.layout.width || 1;
        }}
        {...pan.panHandlers}
      >
        <View style={[styles.seekTrack, scrubbing && styles.seekTrackActive]}>
          <View style={[styles.seekFill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
    </>
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
  tapLayer: { position: 'absolute', top: 0, left: 0 },
  pauseIcon: { position: 'absolute', top: '42%', alignSelf: 'center', pointerEvents: 'none' },
  spinner: { position: 'absolute', top: '45%', alignSelf: 'center' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  appName: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
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
  seekZone: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, justifyContent: 'flex-end' },
  seekTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', pointerEvents: 'none' },
  seekTrackActive: { height: 7 },
  seekFill: { height: '100%', backgroundColor: '#fff', pointerEvents: 'none' },
  scrubLabelWrap: { position: 'absolute', bottom: 56, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, pointerEvents: 'none' },
  scrubLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
