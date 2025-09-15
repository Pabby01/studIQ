import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId } from '@/lib/supabase-server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMetaplexInstance } from '@/lib/metaplex-server';

// POST /api/nfts/mint -> mint NFT with metadata
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRowId = await resolveUserRowId({ supabase, authId: authData.user.id });
    if (!userRowId) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 });

    const body = await req.json();
    const { name, symbol, description, image, attributes } = body;

    if (!name || !symbol || !description || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Solana connection
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    
    // Use environment payer key or generate temporary one for devnet
    const payer = process.env.SOLANA_PAYER_KEY 
      ? Keypair.fromSecretKey(Buffer.from(process.env.SOLANA_PAYER_KEY, 'base64'))
      : Keypair.generate();

    // Initialize Metaplex for NFT operations
    const metaplex = createMetaplexInstance(connection, payer);

    // Mint NFT
    const { nft } = await metaplex.nfts().create({
      name,
      symbol,
      description,
      uri: image, // Assuming image is already an IPFS/Arweave URI
      sellerFeeBasisPoints: 0,
      attributes
    });

    // Store NFT data
    const { data, error } = await supabase
      .from('nfts')
      .insert({
        user_id: userRowId,
        mint_address: nft.address.toBase58(),
        metadata_url: nft.uri,
        description: description
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      mint: nft.address,
      metadata: {
        name: nft.name,
        symbol: nft.symbol,
        uri: nft.uri,
        sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
        attributes: nft.attributes
      }
    }, { status: 201 });

  } catch (e: any) {
    console.error('NFT minting error:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}