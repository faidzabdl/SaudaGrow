import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { fetchFeed, fetchProducts } from '../src/services/catalog';
import { fetchMyEngagement, logOrderClick, setLike, setSave } from '../src/services/engagement';
import { getDeviceLocation, getLocationIfGranted } from '../src/services/location';
import { rankFeed } from '../src/lib/feedRank';
import { notify } from '../src/lib/dialog';
import type { CatalogProduct, Coords, FeedItem, OrderPlatform } from '../src/types';

interface AppContextType {
  feed: FeedItem[];
  products: CatalogProduct[];
  savedProducts: CatalogProduct[];
  likedVideoIds: string[];
  savedProductIds: string[];
  loading: boolean;
  error: string | null;
  coords: Coords | null;
  requestLocation: () => Promise<{ coords: Coords | null; error: string | null }>;
  reload: () => Promise<void>;
  // Aksi di bawah ini mengasumsikan sudah login (layar memakai useLoginGuard).
  toggleLike: (videoId: string) => Promise<void>;
  toggleSave: (productId: string) => Promise<void>;
  trackOrder: (productId: string, platform: OrderPlatform) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [rawFeed, setFeed] = useState<FeedItem[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [rankTick, setRankTick] = useState(0);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [f, p] = await Promise.all([fetchFeed(), fetchProducts()]);
    setFeed(f.data);
    setProducts(p.data);
    setError(f.error ?? p.error);
    setRankTick(t => t + 1); // data baru -> hitung ulang urutan feed
  }, []);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Like/simpan milik user: dimuat saat login, dikosongkan saat keluar.
  useEffect(() => {
    if (!userId) {
      setLikedVideoIds([]);
      setSavedProductIds([]);
      setRankTick(t => t + 1);
      return;
    }
    let cancelled = false;
    fetchMyEngagement(userId).then(e => {
      if (cancelled) return;
      setLikedVideoIds(e.likedVideoIds);
      setSavedProductIds(e.savedProductIds);
      setRankTick(t => t + 1); // riwayat tersedia -> personalisasi urutan
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---- Ranking feed (C2) + diversifikasi UMKM (C3) ----
  // Urutan dihitung HANYA saat data dimuat, riwayat login tersedia, atau lokasi berubah; bukan setiap kali
  // pengguna menyukai/menyimpan, supaya feed tidak berubah urutan saat sedang digulir.
  const latest = useRef({ feed: rawFeed, coords, liked: likedVideoIds, saved: savedProductIds });
  useEffect(() => {
    latest.current = { feed: rawFeed, coords, liked: likedVideoIds, saved: savedProductIds };
  });

  // Lokasi senyap: hanya bila izin sudah pernah diberikan (tanpa dialog baru, tanpa menyalakan GPS).
  useEffect(() => {
    getLocationIfGranted().then(c => {
      if (c) setCoords(c);
    });
  }, []);

  const coordsKey = coords ? `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}` : '';
  useEffect(() => {
    const cur = latest.current;
    setOrder(
      rankFeed(cur.feed, {
        coords: cur.coords,
        likedVideoIds: cur.liked,
        savedProductIds: cur.saved,
        now: Date.now(),
      }).map(f => f.video.id)
    );
  }, [rankTick, coordsKey]);

  // Item mengikuti `order`; item baru yang belum masuk `order` ditaruh di akhir.
  const feed = useMemo(() => {
    const byId = new Map(rawFeed.map(f => [f.video.id, f]));
    const ordered = order.map(id => byId.get(id)).filter((f): f is FeedItem => !!f);
    const seen = new Set(order);
    rawFeed.forEach(f => {
      if (!seen.has(f.video.id)) ordered.push(f);
    });
    return ordered;
  }, [rawFeed, order]);

  const requestLocation = useCallback(async () => {
    const r = await getDeviceLocation();
    if (r.coords) setCoords(r.coords);
    return r;
  }, []);

  // ---- pembaruan lokal (optimistis); dipakai juga untuk membatalkan bila server menolak ----
  const applyLike = useCallback((videoId: string, on: boolean) => {
    setLikedVideoIds(prev => (on ? [...prev.filter(i => i !== videoId), videoId] : prev.filter(i => i !== videoId)));
    setFeed(prev =>
      prev.map(f => (f.video.id === videoId ? { ...f, like_count: Math.max(0, f.like_count + (on ? 1 : -1)) } : f))
    );
  }, []);

  const applySave = useCallback((productId: string, on: boolean) => {
    const bump = (p: CatalogProduct): CatalogProduct =>
      p.id === productId ? { ...p, save_count: Math.max(0, p.save_count + (on ? 1 : -1)) } : p;
    setSavedProductIds(prev => (on ? [...prev.filter(i => i !== productId), productId] : prev.filter(i => i !== productId)));
    setProducts(prev => prev.map(bump));
    setFeed(prev => prev.map(f => ({ ...f, product: bump(f.product) })));
  }, []);

  const toggleLike = useCallback(
    async (videoId: string) => {
      if (!userId) return;
      const on = !likedVideoIds.includes(videoId);
      applyLike(videoId, on);
      const { error: e } = await setLike(userId, videoId, on);
      if (e) {
        applyLike(videoId, !on);
        notify('Gagal menyimpan suka', e);
      }
    },
    [userId, likedVideoIds, applyLike]
  );

  const toggleSave = useCallback(
    async (productId: string) => {
      if (!userId) return;
      const on = !savedProductIds.includes(productId);
      applySave(productId, on);
      const { error: e } = await setSave(userId, productId, on);
      if (e) {
        applySave(productId, !on);
        notify('Gagal menyimpan produk', e);
      }
    },
    [userId, savedProductIds, applySave]
  );

  const trackOrder = useCallback(
    async (productId: string, platform: OrderPlatform) => {
      if (userId) await logOrderClick(userId, productId, platform);
    },
    [userId]
  );

  const savedProducts = useMemo(
    () => products.filter(p => savedProductIds.includes(p.id)),
    [products, savedProductIds]
  );

  const value = useMemo<AppContextType>(
    () => ({
      feed, products, savedProducts, likedVideoIds, savedProductIds, loading, error,
      coords, requestLocation, reload, toggleLike, toggleSave, trackOrder,
    }),
    [feed, products, savedProducts, likedVideoIds, savedProductIds, loading, error, coords, requestLocation, reload, toggleLike, toggleSave, trackOrder]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
