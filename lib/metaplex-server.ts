import { Connection, Keypair } from '@solana/web3.js';
import { Metaplex, keypairIdentity, bundlrStorage } from '@metaplex-foundation/js';

export function createMetaplexInstance(connection: Connection, payer: Keypair) {
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      timeout: 60000,
    }));

  return metaplex;
}