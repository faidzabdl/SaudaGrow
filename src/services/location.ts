import * as Location from 'expo-location';
import type { Coords } from '../types';

// Lokasi perangkat HANYA dipakai di perangkat untuk menghitung jarak; tidak dikirim ke server mana pun.
// Izin diminta saat fitur jarak dipakai, bukan saat aplikasi dibuka.
export async function getDeviceLocation(): Promise<{ coords: Coords | null; error: string | null }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { coords: null, error: 'Izin lokasi ditolak, jarak tidak bisa dihitung.' };
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null };
  } catch {
    return { coords: null, error: 'Lokasi tidak tersedia. Aktifkan GPS lalu coba lagi.' };
  }
}

// Dipakai untuk ranking feed: TIDAK memunculkan dialog izin dan tidak menyalakan GPS.
// Hanya membaca lokasi terakhir yang diketahui bila izin sudah diberikan sebelumnya (hemat baterai).
export async function getLocationIfGranted(): Promise<Coords | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    return last ? { lat: last.coords.latitude, lng: last.coords.longitude } : null;
  } catch {
    return null;
  }
}
