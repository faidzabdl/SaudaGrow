import { distanceKm } from './geo';
import type { Coords, FeedItem } from '../types';

// Skor rekomendasi feed (C2) dan diversifikasi UMKM (C3).
// Sengaja sederhana dan bisa dijelaskan, bukan "kotak hitam": setiap sinyal punya bobot yang terlihat di sini.
//
//  - popularitas : suka + 2*simpan + 3*klik Pesan (skala log, dinormalkan terhadap yang tertinggi)
//  - kesegaran   : meluruh ke setengah dalam kira-kira 10 hari (exp(-umur/14 hari))
//  - jarak       : 1/(1 + km/5); hanya bila lokasi sudah diizinkan
//  - kecocokan   : (hanya pengguna dengan riwayat) kategori produk yang pernah disukai/disimpan
//
// Sinyal yang tidak tersedia (mis. tanpa lokasi) dibuang dan bobot sisanya dinormalkan ulang,
// sehingga tamu tanpa izin lokasi tetap mendapat urutan yang masuk akal.

export interface RankInput {
  coords: Coords | null;
  likedVideoIds: string[];
  savedProductIds: string[];
  now: number;
}

const W = { pop: 0.3, fresh: 0.25, dist: 0.15, aff: 0.3 };
const DAY_MS = 24 * 60 * 60 * 1000;

const engagement = (i: FeedItem) => i.like_count + 2 * i.product.save_count + 3 * i.product.order_count;

export function scoreFeed(items: FeedItem[], input: RankInput): { item: FeedItem; score: number }[] {
  const maxPop = Math.log1p(Math.max(0, ...items.map(engagement)));

  // Kecocokan kategori dari riwayat suka/simpan pengguna.
  const byVideo = new Map(items.map(i => [i.video.id, i]));
  const byProduct = new Map(items.map(i => [i.product.id, i]));
  const catCount = new Map<string, number>();
  const bump = (cat: string | null | undefined) => cat && catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
  input.likedVideoIds.forEach(id => bump(byVideo.get(id)?.product.category));
  input.savedProductIds.forEach(id => bump(byProduct.get(id)?.product.category));
  const maxCat = Math.max(0, ...catCount.values());
  const hasHistory = maxCat > 0;

  return items.map(item => {
    let sum = 0;
    let weight = 0;
    const add = (w: number, v: number) => { sum += w * v; weight += w; };

    add(W.pop, maxPop > 0 ? Math.log1p(engagement(item)) / maxPop : 0);

    const ageDays = Math.max(0, (input.now - Date.parse(item.video.created_at)) / DAY_MS);
    add(W.fresh, Math.exp(-ageDays / 14));

    if (input.coords) {
      const km = distanceKm(input.coords, { lat: item.product.umkm.lat, lng: item.product.umkm.lng });
      add(W.dist, 1 / (1 + km / 5));
    }
    if (hasHistory) {
      add(W.aff, (catCount.get(item.product.category ?? '') ?? 0) / maxCat);
    }
    return { item, score: weight > 0 ? sum / weight : 0 };
  });
}

// C3: jangan menampilkan UMKM yang sama berturut-turut (UMKM berbeda dengan produk sama boleh).
// Serakah: ambil item berskor tertinggi yang UMKM-nya berbeda dari item sebelumnya.
// Bila sisa item semuanya dari UMKM yang sama, mau tak mau berurutan.
export function diversify(items: FeedItem[]): FeedItem[] {
  const rest = [...items];
  const out: FeedItem[] = [];
  while (rest.length > 0) {
    const last = out.length > 0 ? out[out.length - 1].product.umkm_id : null;
    let idx = rest.findIndex(i => i.product.umkm_id !== last);
    if (idx === -1) idx = 0;
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}

export function rankFeed(items: FeedItem[], input: RankInput): FeedItem[] {
  const scored = scoreFeed(items, input).sort(
    (a, b) => b.score - a.score || a.item.video.id.localeCompare(b.item.video.id)
  );
  return diversify(scored.map(s => s.item));
}
