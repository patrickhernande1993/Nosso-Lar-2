import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Nome de exibição salvo no perfil do usuário (user_metadata.name). */
  displayName: string | null;
  updateName: (name: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  isLoading: true,
  signIn: async () => null,
  signOut: async () => {},
  displayName: null,
  updateName: async () => null,
});

// Traduz os erros mais comuns do Supabase Auth
const translateError = (message: string) => {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Este e-mail ainda não foi confirmado.';
  if (/too many requests|rate limit/i.test(message)) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (/failed to fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique sua internet.';
  return message;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
  }, []);

  /** Retorna null em caso de sucesso, ou a mensagem de erro já traduzida. */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? translateError(error.message) : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    return error ? translateError(error.message) : null;
  };

  const displayName = (session?.user.user_metadata?.name as string | undefined)?.trim() || null;

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut, displayName, updateName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
