// Satu sumber kebenaran untuk nilai yang dipakai di banyak tempat.
export const APP_NAME = 'SaudaGrow';

// Batas video (sesuai konsep: maksimal 60 detik, hemat server / Green IT).
export const VIDEO_MAX_SECONDS = 60;

// Nama bucket Supabase Storage (harus sama dengan supabase/schema.sql).
export const STORAGE_BUCKETS = {
  videos: 'videos',
  images: 'images',
} as const;
