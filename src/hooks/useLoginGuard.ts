import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// Menjalankan aksi hanya jika sudah login; guest diarahkan ke layar login.
export function useLoginGuard() {
  const { session } = useAuth();
  const router = useRouter();
  return useCallback(
    (action: () => void) => {
      if (!session) {
        router.push('/login');
        return;
      }
      action();
    },
    [session, router]
  );
}
