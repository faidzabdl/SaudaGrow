import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { RemoteImage } from '../../src/components/RemoteImage';
import { formatDistance } from '../../src/lib/geo';
import { criteriaFromSmart, runSearch } from '../../src/lib/searchFilter';
import { askSmartSearch } from '../../src/services/smartSearch';
import type { Coords, SmartFilter, SortMode } from '../../src/types';

const PRICE_FILTERS = [
  { label: 'Semua Harga', value: null },
  { label: '< Rp 20K', value: 20000 },
  { label: '< Rp 35K', value: 35000 },
  { label: '< Rp 50K', value: 50000 },
];

const EXAMPLES = ['makanan pedas murah dekat sini', 'bakso di bawah 25 ribu', 'yang paling laris'];
const SORT_LABEL: Record<Exclude<SortMode, 'default'>, string> = {
  termurah: 'Termurah', terdekat: 'Terdekat', terpopuler: 'Terpopuler', terbaru: 'Terbaru',
};

export default function SearchScreen() {
  const { products, loading, reload, coords, requestLocation } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [nearest, setNearest] = useState(false);
  const [smart, setSmart] = useState<SmartFilter | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Kategori & tag diambil dari data produk yang ada, bukan daftar tetap.
  const categories = useMemo(
    () => ['Semua', ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))],
    [products]
  );
  const vocab = useMemo(() => {
    const freq = new Map<string, number>();
    products.forEach(p => p.tags.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1)));
    return {
      categories: categories.filter(c => c !== 'Semua'),
      tags: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([t]) => t),
    };
  }, [products, categories]);

  const results = useMemo(
    () =>
      runSearch(
        products,
        smart
          ? criteriaFromSmart(smart, coords)
          : {
              text: query,
              category: selectedCategory === 'Semua' ? null : selectedCategory,
              maxPrice,
              tags: [],
              sort: nearest ? 'terdekat' : 'default',
              coords,
            }
      ),
    [products, smart, coords, query, selectedCategory, maxPrice, nearest]
  );

  const ensureLocation = async (): Promise<Coords | null> => {
    if (coords) return coords;
    const r = await requestLocation();
    if (!r.coords) setNotice(r.error);
    return r.coords;
  };

  const toggleNearest = async () => {
    setNotice(null);
    if (nearest) return setNearest(false);
    if (await ensureLocation()) setNearest(true);
  };

  const runSmart = async (text: string) => {
    const q = text.trim();
    setNotice(null);
    if (q.length < 3) return setNotice('Tulis minimal 3 huruf, mis. "ayam pedas murah".');
    setQuery(q);
    setAiLoading(true);
    const res = await askSmartSearch(q, vocab);
    if (!res.filter) {
      setAiLoading(false);
      setSmart(null);
      return setNotice('Pencarian AI sedang tidak tersedia, memakai pencarian kata kunci biasa.');
    }
    let filter = res.filter;
    if (filter.gunakan_lokasi || filter.urut === 'terdekat') {
      const here = await ensureLocation();
      if (!here) filter = { ...filter, urut: filter.urut === 'terdekat' ? null : filter.urut, gunakan_lokasi: false };
    }
    setSmart(filter);
    setAiLoading(false);
  };

  const clearSmart = () => { setSmart(null); setNotice(null); };

  // Chip hasil tafsir AI; setiap chip bisa dihapus agar pengguna tetap memegang kendali.
  const smartChips = smart
    ? [
        smart.kata_kunci && { key: 'kk', label: `"${smart.kata_kunci}"`, remove: () => setSmart({ ...smart, kata_kunci: null }) },
        smart.kategori && { key: 'kat', label: smart.kategori, remove: () => setSmart({ ...smart, kategori: null }) },
        ...smart.tag.map(t => ({ key: `tag-${t}`, label: `#${t}`, remove: () => setSmart({ ...smart, tag: smart.tag.filter(x => x !== t) }) })),
        smart.harga_maks && { key: 'hrg', label: `≤ Rp ${smart.harga_maks.toLocaleString('id-ID')}`, remove: () => setSmart({ ...smart, harga_maks: null }) },
        smart.urut && { key: 'urut', label: SORT_LABEL[smart.urut], remove: () => setSmart({ ...smart, urut: null, gunakan_lokasi: false }) },
      ].filter((c): c is { key: string; label: string; remove: () => void } => !!c)
    : [];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Cari Makanan</Text>
          <Text style={styles.subtitle}>Temukan UMKM F&B favoritmu</Text>
        </View>

        {/* Search box + tombol AI */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Mis. ayam pedas murah dekat sini"
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={t => { setQuery(t); if (smart) setSmart(null); }}
            returnKeyType="search"
            onSubmitEditing={() => runSmart(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); clearSmart(); }}>
              <Feather name="x" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.aiBtn} onPress={() => runSmart(query)} disabled={aiLoading} accessibilityLabel="Cari dengan AI">
            {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="zap" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>

        {notice && <Text style={styles.notice}>{notice}</Text>}

        {smart ? (
          <>
            <View style={styles.aiHeader}>
              <View style={styles.aiBadge}>
                <Feather name="zap" size={12} color="#FF6B35" />
                <Text style={styles.aiBadgeText}>Dibantu AI</Text>
              </View>
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={clearSmart}>
                <Text style={styles.aiClear}>Hapus semua</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {smartChips.length === 0 && <Text style={styles.aiNote}>AI tidak menemukan filter khusus; menampilkan semua produk.</Text>}
              {smartChips.map(c => (
                <TouchableOpacity key={c.key} style={styles.aiChip} onPress={c.remove}>
                  <Text style={styles.aiChipText}>{c.label}</Text>
                  <Feather name="x" size={12} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.aiNote}>
              Teks pencarianmu dikirim ke layanan AI (Gemini) untuk dipahami; lokasi tidak dikirim. Hasil AI bisa keliru, ketuk chip untuk mengubahnya.
            </Text>
          </>
        ) : (
          <>
            {query.length === 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {EXAMPLES.map(e => (
                  <TouchableOpacity key={e} style={styles.example} onPress={() => runSmart(e)}>
                    <Text style={styles.exampleText}>✨ {e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

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

            {/* Price filter + terdekat */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.priceScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              <TouchableOpacity style={[styles.priceChip, nearest && styles.priceChipActive]} onPress={toggleNearest}>
                <Text style={[styles.priceChipText, nearest && styles.priceChipTextActive]}>📍 Terdekat</Text>
              </TouchableOpacity>
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
          </>
        )}
      </SafeAreaView>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => item.product.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={reload}
        ListHeaderComponent={<Text style={styles.resultCount}>{results.length} produk ditemukan</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={48} color="#374151" />
            <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
            <Text style={styles.emptySubText}>{smart ? 'Ketuk salah satu chip di atas untuk melonggarkan filter' : 'Coba kata kunci lain'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${item.product.id}`)}>
            <RemoteImage uri={item.product.image_url} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.cardUMKM} numberOfLines={1}>{item.product.umkm.name}</Text>
              {item.distanceKm !== null && (
                <View style={styles.distRow}>
                  <Feather name="map-pin" size={11} color="#10B981" />
                  <Text style={styles.distText}>{formatDistance(item.distanceKm)}</Text>
                </View>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>Rp {item.product.price.toLocaleString('id-ID')}</Text>
                <View style={styles.ratingRow}>
                  <Feather name="bookmark" size={11} color="#FF6B35" />
                  <Text style={styles.ratingText}>{item.product.save_count}</Text>
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
  aiBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  notice: { color: '#FBBF24', fontSize: 12, marginHorizontal: 16, marginBottom: 6 },
  examplesRow: { marginBottom: 4 },
  example: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FF6B3518', borderWidth: 1, borderColor: '#FF6B3544' },
  exampleText: { color: '#FF8C42', fontSize: 12 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B3522', borderWidth: 1, borderColor: '#FF6B35', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  aiBadgeText: { color: '#FF6B35', fontSize: 12, fontWeight: '800' },
  aiClear: { color: '#9CA3AF', fontSize: 12, marginLeft: 'auto' },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  aiChipText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' },
  aiNote: { color: '#6B7280', fontSize: 11, marginHorizontal: 16, marginTop: 6 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  distText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
});

