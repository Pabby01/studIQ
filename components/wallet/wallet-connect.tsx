'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';

export const WalletConnect: FC = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center gap-2">
      {connected && publicKey ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-500">Connected:</span>
          <span className="text-sm font-mono">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
        </div>
      ) : null}
      <WalletMultiButton className="wallet-adapter-button-trigger" />
    </div>
  );
};