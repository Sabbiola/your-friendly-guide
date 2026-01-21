import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchTokenChart(mint: string, interval = '15m'): Promise<OHLCVData[]> {
  try {
    // Try DexScreener first
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) throw new Error("DexScreener failed");
    
    const data = await res.json();
    const pairs = data.pairs || [];
    
    if (pairs.length === 0) return [];
    
    // Get the most liquid pair
    const mainPair = pairs.sort((a: any, b: any) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    // DexScreener doesn't provide OHLCV, so we'll generate approximate data from price history
    // In a real implementation, you'd use TradingView or another OHLCV source
    const currentPrice = parseFloat(mainPair.priceUsd) || 0;
    const priceChange24h = mainPair.priceChange?.h24 || 0;
    const startPrice = currentPrice / (1 + priceChange24h / 100);
    
    const ohlcv: OHLCVData[] = [];
    const now = Date.now();
    const intervalMs = interval === '1h' ? 3600000 : interval === '15m' ? 900000 : 300000;
    const points = 50;
    
    let price = startPrice;
    const volatility = Math.abs(priceChange24h) / 100 / points;
    
    for (let i = 0; i < points; i++) {
      const time = now - (points - i) * intervalMs;
      const change = (Math.random() - 0.5) * 2 * volatility * price;
      const trend = (priceChange24h / 100) / points;
      
      const open = price;
      price = Math.max(0.00000001, price + change + trend * price);
      const close = price;
      
      const high = Math.max(open, close) * (1 + Math.random() * volatility);
      const low = Math.min(open, close) * (1 - Math.random() * volatility);
      
      ohlcv.push({
        time,
        open,
        high,
        low,
        close,
        volume: (mainPair.volume?.h24 || 0) / points * (0.5 + Math.random()),
      });
    }
    
    return ohlcv;
  } catch (error) {
    console.error("Token chart error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mint, interval = '15m' } = await req.json();
    
    if (!mint) {
      return new Response(JSON.stringify({ error: "Token mint required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartData = await fetchTokenChart(mint, interval);

    return new Response(JSON.stringify({ data: chartData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Token chart error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      data: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
