import { Platform } from 'react-native';
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

export const MAX_VIDEO_SEC = 60;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // sama dengan batas bucket 'videos' di schema.sql

// Unggah video dari galeri ke bucket 'videos' di path {user_id}/{waktu}.mp4.
// Native: file dibaca sebagai bytes oleh expo-file-system lalu dikirim sebagai ArrayBuffer.
//   (fetch bawaan Expo SDK 55+ TIDAK mendukung FormData bergaya {uri, name, type}; galatnya
//   "Unsupported FormDataPart implementation". Base64 juga dihindari karena membengkak 33% di memori JS.)
// Web: Blob dari fetch(uri).
export async function uploadVideo(
  userId: string,
  localUri: string,
  mimeType: 'video/mp4' | 'video/quicktime'
): Promise<{ path: string | null; error: string | null }> {
  const ext = mimeType === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${userId}/${Date.now()}.${ext}`;

  try {
    let body: ArrayBuffer | Blob;
    if (Platform.OS === 'web') {
      body = await (await fetch(localUri)).blob();
    } else {
      // import dinamis: modul native ini tidak dimuat di web
      const { File } = await import('expo-file-system');
      const bytes = await new File(localUri).bytes();
      body = bytes.buffer as ArrayBuffer;
    }
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.videos)
      .upload(path, body, { contentType: mimeType, upsert: false });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : 'Gagal mengunggah video.' };
  }
}
