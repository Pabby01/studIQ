import { Connection, Keypair } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';

export function createMetaplexInstance(connection: Connection, payer: Keypair) {
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer));

  return metaplex;
}