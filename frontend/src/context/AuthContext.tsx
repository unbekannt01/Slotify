import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, loginApi, getMeApi } from '../api/authApi';
import { getItem, setItem, deleteItem } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: 'admin' | 'owner' | null;
  shopId: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const TOKEN_KEY = 'slotify_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const storedToken = await getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        const me = await getMeApi();
        setUser(me);
      }
    } catch (err) {
      console.warn('[AuthContext] Session initialization error:', err);
      await deleteItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await loginApi(email, pass);
      await setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await deleteItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshMe = async (): Promise<void> => {
    try {
      const me = await getMeApi();
      setUser(me);
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh user:', err);
    }
  };

  const role = user?.role || null;
  const shopId = user?.shopId || (user?.shop ? user.shop.id : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        shopId,
        isLoading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
