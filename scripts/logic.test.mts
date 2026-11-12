import { test } from 'node:test';
import assert from 'node:assert';
import { rankFeed, unitRandom, diversify } from '../src/lib/feedRank';
import { runSearch } from '../src/lib/searchFilter';
import { distanceKm, formatDistance } from '../src/lib/geo';

const NOW = Date.parse('2026-11-09T00:00:00Z');
const base = { coords: null, likedVideoIds: [], savedProductIds: [], now: NOW };

// Data uji minimal; `any` hanya di berkas uji ini.
const feedItem = (id: string, umkm: string, cat: string, likes: number, saves: number, orders: number, ageDays: number): any => ({
  video: { id, created_at: new Date(NOW - ageDays * 86400000).toISOString() },
  like_count: likes,
  product: { id: 'p-' + id, umkm_id: umkm, category: cat, save_count: saves, order_count: orders, umkm: { lat: -6.9, lng: 107.6 } },
});
const FEED = [
  feedItem('v1', 'A', 'Bakso', 50, 10, 5, 1), feedItem('v2', 'B', 'Bakso', 40, 8, 3, 2), feedItem('v3', 'C', 'Nasi', 30, 6, 2, 3),
  feedItem('v4', 'D', 'Nasi', 5, 1, 0, 0), feedItem('v5', 'E', 'Camilan', 1, 0, 0, 30), feedItem('v6', 'F', 'Nasi', 0, 0, 0, 10),
];
const ids = (r: any[]) => r.map(i => i.video.id).join(',');

test('ranking tanpa seed: deterministik, yang paling populer dan segar di depan', () => {
  assert.equal(rankFeed(FEED, base)[0].video.id, 'v1');
  assert.equal(new Set(rankFeed(FEED, base).map(i => i.video.id)).size, FEED.length);
});

test('ranking: seed sama -> urutan sama; seed berbeda -> bervariasi', () => {
  assert.equal(ids(rankFeed(FEED, { ...base, seed: 123 })), ids(rankFeed(FEED, { ...base, seed: 123 })));
  const orders = new Set<string>();
  for (let s = 1; s <= 50; s++) orders.add(ids(rankFeed(FEED, { ...base, seed: s })));
  assert.ok(orders.size > 10);
});

test('acak berbobot: skor tinggi lebih sering di depan, skor rendah tetap kadang muncul', () => {
  const first: Record<string, number> = {};
  for (let s = 1; s <= 2000; s++) {
    const f = rankFeed(FEED, { ...base, seed: s * 7919 })[0].video.id;
    first[f] = (first[f] ?? 0) + 1;
  }
  assert.ok((first.v1 ?? 0) > (first.v5 ?? 0) * 3);
  assert.ok((first.v5 ?? 0) + (first.v6 ?? 0) > 0);
});

test('penalti sudah ditonton menurunkan posisi tanpa menyembunyikan', () => {
  const r = rankFeed(FEED, { ...base, seenVideoIds: ['v1'] });
  assert.ok(r.findIndex(i => i.video.id === 'v1') > 0);
  assert.equal(r.length, FEED.length);
});

test('personalisasi: kategori yang pernah disukai naik', () => {
  const before = rankFeed(FEED, base).findIndex(i => i.video.id === 'v5');
  const after = rankFeed(FEED, { ...base, likedVideoIds: ['v5'] }).findIndex(i => i.video.id === 'v5');
  assert.ok(after < before);
});

test('lokasi: item terdekat naik', () => {
  const a = feedItem('n1', 'A', 'x', 0, 0, 0, 5);
  const b = feedItem('n2', 'B', 'x', 0, 0, 0, 5);
  b.product.umkm = { lat: -7.8, lng: 110.4 };
  assert.equal(rankFeed([a, b], { ...base, coords: { lat: -6.9, lng: 107.6 } })[0].video.id, 'n1');
});

test('rating: rata-rata Bayesian, satu rating 5 tidak mengalahkan banyak rating 4,6', () => {
  const rated = (id: string, avg: number | null, n: number): any => {
    const it = feedItem(id, id, 'x', 5, 1, 1, 5);
    it.product.avg_rating = avg;
    it.product.rating_count = n;
    return it;
  };
  assert.equal(rankFeed([rated('lo', 2.0, 10), rated('hi', 5.0, 10), rated('none', null, 0)], base)[0].video.id, 'hi');
  assert.equal(rankFeed([rated('one', 5.0, 1), rated('many', 4.6, 40)], base)[0].video.id, 'many');
});

test('diversifikasi: UMKM sama tidak berurutan bila masih ada alternatif', () => {
  const dup = [feedItem('a1', 'X', 'c', 9, 9, 9, 1), feedItem('a2', 'X', 'c', 8, 8, 8, 1), feedItem('a3', 'X', 'c', 7, 7, 7, 1),
    feedItem('b1', 'Y', 'c', 1, 0, 0, 5), feedItem('c1', 'Z', 'c', 1, 0, 0, 5)];
  for (let s = 1; s <= 200; s++) {
    const r = rankFeed(dup, { ...base, seed: s });
    for (let i = 1; i < r.length; i++) {
      const alternativeLeft = r.slice(i).some(x => x.product.umkm_id !== r[i - 1].product.umkm_id);
      if (alternativeLeft) assert.notEqual(r[i - 1].product.umkm_id, r[i].product.umkm_id);
    }
  }
  assert.equal(diversify([]).length, 0);
});

