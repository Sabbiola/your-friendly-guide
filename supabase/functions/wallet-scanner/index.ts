import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RPC endpoints with fallback - prioritize Helius if available
function getRpcEndpoints(): string[] {
  const heliusApiKey = Deno.env.get("HELIUS_API_KEY");
  const endpoints: string[] = [];
  
  if (heliusApiKey) {
    endpoints.push(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`);
  }
  
  endpoints.push(
    "https://rpc.ankr.com/solana",
    "https://api.mainnet-beta.solana.com"
  );
  
  return endpoints;
}

interface WalletTransaction {
  signature: string;
  blockTime: number;
  type: 'buy' | 'sell';
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  platform: string;
}

async function fetchWithFallback(body: object): Promise<any> {
  const rpcEndpoints = getRpcEndpoints();
  
  for (const rpc of rpcEndpoints) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) return data;
      }
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints failed");
}

async function getRecentSignatures(address: string, limit = 20): Promise<string[]> {
  const data = await fetchWithFallback({
    method: "getSignaturesForAddress",
    params: [address, { limit }],
  });
  return (data.result || []).map((s: any) => s.signature);
}

async function parseTransaction(signature: string): Promise<WalletTransaction | null> {
  try {
    const data = await fetchWithFallback({
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    });

    if (!data.result) return null;

    const tx = data.result;
    const meta = tx.meta;
    const blockTime = tx.blockTime || 0;

    if (!meta || meta.err) return null;

    // Detect if it's a swap by looking at token balance changes
    const preBalances = meta.preTokenBalances || [];
    const postBalances = meta.postTokenBalances || [];
    
    // Find SOL changes
    const preSol = meta.preBalances?.[0] || 0;
    const postSol = meta.postBalances?.[0] || 0;
    const solChange = (postSol - preSol) / 1e9;

    // Find token changes
    for (const post of postBalances) {
      const pre = preBalances.find((p: any) => 
        p.accountIndex === post.accountIndex && p.mint === post.mint
      );
      
      const preAmount = pre?.uiTokenAmount?.uiAmount || 0;
      const postAmount = post.uiTokenAmount?.uiAmount || 0;
      const tokenChange = postAmount - preAmount;
      
      if (Math.abs(tokenChange) > 0 && post.mint !== "So11111111111111111111111111111111111111112") {
        const isBuy = tokenChange > 0;
        
        // Detect platform from logs
        const logs = meta.logMessages || [];
        let platform = 'unknown';
        for (const log of logs) {
          if (log.includes('JUP')) platform = 'jupiter';
          else if (log.includes('Raydium') || log.includes('675kPX')) platform = 'raydium';
          else if (log.includes('pump') || log.includes('6EF8')) platform = 'pumpfun';
        }

        return {
          signature,
          blockTime,
          type: isBuy ? 'buy' : 'sell',
          tokenMint: post.mint,
          tokenSymbol: post.uiTokenAmount?.symbol || post.mint.slice(0, 6),
          tokenAmount: Math.abs(tokenChange),
          solAmount: Math.abs(solChange),
          platform,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error parsing tx:", signature, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { walletAddress, userId } = await req.json();

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "Wallet address required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scanning wallet: ${walletAddress}`);

    // Get recent signatures
    const signatures = await getRecentSignatures(walletAddress, 30);
    console.log(`Found ${signatures.length} recent transactions`);

    // Parse transactions in parallel
    const txPromises = signatures.map(sig => parseTransaction(sig));
    const results = await Promise.all(txPromises);
    const trades = results.filter((t): t is WalletTransaction => t !== null);

    console.log(`Parsed ${trades.length} trades`);

    // If userId provided, save to database
    if (userId && trades.length > 0) {
      // Get wallet ID
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("address", walletAddress)
        .eq("user_id", userId)
        .single();

      if (wallet) {
        // Check which trades are new
        const { data: existingTrades } = await supabase
          .from("trades")
          .select("tx_signature")
          .eq("wallet_id", wallet.id);

        const existingSigs = new Set(existingTrades?.map(t => t.tx_signature) || []);
        const newTrades = trades.filter(t => !existingSigs.has(t.signature));

        if (newTrades.length > 0) {
          const tradeInserts = newTrades.map(t => ({
            user_id: userId,
            wallet_id: wallet.id,
            token_mint: t.tokenMint,
            token_symbol: t.tokenSymbol,
            trade_type: t.type,
            amount_token: t.tokenAmount,
            amount_sol: t.solAmount,
            tx_signature: t.signature,
            status: "completed",
          }));

          await supabase.from("trades").insert(tradeInserts);
          console.log(`Inserted ${newTrades.length} new trades`);

          // Check if copy trading is enabled and trigger copy trades
          const { data: copySettings } = await supabase
            .from("copy_trade_settings")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (copySettings?.is_enabled) {
            console.log(`Copy trading enabled, processing ${newTrades.length} new trades`);
            
            // Trigger copy trade executor for each new trade
            for (const trade of newTrades) {
              try {
                const copyTradeUrl = `${supabaseUrl}/functions/v1/copy-trade-executor`;
                const response = await fetch(copyTradeUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    userId,
                    sourceWalletId: wallet.id,
                    sourceSignature: trade.signature,
                    tokenMint: trade.tokenMint,
                    tokenSymbol: trade.tokenSymbol,
                    tradeType: trade.type,
                    sourceAmountSol: trade.solAmount,
                    platform: trade.platform,
                  }),
                });
                
                const result = await response.json();
                console.log(`Copy trade result for ${trade.tokenSymbol}:`, result);
              } catch (copyError) {
                console.error(`Error triggering copy trade for ${trade.signature}:`, copyError);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      trades,
      count: trades.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Wallet scanner error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
