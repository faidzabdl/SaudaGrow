import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, LayoutChangeEvent, ViewToken, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FeedVideo } from './FeedVideo';

const VIEW_CONFIG = { viewAreaCoveragePercentThreshold: 60 };

export interface ModalVideo {
  id: string;
  uri: string;
  caption: string | null;
}

// Pemutar layar penuh untuk video milik satu produk (dibuka dari thumbnail di halaman produk).
// Geser ke atas/bawah untuk berpindah video; kontrol putar sama dengan di feed.
export function ProductVideoModal({
  visible, items, startIndex, title, onClose,
}: { visible: boolean; items: ModalVideo[]; startIndex: number; title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(Platform.OS === 'web');
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Setiap dibuka (atau startIndex berubah) mulai dari video yang diketuk. Disesuaikan saat render
  // (pola resmi React) alih-alih lewat effect, agar tidak ada render berantai.
  const [syncKey, setSyncKey] = useState(`${visible}:${startIndex}`);
  const key = `${visible}:${startIndex}`;
  if (syncKey !== key) {
    setSyncKey(key);
    if (visible) setIndex(startIndex);
  }

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setIndex(viewableItems[0].index ?? 0);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.round(width), h: Math.round(height) });
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container} onLayout={onLayout}>
        {size.h > 0 && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={v => v.id}
            pagingEnabled
            snapToInterval={size.h}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            initialScrollIndex={Math.min(startIndex, items.length - 1)}
            getItemLayout={(_, i) => ({ length: size.h, offset: size.h * i, index: i })}
            extraData={[index, muted, size.w, size.h]}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEW_CONFIG}
            renderItem={({ item, index: i }) => (
              <View style={{ width: size.w, height: size.h, backgroundColor: '#000' }}>
                {i === index && <FeedVideo uri={item.uri} width={size.w} height={size.h} muted={muted} />}
                {!!item.caption && (
                  <View style={styles.captionWrap}>
                    <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.roundBtn} accessibilityLabel="Tutup">
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}{items.length > 1 ? `  ·  ${index + 1}/${items.length}` : ''}</Text>
          <TouchableOpacity onPress={() => setMuted(m => !m)} style={styles.roundBtn} accessibilityLabel="Suara">
            <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  captionWrap: { position: 'absolute', left: 16, right: 16, bottom: 44, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 10, pointerEvents: 'none' },
  caption: { color: '#fff', fontSize: 13, lineHeight: 18 },
});
