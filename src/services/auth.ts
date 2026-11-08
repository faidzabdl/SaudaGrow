import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

// Terjemahan pesan galat Supabase Auth yang paling sering muncul.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah.';
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';
  if (m.includes('already registered')) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (m.includes('password should be at least')) return 'Kata sandi minimal 6 karakter.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Format email tidak valid.';
  if (m.includes('rate limit')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (m.includes('network') || m.includes('fetch')) return 'Tidak ada koneksi internet.';
  return message;
}

export async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { error: error ? friendlyAuthError(error.message) : null };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  // full_name dibaca trigger handle_new_user untuk mengisi profiles.display_name.
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: displayName.trim() } },
  });
  if (error) return { error: friendlyAuthError(error.message), needsConfirmation: false };
  // Jika "Confirm email" aktif di Supabase, user dibuat tapi belum ada sesi.
  return { error: null, needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return (data as Profile | null) ?? null;
}
