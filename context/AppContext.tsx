import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { fetchFeed, fetchProducts } from '../src/services/catalog';
import { fetchMyEngagement, logOrderClick, setLike, setSave } from '../src/services/engagement';
import { notify } from '../src/lib/dialog';
import type { CatalogProduct, FeedItem, OrderPlatform } from '../src/types';

interface AppContextType {
  feed: FeedItem[];
  products: CatalogProduct[];
  savedProducts: CatalogProduct[];
  likedVideoIds: string[];
  savedProductIds: string[];
  loading: boolean;
  error: string | null;
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

  const [feed, setFeed] = useState<FeedItem[]>([]);
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
      return;
    }
    let cancelled = false;
    fetchMyEngagement(userId).then(e => {
      if (cancelled) return;
      setLikedVideoIds(e.likedVideoIds);
      setSavedProductIds(e.savedProductIds);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
      reload, toggleLike, toggleSave, trackOrder,
    }),
    [feed, products, savedProducts, likedVideoIds, savedProductIds, loading, error, reload, toggleLike, toggleSave, trackOrder]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
