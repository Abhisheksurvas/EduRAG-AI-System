import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student } from '../types/index.js';
import { api, getToken, setToken, removeToken } from '../services/api.js';

interface AuthContextType {
  student: Student | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshStudent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshStudent: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      setStudent(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.student) {
        setStudent(res.student);
      } else {
        removeToken();
        setStudent(null);
      }
    } catch {
      removeToken();
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.token) {
      setToken(res.token);
      setStudent(res.student);
    }
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.token) {
      setToken(res.token);
      setStudent(res.student);
    }
  };

  const logout = () => {
    removeToken();
    setStudent(null);
  };

  const refreshStudent = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.student) {
        setStudent(res.student);
      }
    } catch (e) {
      console.error('Failed to refresh student profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        isAuthenticated: Boolean(student),
        isLoading,
        login,
        register,
        logout,
        refreshStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
