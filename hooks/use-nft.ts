import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaAgent } from '@/lib/solana-agent';
import { NFTPlugin } from '@solana-agent-kit/plugin-nft';

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export const useNFT = () => {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');

  const fetchUserNFTs = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      const agent = SolanaAgent.create({
        publicKey,
        signTransaction,
      } as any);

      const nftPlugin = agent.use(NFTPlugin);
      const nfts = await nftPlugin.fetchNFTs(publicKey);

      return nfts.map(nft => ({
        name: nft.metadata.name,
        symbol: nft.metadata.symbol,
        description: nft.metadata.description,
        image: nft.metadata.image,
        attributes: nft.metadata.attributes,
        mint: nft.mint.toBase58(),
      }));
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError('Failed to fetch NFTs');
      return [];
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  const mintNFT = useCallback(async (metadata: NFTMetadata) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const agent = SolanaAgent.create({
        publicKey,
        signTransaction,
      } as any);

      const nftPlugin = agent.use(NFTPlugin);
      
      const { mint, metadata: mintedMetadata } = await nftPlugin.mintNFT({
        name: metadata.name,
        symbol: 'ACHV',
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes,
      });

      return {
        mint: mint.toBase58(),
        metadata: mintedMetadata,
      };
    } catch (err) {
      console.error('Error minting NFT:', err);
      setError('Failed to mint NFT');
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connection]);

  return {
    loading,
    error,
    fetchUserNFTs,
    mintNFT,
  };
};