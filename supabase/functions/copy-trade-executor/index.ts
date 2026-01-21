import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Jupiter swap API
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface CopyTradeRequest {
  userId: string;
  sourceWalletId: string;
  sourceWalletAddress?: string;
  sourceSignature: string;
  tokenMint: string;
  tokenSymbol: string;
  tradeType: 'buy' | 'sell';
  sourceAmountSol: number;
  platform?: string;
}

async function sendTelegramNotification(
  supabaseUrl: string,
  supabaseKey: string,
  type: 'copy_trade_success' | 'copy_trade_failed',
  data: Record<string, any>
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ type, data }),
    });
    const result = await response.json();
    console.log(`Telegram notification sent:`, result);
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
  }
}

async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number
) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: Math.floor(amount * 1e9).toString(), // Convert SOL to lamports
    slippageBps: slippageBps.toString(),
  });

  const response = await fetch(`${JUPITER_QUOTE_API}?${params}`);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter quote failed: ${error}`);
  }
  return response.json();
}

async function executeJupiterSwap(
  quoteResponse: any,
  userPublicKey: string
) {
  const response = await fetch(JUPITER_SWAP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter swap failed: ${error}`);
  }
  return response.json();
}

async function signAndSendTransaction(
  swapTransaction: string,
  privateKeyBase58: string
): Promise<string> {
  // Import base58 and ed25519
  const bs58 = await import('https://esm.sh/bs58@5.0.0');
  const nacl = await import('https://esm.sh/tweetnacl@1.0.3');
  
  // Decode private key
  const privateKeyBytes = bs58.default.decode(privateKeyBase58);
  const keypair = nacl.default.sign.keyPair.fromSecretKey(privateKeyBytes);
  
  // Decode the transaction
  const transactionBuffer = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
  
  // Sign the transaction
  const signature = nacl.default.sign.detached(transactionBuffer, keypair.secretKey);
  
  // Create signed transaction
  // The transaction already has a signature placeholder, we need to replace it
  const signedTransaction = new Uint8Array(transactionBuffer.length);
  signedTransaction.set(transactionBuffer);
  
  // Insert signature at the correct position (after the signature count byte)
  signedTransaction.set(signature, 1);
  
  // Send to Solana
  const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
  
  const sendResponse = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [
        btoa(String.fromCharCode(...signedTransaction)),
        { 
          encoding: 'base64',
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      ],
    }),
  });
  
  const result = await sendResponse.json();
  
  if (result.error) {
    throw new Error(`Transaction failed: ${result.error.message}`);
  }
  
  return result.result;
}

async function getPublicKeyFromPrivate(privateKeyBase58: string): Promise<string> {
  const bs58 = await import('https://esm.sh/bs58@5.0.0');
  const nacl = await import('https://esm.sh/tweetnacl@1.0.3');
  
  const privateKeyBytes = bs58.default.decode(privateKeyBase58);
  const keypair = nacl.default.sign.keyPair.fromSecretKey(privateKeyBytes);
  
  return bs58.default.encode(keypair.publicKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const privateKey = Deno.env.get('COPY_TRADE_PRIVATE_KEY');
    
    if (!privateKey) {
      throw new Error('COPY_TRADE_PRIVATE_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: CopyTradeRequest = await req.json();
    const { userId, sourceWalletId, sourceSignature, tokenMint, tokenSymbol, tradeType, sourceAmountSol, platform } = body;

    console.log(`Processing copy trade: ${tradeType} ${tokenSymbol} for ${sourceAmountSol} SOL`);

    // Get user's copy trade settings
    const { data: settings, error: settingsError } = await supabase
      .from('copy_trade_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      throw new Error('Copy trade settings not found');
    }

    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Copy trading is disabled' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if trade was already copied
    const { data: existingTrade } = await supabase
      .from('copy_trades')
      .select('id')
      .eq('source_signature', sourceSignature)
      .eq('user_id', userId)
      .single();

    if (existingTrade) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Trade already copied' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate trade amount (respect max position)
    const tradeAmountSol = Math.min(sourceAmountSol, settings.max_position_sol);
    
    // Create copy trade record
    const { data: copyTrade, error: insertError } = await supabase
      .from('copy_trades')
      .insert({
        user_id: userId,
        source_wallet_id: sourceWalletId,
        source_signature: sourceSignature,
        token_mint: tokenMint,
        token_symbol: tokenSymbol,
        trade_type: tradeType,
        source_amount_sol: sourceAmountSol,
        executed_amount_sol: tradeAmountSol,
        status: 'executing',
        platform: platform || 'jupiter',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create copy trade record: ${insertError.message}`);
    }

    try {
      // Get user's public key from private key
      const userPublicKey = await getPublicKeyFromPrivate(privateKey);
      console.log(`User wallet: ${userPublicKey}`);

      // Determine input/output mints based on trade type
      const inputMint = tradeType === 'buy' ? SOL_MINT : tokenMint;
      const outputMint = tradeType === 'buy' ? tokenMint : SOL_MINT;
      const amount = tradeAmountSol;

      // Get Jupiter quote
      const slippageBps = Math.floor(settings.slippage_percent * 100);
      console.log(`Getting Jupiter quote with ${slippageBps} bps slippage`);
      
      const quoteResponse = await getJupiterQuote(inputMint, outputMint, amount, slippageBps);
      console.log(`Quote received: ${JSON.stringify(quoteResponse).substring(0, 200)}`);

      // Execute swap
      const swapResponse = await executeJupiterSwap(quoteResponse, userPublicKey);
      console.log(`Swap transaction created`);

      // Sign and send transaction
      const txSignature = await signAndSendTransaction(swapResponse.swapTransaction, privateKey);
      console.log(`Transaction sent: ${txSignature}`);

      // Update copy trade record with success
      await supabase
        .from('copy_trades')
        .update({
          status: 'completed',
          tx_signature: txSignature,
          executed_at: new Date().toISOString(),
        })
        .eq('id', copyTrade.id);

      // Also save to trades table
      await supabase
        .from('trades')
        .insert({
          user_id: userId,
          token_mint: tokenMint,
          token_symbol: tokenSymbol,
          trade_type: tradeType,
          amount_sol: tradeAmountSol,
          amount_token: 0, // Will be updated when we parse the tx
          tx_signature: txSignature,
          status: 'completed',
        });

      // Send Telegram success notification
      await sendTelegramNotification(supabaseUrl, supabaseServiceKey, 'copy_trade_success', {
        token: tokenSymbol,
        tokenMint,
        action: tradeType,
        amount: sourceAmountSol,
        executedAmount: tradeAmountSol,
        platform: platform || 'jupiter',
        txHash: txSignature,
        sourceWallet: body.sourceWalletAddress || sourceWalletId,
      });

      return new Response(JSON.stringify({
        success: true,
        txSignature,
        amountSol: tradeAmountSol,
        message: `Successfully copied ${tradeType} trade for ${tokenSymbol}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (execError) {
      console.error('Trade execution error:', execError);
      
      const errorMessage = execError instanceof Error ? execError.message : 'Unknown error';
      
      // Update copy trade with error
      await supabase
        .from('copy_trades')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', copyTrade.id);

      // Send Telegram failure notification
      await sendTelegramNotification(supabaseUrl, supabaseServiceKey, 'copy_trade_failed', {
        token: tokenSymbol,
        tokenMint,
        action: tradeType,
        amount: sourceAmountSol,
        platform: platform || 'jupiter',
        sourceWallet: body.sourceWalletAddress || sourceWalletId,
        errorMessage,
      });

      throw execError;
    }

  } catch (error) {
    console.error('Copy trade executor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
