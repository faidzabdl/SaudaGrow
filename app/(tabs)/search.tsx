import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { RemoteImage } from '../../src/components/RemoteImage';

const PRICE_FILTERS = [
  { label: 'Semua Harga', value: null },
  { label: '< Rp 20K', value: 20000 },
  { label: '< Rp 35K', value: 35000 },
  { label: '< Rp 50K', value: 50000 },
];

export default function SearchScreen() {
  const { products, loading, reload } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  // Kategori diambil dari data produk yang ada, bukan daftar tetap.
  const categories = useMemo(
    () => ['Semua', ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))],
    [products]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.umkm.name.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q));
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchPrice = !maxPrice || p.price <= maxPrice;
      return matchQuery && matchCat && matchPrice;
    });
  }, [products, query, selectedCategory, maxPrice]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Cari Makanan</Text>
          <Text style={styles.subtitle}>Temukan UMKM F&B favoritmu</Text>
        </View>

        {/* Search box */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nasi uduk, bakso, martabak..."
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Price filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.priceScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {PRICE_FILTERS.map(f => (
            <TouchableOpacity
              key={String(f.value)}
              style={[styles.priceChip, maxPrice === f.value && styles.priceChipActive]}
              onPress={() => setMaxPrice(f.value)}
            >
              <Text style={[styles.priceChipText, maxPrice === f.value && styles.priceChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={reload}
        ListHeaderComponent={
          <Text style={styles.resultCount}>{results.length} produk ditemukan</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={48} color="#374151" />
            <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
            <Text style={styles.emptySubText}>Coba kata kunci lain</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${item.id}`)}>
            <RemoteImage uri={item.image_url} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardUMKM} numberOfLines={1}>{item.umkm.name}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
                <View style={styles.ratingRow}>
                  <Feather name="bookmark" size={11} color="#FF6B35" />
                  <Text style={styles.ratingText}>{item.save_count}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#1A1A1A', paddingBottom: 8 },
  headerInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2A2A2A', borderRadius: 12,
    marginHorizontal: 16, paddingHorizontal: 12, height: 44,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  catScroll: { marginBottom: 8 },
  priceScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#2A2A2A',
    borderWidth: 1, borderColor: '#374151',
  },
  catChipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  catChipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  priceChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 16, backgroundColor: '#2A2A2A',
    borderWidth: 1, borderColor: '#374151',
  },
  priceChipActive: { backgroundColor: '#FF8C42', borderColor: '#FF8C42' },
  priceChipText: { color: '#9CA3AF', fontSize: 12 },
  priceChipTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { padding: 12, paddingBottom: 100 },
  resultCount: { color: '#9CA3AF', fontSize: 13, marginBottom: 12, marginLeft: 4 },
  card: {
    flex: 1, margin: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  cardImage: { width: '100%', height: 140 },
  popularBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  discountBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#FF3B5C',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  discountBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardBody: { padding: 10 },
  cardName: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 3 },
  cardUMKM: { color: '#9CA3AF', fontSize: 11, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { color: '#FF8C42', fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#FBBF24', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubText: { color: '#6B7280', fontSize: 13, marginTop: 6 },
});
