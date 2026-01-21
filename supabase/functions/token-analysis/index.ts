import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenAnalysis {
  mint: string;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  priceChange24h: number | null;
  supply: number | null;
  holders: number | null;
  devHoldings: number | null;
  txCount24h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  createdAt: string | null;
  pairAddress: string | null;
  dexId: string | null;
}

async function fetchDexScreenerData(mint: string): Promise<Partial<TokenAnalysis>> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!response.ok) throw new Error("DexScreener API error");
    
    const data = await response.json();
    const pairs = data.pairs || [];
    
    if (pairs.length === 0) return { mint };
    
    const mainPair = pairs.sort((a: any, b: any) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    return {
      mint,
      name: mainPair.baseToken?.name || null,
      symbol: mainPair.baseToken?.symbol || null,
      priceUsd: parseFloat(mainPair.priceUsd) || null,
      marketCap: mainPair.marketCap || mainPair.fdv || null,
      volume24h: mainPair.volume?.h24 || null,
      liquidity: mainPair.liquidity?.usd || null,
      priceChange24h: mainPair.priceChange?.h24 || null,
      txCount24h: (mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0),
      buys24h: mainPair.txns?.h24?.buys || null,
      sells24h: mainPair.txns?.h24?.sells || null,
      createdAt: mainPair.pairCreatedAt ? new Date(mainPair.pairCreatedAt).toISOString() : null,
      pairAddress: mainPair.pairAddress || null,
      dexId: mainPair.dexId || null,
    };
  } catch (error) {
    console.error("DexScreener fetch error:", error);
    return { mint };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mint } = await req.json();
    
    if (!mint) {
      return new Response(JSON.stringify({ error: "Token mint address required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing token:", mint);
    const dexData = await fetchDexScreenerData(mint);

    const tokenAnalysis: TokenAnalysis = {
      mint,
      name: dexData.name || null,
      symbol: dexData.symbol || null,
      priceUsd: dexData.priceUsd || null,
      marketCap: dexData.marketCap || null,
      volume24h: dexData.volume24h || null,
      liquidity: dexData.liquidity || null,
      priceChange24h: dexData.priceChange24h || null,
      supply: null,
      holders: null,
      devHoldings: null,
      txCount24h: dexData.txCount24h || null,
      buys24h: dexData.buys24h || null,
      sells24h: dexData.sells24h || null,
      createdAt: dexData.createdAt || null,
      pairAddress: dexData.pairAddress || null,
      dexId: dexData.dexId || null,
    };

    return new Response(JSON.stringify(tokenAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Token analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
