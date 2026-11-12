import { distanceKm } from './geo';
import type { Coords, FeedItem } from '../types';

// Skor rekomendasi feed (C2) dan diversifikasi UMKM (C3).
// Sengaja sederhana dan bisa dijelaskan, bukan "kotak hitam": setiap sinyal punya bobot yang terlihat di sini.
//
//  - popularitas : suka + 2*simpan + 3*klik Pesan (skala log, dinormalkan terhadap yang tertinggi)
//  - kesegaran   : meluruh ke setengah dalam kira-kira 10 hari (exp(-umur/14 hari))
//  - jarak       : 1/(1 + km/5); hanya bila lokasi sudah diizinkan
//  - kualitas    : rating produk (rata-rata Bayesian: prior 3,5 bernilai 3 rating, jadi 1 rating bintang 5 tidak
//                  langsung mengalahkan produk dengan banyak rating); hanya bila produk sudah punya rating
//  - kecocokan   : (hanya pengguna dengan riwayat) kategori produk yang pernah disukai/disimpan
//  - sudah ditonton : video yang sudah tampil di sesi ini dikalikan 0,35 (turun, tidak disembunyikan)
//
// Sinyal yang tidak tersedia (mis. tanpa lokasi) dibuang dan bobot sisanya dinormalkan ulang,
// sehingga tamu tanpa izin lokasi tetap mendapat urutan yang masuk akal.
//
// Urutan akhir "Untuk Anda" memakai ACAK BERBOBOT (weighted random sampling, Efraimidis-Spirakis): tiap video
// mendapat kunci log(u)/w dengan u acak (0,1) dan w = (0,05 + skor)^2. Skor tinggi cenderung di depan, tetapi
// urutannya berbeda setiap `seed` baru (setiap refresh). Seed yang sama menghasilkan urutan yang sama, sehingga
// urutan tidak berubah saat pengguna menyukai/menyimpan atau saat riwayat selesai dimuat.
//
// Mode "nearby" (tab Terdekat): bobot jarak dominan (50%); sinyal lain menjadi pembeda antar UMKM yang jaraknya
// berdekatan. Dipanggil tanpa seed, jadi urutannya deterministik (yang terdekat benar-benar di depan).

export interface RankInput {
  coords: Coords | null;
  likedVideoIds: string[];
  savedProductIds: string[];
  now: number;
  seed?: number | null; // null/undefined = tanpa pengacakan (urut murni berdasarkan skor)
  seenVideoIds?: string[];
  mode?: 'foryou' | 'nearby';
}

const W_FORYOU = { pop: 0.3, fresh: 0.25, dist: 0.15, aff: 0.3, rating: 0.15 };
const W_NEARBY = { pop: 0.15, fresh: 0.1, dist: 0.5, aff: 0.15, rating: 0.1 };
const RATING_PRIOR = 3.5;
const RATING_PRIOR_N = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEEN_FACTOR = 0.35;
const EPS = 0.05;
const GAMMA = 2;

const engagement = (i: FeedItem) => i.like_count + 2 * i.product.save_count + 3 * i.product.order_count;

export function scoreFeed(items: FeedItem[], input: RankInput): { item: FeedItem; score: number }[] {
  const W = input.mode === 'nearby' ? W_NEARBY : W_FORYOU;
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

  const seen = new Set(input.seenVideoIds ?? []);

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
    if (item.product.rating_count > 0 && item.product.avg_rating != null) {
      const n = item.product.rating_count;
      const bayes = (n * item.product.avg_rating + RATING_PRIOR_N * RATING_PRIOR) / (n + RATING_PRIOR_N);
      add(W.rating, (bayes - 1) / 4);
    }
    if (hasHistory) {
      add(W.aff, (catCount.get(item.product.category ?? '') ?? 0) / maxCat);
    }
    const base = weight > 0 ? sum / weight : 0;
    return { item, score: seen.has(item.video.id) ? base * SEEN_FACTOR : base };
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

// Bilangan acak deterministik di (0,1) dari seed + id (hash 32-bit); bukan Math.random supaya urutan stabil per seed.
export function unitRandom(seed: number, id: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) + 0.5) / 4294967296;
}

export function rankFeed(items: FeedItem[], input: RankInput): FeedItem[] {
  const scored = scoreFeed(items, input);
  const seed = input.seed;
  const keyed = scored.map(s => ({
    item: s.item,
    // seed null: urut murni skor. Selain itu: kunci acak berbobot (makin besar makin di depan).
    key: seed == null ? s.score : Math.log(unitRandom(seed, s.item.video.id)) / Math.pow(EPS + s.score, GAMMA),
  }));
  keyed.sort((a, b) => b.key - a.key || a.item.video.id.localeCompare(b.item.video.id));
  return diversify(keyed.map(k => k.item));
}
