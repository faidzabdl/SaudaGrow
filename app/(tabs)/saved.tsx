import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../src/context/AuthContext';
import { RemoteImage } from '../../src/components/RemoteImage';

export default function SavedScreen() {
  const { savedProducts, toggleSave, loading, reload } = useApp();
  const { session } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Tersimpan</Text>
          <Text style={styles.subtitle}>{session ? `${savedProducts.length} produk tersimpan` : 'Masuk untuk menyimpan produk'}</Text>
        </View>
      </SafeAreaView>

      <FlatList
        data={savedProducts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={reload}
        ListEmptyComponent={
          session ? (
            <View style={styles.empty}>
              <Feather name="bookmark" size={56} color="#374151" />
              <Text style={styles.emptyText}>Belum ada yang disimpan</Text>
              <Text style={styles.emptySubText}>Tap ikon bookmark di feed untuk menyimpan produk</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="lock" size={56} color="#374151" />
              <Text style={styles.emptyText}>Masuk untuk melihat produk tersimpan</Text>
              <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
                <Text style={styles.loginBtnText}>Masuk / Daftar</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/product/${item.id}`)}
            activeOpacity={0.85}
          >
            <RemoteImage uri={item.image_url} style={styles.cardImg} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardUMKM} numberOfLines={1}>{item.umkm.name}</Text>
              {!!item.umkm.city && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={11} color="#FF8C42" />
                  <Text style={styles.locationText}> {item.umkm.city}</Text>
                </View>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.price}>Rp {item.price.toLocaleString('id-ID')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.unsaveBtn} onPress={() => toggleSave(item.id)}>
              <Feather name="bookmark" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A' },
  headerInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 17, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptySubText: { color: '#6B7280', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 14, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  cardImg: { width: 90, height: 90 },
  cardInfo: { flex: 1, padding: 12 },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardUMKM: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationText: { color: '#FF8C42', fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: '#FF8C42', fontSize: 14, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#FBBF24', fontSize: 12, fontWeight: '600' },
  unsaveBtn: { padding: 16 },
  loginBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  loginBtnText: { color: '#fff', fontWeight: '800' },
});
