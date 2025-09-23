import { Connection, Transaction, VersionedTransaction, SendOptions, TransactionSignature, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { SolanaAgentKit, type Config } from 'solana-agent-kit';
import type { Plugin } from 'solana-agent-kit';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import BlinksPlugin from '@solana-agent-kit/plugin-blinks';

export class SolanaAgent extends SolanaAgentKit {
  private rpcUrl: string;

  constructor(wallet: WalletContextState, rpc_url?: string, config: Partial<Config> = {}) {
    // Determine environment and use appropriate RPC URL
    const isProduction = process.env.NEXT_PUBLIC_SOLANA_CONFIG === 'PROD';
    const defaultRpcUrl = isProduction
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL_PROD
      : process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEV;
    
    const rpcUrlToUse = rpc_url || defaultRpcUrl || 'https://api.devnet.solana.com';
    
    // Local connection for sending transactions via wallet adapter's sendTransaction
    const connectionForSend = new Connection(rpcUrlToUse, {
      commitment: 'confirmed',
      wsEndpoint: rpcUrlToUse.replace('https://', 'wss://'),
    });

    // Adapt WalletContextState to SolanaAgentKit BaseWallet interface
    const walletWrapper = {
      publicKey: wallet.publicKey!,
      signTransaction: wallet.signTransaction!.bind(wallet),
      signAllTransactions: wallet.signAllTransactions!.bind(wallet),
      signMessage: wallet.signMessage
        ? (message: Uint8Array) => wallet.signMessage!(message)
        : async (_message: Uint8Array) => {
            throw new Error('Wallet does not support signMessage');
          },
      signAndSendTransaction: async (
        transaction: Transaction | VersionedTransaction,
        options?: SendOptions
      ): Promise<{ signature: TransactionSignature }> => {
        if (!wallet.sendTransaction) {
          throw new Error('Wallet does not support sendTransaction');
        }
        const signature = await wallet.sendTransaction(
          transaction as Transaction,
          connectionForSend,
          options
        );
        return { signature };
      },
    } as any;

    super(walletWrapper, rpcUrlToUse, config as Config);
    this.rpcUrl = rpcUrlToUse;

    // Register plugins
    this.use(TokenPlugin as unknown as Plugin);
    // NFT and DeFi plugins removed to avoid Node.js module issues in browser
    this.use(MiscPlugin as unknown as Plugin);
    this.use(BlinksPlugin as unknown as Plugin);
  }

  static create(wallet: WalletContextState, rpc_url?: string) {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      throw new Error('Wallet not connected or missing required capabilities');
    }
    return new SolanaAgent(wallet, rpc_url);
  }

  async getBalance(address: string): Promise<number> {
    const conn = new Connection(this.rpcUrl);
    const lamports = await conn.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  }

  // NFT operations should be moved to server-side API routes
  async fetchNFTs(owner: PublicKey): Promise<any[]> {
    // Implement server-side NFT fetching
    const response = await fetch(`/api/nfts?owner=${owner.toBase58()}`);
    const nfts = await response.json();
    return nfts;
  }

  async mintNFT(params: { name: string; symbol: string; description: string; image: string; attributes: Array<{ trait_type: string; value: string }>; }): Promise<{ mint: PublicKey; metadata: any; }> {
    // Implement server-side NFT minting
    const response = await fetch('/api/nfts/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const result = await response.json();
    return result;
  }
}