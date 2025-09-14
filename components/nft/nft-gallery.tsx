'use client';

import { FC, useEffect, useState } from 'react';
import { useNFT, NFTMetadata } from '@/hooks/use-nft';
import { useWallet } from '@solana/wallet-adapter-react';

export const NFTGallery: FC = () => {
  const { publicKey } = useWallet();
  const { loading, error, fetchUserNFTs } = useNFT();
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);

  useEffect(() => {
    const loadNFTs = async () => {
      if (publicKey) {
        const userNFTs = await fetchUserNFTs();
        setNfts(userNFTs);
      }
    };

    loadNFTs();
  }, [publicKey, fetchUserNFTs]);

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Connect your wallet to view your NFTs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No NFTs found in your collection</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {nfts.map((nft, index) => (
        <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-lg font-semibold truncate">{nft.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {nft.description}
            </p>
            <div className="mt-4 space-y-2">
              {nft.attributes.map((attr, attrIndex) => (
                <div
                  key={attrIndex}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-500">{attr.trait_type}:</span>
                  <span className="font-medium">{attr.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};