test('unitRandom selalu di (0,1) dan stabil', () => {
  for (let s = 0; s < 1000; s++) {
    const u = unitRandom(s, 'v' + s);
    assert.ok(u > 0 && u < 1);
  }
  assert.equal(unitRandom(5, 'x'), unitRandom(5, 'x'));
});

test('mode nearby: yang terdekat di depan; antar UMKM berdekatan, ranking jadi pembeda', () => {
  const mkAt = (id: string, lat: number, likes: number): any => {
    const it = feedItem(id, id, 'x', likes, likes, likes, 5);
    it.product.umkm = { lat, lng: 107.6 };
    return it;
  };
  const here = { lat: -6.9, lng: 107.6 };
  // jauh tetapi sangat populer vs dekat tetapi sepi: yang dekat harus menang
  const r1 = rankFeed([mkAt('far-popular', -7.9, 500), mkAt('near-quiet', -6.9, 0)], { ...base, coords: here, mode: 'nearby' });
  assert.equal(r1[0].video.id, 'near-quiet');
  // sama-sama dekat (selisih sekitar 0,5 km): yang jauh lebih populer boleh unggul
  const r2 = rankFeed([mkAt('a-quiet', -6.9, 0), mkAt('b-popular', -6.905, 500)], { ...base, coords: here, mode: 'nearby' });
  assert.equal(r2[0].video.id, 'b-popular');
  // deterministik tanpa seed
  assert.equal(ids(rankFeed(FEED, { ...base, coords: here, mode: 'nearby' })), ids(rankFeed(FEED, { ...base, coords: here, mode: 'nearby' })));
});

// ---- pencarian ----
const product = (id: string, name: string, price: number, cat: string, tags: string[], lat: number, saves = 0, orders = 0): any => ({
  id, name, price, category: cat, tags, description: null, save_count: saves, order_count: orders,
  created_at: '2026-11-01T00:00:00Z', umkm: { name: 'Warung ' + id, lat, lng: 107.6 },
});
const CATALOG = [
  product('p1', 'Ayam Geprek Level 10', 22000, 'Nasi & Lauk', ['pedas', 'ayam'], -6.90, 5, 2),
  product('p2', 'Bakso Urat', 18000, 'Bakso & Mie', ['kuah'], -7.50, 9, 6),
  product('p3', 'Martabak Manis', 35000, 'Camilan', ['manis'], -6.95, 1, 0),
];
const none = { text: '', category: null, maxPrice: null, tags: [], sort: 'default' as const, coords: null };

test('pencarian: semua kata harus cocok, tidak peka huruf besar/kecil', () => {
  assert.deepEqual(runSearch(CATALOG, { ...none, text: 'AYAM geprek' }).map(r => r.product.id), ['p1']);
  assert.equal(runSearch(CATALOG, { ...none, text: 'ayam bakso' }).length, 0);
});

test('pencarian: filter kategori, harga maksimum, dan tag (salah satu cocok)', () => {
  assert.deepEqual(runSearch(CATALOG, { ...none, category: 'Camilan' }).map(r => r.product.id), ['p3']);
  assert.deepEqual(runSearch(CATALOG, { ...none, maxPrice: 20000 }).map(r => r.product.id), ['p2']);
  assert.deepEqual(runSearch(CATALOG, { ...none, tags: ['pedas', 'manis'] }).map(r => r.product.id).sort(), ['p1', 'p3']);
});

test('pencarian: urutan termurah, terdekat (tanpa jarak paling akhir), terpopuler', () => {
  assert.deepEqual(runSearch(CATALOG, { ...none, sort: 'termurah' }).map(r => r.product.id), ['p2', 'p1', 'p3']);
  const near = runSearch(CATALOG, { ...none, sort: 'terdekat', coords: { lat: -6.9, lng: 107.6 } });
  assert.deepEqual(near.map(r => r.product.id), ['p1', 'p3', 'p2']);
  assert.ok(near[0].distanceKm !== null && near[0].distanceKm < 1);
  assert.equal(runSearch(CATALOG, { ...none, sort: 'terdekat' })[0].distanceKm, null);
  assert.equal(runSearch(CATALOG, { ...none, sort: 'terpopuler' })[0].product.id, 'p2');
});

test('jarak: haversine dan pemformatan', () => {
  const bandungJakarta = distanceKm({ lat: -6.9175, lng: 107.6191 }, { lat: -6.2088, lng: 106.8456 });
  assert.ok(bandungJakarta > 110 && bandungJakarta < 130);
  assert.equal(distanceKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
  assert.equal(formatDistance(1.234), '1,2 km');
  assert.ok(formatDistance(0.45).endsWith(' m'));
});
