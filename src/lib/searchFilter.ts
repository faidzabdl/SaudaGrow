import { distanceKm } from './geo';
import type { CatalogProduct, Coords, SmartFilter, SortMode } from '../types';

export interface Criteria {
  text: string;
  category: string | null;
  maxPrice: number | null;
  tags: string[];
  sort: SortMode;
  coords: Coords | null;
}

export interface ResultItem {
  product: CatalogProduct;
  distanceKm: number | null;
}

export function criteriaFromSmart(f: SmartFilter, coords: Coords | null): Criteria {
  return {
    text: f.kata_kunci ?? '',
    category: f.kategori,
    maxPrice: f.harga_maks,
    tags: f.tag,
    sort: f.urut ?? (f.gunakan_lokasi ? 'terdekat' : 'default'),
    coords,
  };
}

const haystack = (p: CatalogProduct) =>
  [p.name, p.umkm.name, p.category ?? '', p.description ?? '', p.tags.join(' ')].join(' ').toLowerCase();

// Pencarian murni (tanpa efek samping) agar mudah diuji: filter, hitung jarak, lalu urutkan.
export function runSearch(products: CatalogProduct[], c: Criteria): ResultItem[] {
  const tokens = c.text.toLowerCase().split(/\s+/).filter(Boolean);
  const wantedTags = c.tags.map(t => t.toLowerCase());

  const items: ResultItem[] = products
    .filter(p => {
      const h = haystack(p);
      if (!tokens.every(t => h.includes(t))) return false;
      if (c.category && (p.category ?? '').toLowerCase() !== c.category.toLowerCase()) return false;
      if (c.maxPrice !== null && p.price > c.maxPrice) return false;
      // Tag bersifat "salah satu cocok" (tag produk atau teksnya) agar tidak terlalu menyaring.
      if (wantedTags.length > 0) {
        const own = p.tags.map(t => t.toLowerCase());
        if (!wantedTags.some(t => own.includes(t) || h.includes(t))) return false;
      }
      return true;
    })
    .map(p => ({
      product: p,
      distanceKm: c.coords ? distanceKm(c.coords, { lat: p.umkm.lat, lng: p.umkm.lng }) : null,
    }));

  const dist = (i: ResultItem) => i.distanceKm ?? Number.POSITIVE_INFINITY; // tanpa jarak -> paling akhir
  const popularity = (i: ResultItem) => i.product.save_count + i.product.order_count;
  switch (c.sort) {
    case 'termurah': items.sort((a, b) => a.product.price - b.product.price); break;
    case 'terdekat': items.sort((a, b) => dist(a) - dist(b)); break;
    case 'terpopuler': items.sort((a, b) => popularity(b) - popularity(a)); break;
    case 'terbaru': items.sort((a, b) => b.product.created_at.localeCompare(a.product.created_at)); break;
    default: break;
  }
  return items;
}
