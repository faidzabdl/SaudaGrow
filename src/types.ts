import type { ComponentProps } from 'react';
import type { Feather } from '@expo/vector-icons';

// Nama ikon Feather yang valid (menggantikan `any` pada prop ikon).
export type FeatherName = ComponentProps<typeof Feather>['name'];

// ---- Domain (mengikuti supabase/schema.sql) ----
export type Role = 'guest' | 'user' | 'umkm' | 'admin';
export type UmkmStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: Exclude<Role, 'guest'>;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Umkm {
  id: string;
  owner_id: string;
  owner_name: string;
  name: string;
  contact: string;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
  logo_url: string;
  legal_id: string | null;
  status: UmkmStatus;
  created_at: string;
}

export interface UmkmInput {
  owner_name: string;
  name: string;
  contact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  logo_url: string;
  legal_id: string | null;
}

// ---- Katalog publik (produk, video, link pesan) ----
export type OrderPlatform = 'gofood' | 'grabfood' | 'shopeefood' | 'whatsapp';

export interface OrderLink {
  platform: OrderPlatform;
  url: string;
}

// UMKM yang tampil ke publik: tanpa legal_id dan owner_id.
export type PublicUmkm = Omit<Umkm, 'legal_id' | 'owner_id'>;

export interface Product {
  id: string;
  umkm_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  tags: string[];
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CatalogProduct extends Product {
  umkm: PublicUmkm;
  order_links: OrderLink[];
  save_count: number;
  order_count: number;
  avg_rating: number | null; // null = belum ada rating
  rating_count: number;
  umkm_avg_rating: number | null; // agregat rating seluruh produk UMKM
  umkm_rating_count: number;
  comment_count: number; // jumlah komentar PRODUK (B2); komentar video dihitung per video di FeedItem
}

export interface Video {
  id: string;
  product_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  caption: string | null;
  duration_sec: number | null;
  created_at: string;
}

export interface FeedItem {
  video: Video;
  videoUrl: string;
  product: CatalogProduct;
  like_count: number;
  comment_count: number; // jumlah komentar VIDEO ini (terpisah dari komentar produk)
}

// ---- Dashboard UMKM (kelola konten) ----
export type ManagedVideo = Video & { like_count: number };

export interface ManagedProduct extends Product {
  order_links: OrderLink[];
  videos: ManagedVideo[];
  save_count: number;
  order_count: number;
  avg_rating: number | null;
  rating_count: number;
}

export interface DashboardStats {
  products: number;
  videos: number;
  likes: number;
  saves: number;
  orders: number;
  byPlatform: Record<OrderPlatform, number>;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  image_url: string | null;
  is_active: boolean;
  links: Partial<Record<OrderPlatform, string>>;
}

// ---- Smart Search (AI) & lokasi ----
export interface Coords {
  lat: number;
  lng: number;
}

export type SortMode = 'default' | 'termurah' | 'terdekat' | 'terpopuler' | 'terbaru';

// Filter terstruktur hasil interpretasi AI (sudah divalidasi di Edge Function dan di aplikasi).
export interface SmartFilter {
  kategori: string | null;
  tag: string[];
  harga_maks: number | null;
  urut: Exclude<SortMode, 'default'> | null;
  gunakan_lokasi: boolean;
  kata_kunci: string | null;
}

// ---- Rating dan ulasan (B3) ----
export interface MyRating {
  rating: number;
  review: string | null;
}

// ---- Komentar (B2): komentar produk (tab Komentar di halaman produk) dan komentar video (panel di feed) ----
export interface ProductComment {
  id: string;
  product_id: string;
  body: string;
  created_at: string;
  author_name: string;
  is_owner: boolean; // penulis = pemilik UMKM atas produk ini
  is_mine: boolean;
}

export interface Review {
  rating: number;
  review: string;
  created_at: string;
  is_mine: boolean;
}
