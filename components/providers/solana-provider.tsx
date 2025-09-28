'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CloverWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
require('@solana/wallet-adapter-react-ui/styles.css');

interface Props {
  children: ReactNode;
}

export const SolanaProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => {
    const isProduction = process.env.NEXT_PUBLIC_SOLANA_CONFIG === 'PROD';
    const network = isProduction ? 'mainnet-beta' : 'devnet';
    
    // Use Helius RPC endpoints
    const defaultEndpoint = isProduction
      ? 'https://mainnet.helius-rpc.com/?api-key=' + process.env.NEXT_PUBLIC_HELIUS_API_KEY
      : 'https://devnet.helius-rpc.com/?api-key=' + process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    
    const configuredEndpoint = isProduction
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL_PROD
      : process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEV;
    
    return configuredEndpoint || defaultEndpoint;
  }, []);

  const wallets = useMemo(() => {
    const isProduction = process.env.NEXT_PUBLIC_SOLANA_CONFIG === 'PROD';
    const baseWallets = [new SolflareWalletAdapter()];
    
    if (isProduction) {
      return [
        ...baseWallets,
        new SolflareWalletAdapter(),
        new TorusWalletAdapter(), 
        new PhantomWalletAdapter(),
        new LedgerWalletAdapter(),
        new CloverWalletAdapter()
      ];
    }
    
    return baseWallets;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};