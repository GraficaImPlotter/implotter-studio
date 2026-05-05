import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { setErrorUser } from '@/services/errorTracking';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAdminRole = async (userId: string | null) => {
      if (!mounted) return;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!mounted) return;

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar role do usuário:', error.message);
      }

      setIsAdmin(!!data);
    };

    const syncAuthState = async (session: Session | null) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      // Atualiza usuário no serviço de monitoramento de erros
      setErrorUser(currentUser?.id ?? null, currentUser?.email);

      await loadAdminRole(currentUser?.id ?? null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAuthState(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void syncAuthState(session);
      })
      .catch((error) => {
        console.error('Erro ao recuperar sessão:', error);
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
    setErrorUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
