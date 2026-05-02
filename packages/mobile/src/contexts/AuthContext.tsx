import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { getSupabaseErrorMessage } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchLegacyId(authId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_id_mapping')
    .select('legacy_id')
    .eq('auth_id', authId)
    .single();

  if (error || !data) {
    console.warn('Legacy ID mapping not found for auth ID:', authId);
    return authId; // fallback to auth.id for new users without mapping yet
  }
  return data.legacy_id;
}

function mapSupabaseUserToAppUser(
  supabaseUser: import('@supabase/supabase-js').User,
  legacyId: string,
): User {
  return {
    id: supabaseUser.id,
    legacyId,
    email: supabaseUser.email ?? '',
    name: supabaseUser.user_metadata?.name ?? '',
    role: (supabaseUser.user_metadata?.role as UserRole) ?? 'elderly',
    onboardingComplete:
      supabaseUser.user_metadata?.onboardingComplete ?? false,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const legacyId = await fetchLegacyId(session.user.id);
          setUser(mapSupabaseUserToAppUser(session.user, legacyId));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error bootstrapping session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const legacyId = await fetchLegacyId(session.user.id);
        setUser(mapSupabaseUserToAppUser(session.user, legacyId));
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error, 'Erro ao fazer login'));
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name, role },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error, 'Erro ao criar conta'));
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(getSupabaseErrorMessage(error, 'Erro ao fazer logout'));
    }
  };

  const refreshUser = async () => {
    if (!user) {
      return;
    }

    const {
      data: { user: freshUser },
    } = await supabase.auth.getUser();

    if (freshUser) {
      const legacyId = await fetchLegacyId(freshUser.id);
      setUser(mapSupabaseUserToAppUser(freshUser, legacyId));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};