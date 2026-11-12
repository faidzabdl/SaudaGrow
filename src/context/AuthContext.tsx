import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchProfile, signOut as doSignOut } from '../services/auth';
import { fetchMyUmkm } from '../services/umkm';
import type { Profile, Role, Umkm } from '../types';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  umkm: Umkm | null;
  role: Role;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Profil dan UMKM disimpan bersama id pemiliknya. Nilai yang tampil diturunkan dari id sesi sekarang,
  // jadi tidak perlu mengosongkan state lewat effect saat keluar/ganti akun.
  const [data, setData] = useState<{ userId: string; profile: Profile | null; umkm: Umkm | null } | null>(null);


  // Sesi: ambil yang tersimpan, lalu ikuti perubahan (login, logout, refresh token).
  // Callback sengaja sinkron: panggilan Supabase lain dilakukan di effect di bawah.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const loaded = data !== null && data.userId === userId ? data : null;
  const profile = loaded?.profile ?? null;
  const umkm = loaded?.umkm ?? null;
  // Memuat selama sudah login tetapi data untuk akun ini belum datang.
  const dataLoading = userId !== null && loaded === null;

  const load = useCallback(async (id: string) => {
    const [p, u] = await Promise.all([fetchProfile(id), fetchMyUmkm(id)]);
    setData({ userId: id, profile: p, umkm: u });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([fetchProfile(userId), fetchMyUmkm(userId)])
      .then(([p, u]) => {
        if (!cancelled) setData({ userId, profile: p, umkm: u });
      })
      .catch(() => {
        if (!cancelled) setData({ userId, profile: null, umkm: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const signOut = useCallback(async () => {
    await doSignOut();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      profile,
      umkm,
      // Sudah login tapi profil belum terbaca: anggap 'user' (peran paling rendah).
      role: !session ? 'guest' : profile?.role ?? 'user',
      loading: initializing || dataLoading,
      refresh,
      signOut,
    }),
    [session, profile, umkm, initializing, dataLoading, refresh, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
