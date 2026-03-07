import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'visitor' | 'client' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const demoUsers: Record<string, User & { password: string }> = {
  'admin@implotter.com': { id: 'usr-admin', name: 'Admin ImPlotter', email: 'admin@implotter.com', role: 'admin', password: 'admin123' },
  'cliente@email.com': { id: 'usr-client', name: 'Maria Silva', email: 'cliente@email.com', role: 'client', password: 'cliente123' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const role: UserRole = user?.role ?? 'visitor';

  const login = async (email: string, password: string): Promise<boolean> => {
    const found = demoUsers[email];
    if (found && found.password === password) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    setUser({ id: 'usr-new', name, email, role: 'client' });
    return true;
  };

  const logout = () => setUser(null);

  const setDemoRole = (r: UserRole) => {
    if (r === 'visitor') { setUser(null); return; }
    if (r === 'admin') { const { password: _, ...u } = demoUsers['admin@implotter.com']; setUser(u); return; }
    if (r === 'client') { const { password: _, ...u } = demoUsers['cliente@email.com']; setUser(u); return; }
  };

  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, setDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
