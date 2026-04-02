import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { User, UserRole } from '../types';
import { api, getApiErrorMessage, setAuthToken } from '../services/api';
import { authStorage } from '../lib/authStorage';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = async (token: string, userData: User) => {
    setAuthToken(token);
    await Promise.all([authStorage.setToken(token), authStorage.setUser(userData)]);
    setUser(userData);
  };

  const loadProfileFromApi = async (): Promise<User | null> => {
    try {
      const response = await api.get('/auth/me');
      return response.data?.user ?? null;
    } catch (error) {
      console.error('Error loading user profile from API:', error);
      return null;
    }
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          authStorage.getToken(),
          authStorage.getUser(),
        ]);

        if (!token) {
          setUser(null);
          return;
        }

        setAuthToken(token);
        if (storedUser) {
          setUser(storedUser);
        }

        const freshUser = await loadProfileFromApi();
        if (!freshUser) {
          await authStorage.clear();
          setAuthToken(null);
          setUser(null);
          return;
        }

        setUser(freshUser);
        await authStorage.setUser(freshUser);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password,
      });
      const token = response.data?.token as string;
      const userData = response.data?.user as User;

      if (!token || !userData) {
        throw new Error('Resposta de autenticação inválida');
      }

      await persistSession(token, userData);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Erro ao fazer login'));
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
      const response = await api.post('/signup', {
        email: normalizedEmail,
        password,
        name,
        role,
      });

      const token = response.data?.token as string;
      const userData = response.data?.user as User;

      if (!token || !userData) {
        throw new Error('Resposta de cadastro inválida');
      }

      await persistSession(token, userData);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Erro ao criar conta'));
    }
  };

  const logout = async () => {
    try {
      await authStorage.clear();
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(getApiErrorMessage(error, 'Erro ao fazer logout'));
    }
  };

  const refreshUser = async () => {
    if (!user) {
      return;
    }

    const updatedUser = await loadProfileFromApi();
    if (updatedUser) {
      setUser(updatedUser);
      await authStorage.setUser(updatedUser);
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