/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { SolanaProvider } from './solana-provider';
import { SolanaAgent } from '@/lib/solana-agent';
import { useWallet } from '@solana/wallet-adapter-react';

const useSolanaAgent = () => {
  const wallet = useWallet();
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new SolanaAgent(wallet, endpoint);
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, username: string) => Promise<any>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-2xl font-semibold">Supabase environment variables are missing</h1>
          <p className="text-muted-foreground">
            Please create a .env.local file in the project root and set the following variables, then restart the dev server:
          </p>
          <pre className="bg-muted p-3 rounded-md text-left overflow-auto"><code>{`NEXT_PUBLIC_SUPABASE_URL=your-project-url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}</code></pre>
          <p className="text-sm text-muted-foreground">
            You can find these in Supabase Dashboard → Project Settings → API.
          </p>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL + '/auth/callback',
      }
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getAccessToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      getAccessToken
    }}>
      <SolanaProvider>
        {children}
      </SolanaProvider>
    </AuthContext.Provider>
  );
}