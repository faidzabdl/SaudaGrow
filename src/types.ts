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
}

// ---- Dashboard UMKM (kelola konten) ----
export type ManagedVideo = Video & { like_count: number };

export interface ManagedProduct extends Product {
  order_links: OrderLink[];
  videos: ManagedVideo[];
  save_count: number;
  order_count: number;
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
