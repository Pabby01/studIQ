'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaAgent } from '@/lib/solana-agent';

export const WalletBalance: FC = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }

      try {
        setLoading(true);
        const agent = new SolanaAgent(wallet, process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const bal = await agent.getBalance(publicKey.toString());
        setBalance(bal);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, wallet]);

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