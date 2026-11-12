import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CommentSection } from './CommentSection';
import type { FeedItem } from '../types';

// Panel komentar VIDEO di feed Home (gaya TikTok). Hanya membahas video yang sedang ditonton; pertanyaan soal
// produknya ada di tab Komentar halaman produk (tautan di bawah). `item` null = tertutup.
export function VideoCommentsSheet({
  item, onClose, onChanged, onOpenProduct,
}: {
  item: FeedItem | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenProduct: (productId: string) => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={item !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Tutup komentar" />
        {item && (
          <View style={[styles.sheet, { maxHeight: height * 0.78, paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.headerTitle} numberOfLines={1}>{item.product.name}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Tutup">
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {/* key: panel dipakai ulang antarvideo, jadi daftar dan isian direset tiap ganti video */}
              <CommentSection key={item.video.id} product={item.product} videoId={item.video.id} onChanged={onChanged} />
              <TouchableOpacity style={styles.productLink} onPress={() => onOpenProduct(item.product.id)}>
                <Feather name="message-square" size={14} color="#FF8C42" />
                <Text style={styles.productLinkText}>Pertanyaan soal produknya? Lihat komentar produk</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 24 },
  productLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingVertical: 10 },
  productLinkText: { color: '#FF8C42', fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
