'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: FC = () => {
  const { connected } = useWallet();

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200">
          Connected
        </span>
      ) : (
        <WalletMultiButton className="wallet-adapter-button-trigger" />
      )}
    </div>
  );
};