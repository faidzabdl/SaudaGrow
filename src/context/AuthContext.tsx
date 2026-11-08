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
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [umkm, setUmkm] = useState<Umkm | null>(null);

  const userId = session?.user.id ?? null;

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

  const load = useCallback(async (id: string) => {
    const [p, u] = await Promise.all([fetchProfile(id), fetchMyUmkm(id)]);
    setProfile(p);
    setUmkm(u);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setUmkm(null);
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    load(userId).finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

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
