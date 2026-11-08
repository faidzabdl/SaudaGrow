import { supabase } from '../lib/supabase';
import { base64ToBytes } from '../lib/base64';
import { STORAGE_BUCKETS } from '../config';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // sama dengan batas bucket 'images' di schema.sql
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Unggah gambar (base64 dari expo-image-picker) ke bucket 'images'.
// Path wajib {user_id}/{nama-file} agar lolos policy storage.
export async function uploadImage(
  userId: string,
  base64: string,
  mimeType: string | null | undefined,
  prefix: string
): Promise<{ url: string | null; error: string | null }> {
  const contentType = mimeType && EXT[mimeType] ? mimeType : 'image/jpeg';
  const bytes = base64ToBytes(base64);
  if (bytes.length > MAX_IMAGE_BYTES) return { url: null, error: 'Ukuran gambar maksimal 5 MB.' };

  const path = `${userId}/${prefix}-${Date.now()}.${EXT[contentType]}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.images)
    .upload(path, bytes.buffer as ArrayBuffer, { contentType, upsert: false });
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(STORAGE_BUCKETS.images).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
