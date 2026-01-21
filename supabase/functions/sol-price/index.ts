import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SolPriceResponse {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

async function fetchSolPrice(): Promise<SolPriceResponse> {
  // Try multiple sources for SOL price
  const sources = [
    async () => {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true");
      if (!res.ok) throw new Error("CoinGecko failed");
      const data = await res.json();
      return {
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change || 0,
        volume24h: data.solana.usd_24h_vol || 0,
        marketCap: data.solana.usd_market_cap || 0,
      };
    },
    async () => {
      const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT");
      if (!res.ok) throw new Error("Binance failed");
      const data = await res.json();
      return {
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.quoteVolume),
        marketCap: 0,
      };
    },
    async () => {
      const res = await fetch("https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112");
      if (!res.ok) throw new Error("Jupiter failed");
      const data = await res.json();
      const solData = data.data?.So11111111111111111111111111111111111111112;
      return {
        price: solData?.price || 0,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
      };
    },
  ];

  for (const source of sources) {
    try {
      return await source();
    } catch (err) {
      console.log("Price source failed, trying next...");
      continue;
    }
  }

  throw new Error("All price sources failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const priceData = await fetchSolPrice();
    
    return new Response(JSON.stringify(priceData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("SOL price error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
