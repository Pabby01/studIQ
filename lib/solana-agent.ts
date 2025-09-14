import { Connection, Transaction, VersionedTransaction, SendOptions, TransactionSignature } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { SolanaAgentKit, type Config } from 'solana-agent-kit';
import type { Plugin } from 'solana-agent-kit';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import NFTPlugin from '@solana-agent-kit/plugin-nft';
import DeFiPlugin from '@solana-agent-kit/plugin-defi';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import BlinksPlugin from '@solana-agent-kit/plugin-blinks';

export class SolanaAgent extends SolanaAgentKit {
  constructor(wallet: WalletContextState, rpc_url?: string, config: Partial<Config> = {}) {
    const rpcUrlToUse = rpc_url || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    // Local connection for sending transactions via wallet adapter's sendTransaction
    const connectionForSend = new Connection(rpcUrlToUse);

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

    // Register plugins
    this.use(TokenPlugin as unknown as Plugin);
    this.use(NFTPlugin as unknown as Plugin);
    this.use(DeFiPlugin as unknown as Plugin);
    this.use(MiscPlugin as unknown as Plugin);
    this.use(BlinksPlugin as unknown as Plugin);
  }

  static create(wallet: WalletContextState, rpc_url?: string) {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      throw new Error('Wallet not connected or missing required capabilities');
    }
    return new SolanaAgent(wallet, rpc_url);
  }
}