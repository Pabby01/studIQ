import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaAgent } from '@/lib/solana-agent';

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
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

  const fetchUserNFTs = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return [] as Array<any>;
    }

    try {
      setLoading(true);
      setError(null);

      const agent = SolanaAgent.create({
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: signAllTransactions!,
      } as any);

      const nfts = await agent.fetchNFTs(publicKey as PublicKey);

      return (nfts as any[]).map((nft: any) => ({
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
      return [] as Array<any>;
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, signTransaction, signAllTransactions]);

  const mintNFT = useCallback(async (metadata: NFTMetadata) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError('Wallet not connected');
      return null as { mint: string; metadata: any } | null;
    }

    try {
      setLoading(true);
      setError(null);

      const agent = SolanaAgent.create({
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: signAllTransactions!,
      } as any);

      const { mint, metadata: mintedMetadata } = await agent.mintNFT({
        name: metadata.name,
        symbol: metadata.symbol || 'ACHV',
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
  }, [publicKey, signTransaction, signAllTransactions, connection]);

  return {
    loading,
    error,
    fetchUserNFTs,
    mintNFT,
  };
};