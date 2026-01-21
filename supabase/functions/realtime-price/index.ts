import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mint } = await req.json();
    
    if (!mint) {
      return new Response(JSON.stringify({ error: "Token mint required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching price for mint: ${mint}`);

    // Try Jupiter Price API first
    let price: number | null = null;
    
    try {
      const jupResponse = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`);
      if (jupResponse.ok) {
        const jupData = await jupResponse.json();
        price = jupData.data?.[mint]?.price ? parseFloat(jupData.data[mint].price) : null;
        console.log(`Jupiter price: ${price}`);
      }
    } catch (e) {
      console.log('Jupiter failed, trying DexScreener');
    }

    // Fallback to DexScreener
    if (!price) {
      try {
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          const pairs = dexData.pairs || [];
          if (pairs.length > 0) {
            // Get best liquidity pair
            const bestPair = pairs.sort((a: any, b: any) => 
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];
            price = parseFloat(bestPair.priceUsd) || null;
            console.log(`DexScreener price: ${price}`);
          }
        }
      } catch (e) {
        console.log('DexScreener failed too');
      }
    }

    // Fallback to Pump.fun API for new tokens
    if (!price) {
      try {
        const pumpResponse = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
        if (pumpResponse.ok) {
          const pumpData = await pumpResponse.json();
          // Pump.fun returns price in SOL terms via bonding curve
          if (pumpData.virtual_sol_reserves && pumpData.virtual_token_reserves) {
            const solReserves = pumpData.virtual_sol_reserves / 1e9;
            const tokenReserves = pumpData.virtual_token_reserves / 1e6;
            const priceInSol = solReserves / tokenReserves;
            // Approximate USD price (use ~150 USD/SOL as estimate if we can't get live price)
            price = priceInSol * 150;
            console.log(`Pump.fun price: ${price}`);
          }
        }
      } catch (e) {
        console.log('Pump.fun failed too');
      }
    }

    return new Response(JSON.stringify({ 
      price,
      timestamp: Date.now(),
      mint,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Realtime price error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      price: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
