'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SolanaAgent } from '@/lib/solana-agent';
import { useNFT } from '@/hooks/use-nft';
import { useToast } from '@/hooks/use-toast';

interface AchievementNFTProps {
  achievementName: string;
  description: string;
  imageUrl: string;
}

export const AchievementNFT: FC<AchievementNFTProps> = ({
  achievementName,
  description,
  imageUrl,
}) => {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mintNFT: mintWithMetaplex } = useNFT();
  const { toast } = useToast();

  const mintNFT = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const metadata = {
        name: achievementName,
        symbol: 'ACHV',
        description,
        image: imageUrl,
        attributes: [
          {
            trait_type: 'Achievement Type',
            value: 'Learning'
          },
          {
            trait_type: 'Date Earned',
            value: new Date().toISOString()
          }
        ]
      };

      const result = await mintWithMetaplex(metadata);
      if (!result) {
        toast({ title: 'Mint failed', description: 'Could not mint the achievement NFT. Please try again.' });
        return;
      }
      
      toast({
        title: 'Success!',
        description: `Achievement NFT minted successfully. Mint address: ${result.mint}`,
      });

    } catch (err) {
      console.error('Error minting NFT:', err);
      setError('Failed to mint NFT. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <img
          src={imageUrl}
          alt={achievementName}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h3 className="text-lg font-semibold">{achievementName}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <Button
        onClick={mintNFT}
        disabled={loading || !publicKey}
        className="w-full"
      >
        {loading ? 'Minting...' : 'Mint Achievement NFT'}
      </Button>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};