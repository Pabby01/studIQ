'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaAgent } from '@/lib/solana-agent';
import { useToast } from '@/hooks/use-toast';

const FALLBACK_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL_PROD,
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com'
];

export const WalletBalance: FC = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const fetchBalanceWithFallback = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let lastError = null;
    for (const endpoint of FALLBACK_RPC_ENDPOINTS) {
      if (!endpoint) continue;
      
      try {
        const agent = new SolanaAgent(wallet, endpoint);
        const bal = await agent.getBalance(publicKey.toString());
        setBalance(bal);
        setRetryCount(0); // Reset retry count on success
        return;
      } catch (error) {
        console.error(`Error fetching balance from ${endpoint}:`, error);
        lastError = error;
      }
    }

    // If all endpoints failed
    setBalance(null);
    setRetryCount(prev => prev + 1);
    
    if (retryCount >= 3) {
      toast({
        title: "Balance Update Failed",
        description: "Unable to fetch wallet balance. Please try again later.",
        variant: "destructive"
      });
    }
  }, [publicKey, wallet, retryCount, toast]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }

      try {
        setLoading(true);
        await fetchBalanceWithFallback();
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, fetchBalanceWithFallback]);

  if (!publicKey) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Balance:</span>
      {loading ? (
        <span className="animate-pulse">Loading...</span>
      ) : (
        <span className="font-mono">
          {balance !== null ? `${balance.toFixed(4)} SOL` : 'Error'}
        </span>
      )}
    </div>
  );
};