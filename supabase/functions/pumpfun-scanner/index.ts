import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScannerFilters {
  minMarketCap: number;
  maxMarketCap: number;
  maxAgeMinutes: number;
  minVolumeUsd: number;
  maxDevHoldingPercent: number;
  maxInsidersPercent: number;
  minBondingCurvePercent: number;
}

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  marketCap: number;
  liquidityUsd: number;
  volume24h: number;
  bondingCurvePercent: number | null;
  devHoldingPercent: number | null;
  insidersPercent: number | null;
  holdersCount: number | null;
  top10HoldersPercent: number | null;
  buys24h: number;
  sells24h: number;
  txns24h: number;
  botUsers: number | null;
  createdAtToken: string;
  ageMinutes: number;
  pairAddress: string;
  dexId: string;
  riskScore: number;
  imageUrl: string | null;
}

// Pump.fun bonding curve constants
const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkho8p8VXFVdhR5Nmf8VKC5yBE5hDcpN';
const TOTAL_BONDING_CURVE_SOL = 85; // 85 SOL to complete bonding curve

// Get token holder data from Helius
async function getTokenHolders(mint: string, heliusApiKey: string): Promise<{
  holdersCount: number;
  top10HoldersPercent: number;
  devHoldingPercent: number;
} | null> {
  try {
    const rpcResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [mint],
      }),
    });

    if (!rpcResponse.ok) return null;

    const rpcData = await rpcResponse.json();
    const accounts = rpcData.result?.value || [];
    
    if (accounts.length === 0) return null;

    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.amount || 0), 0);
    const top10Balance = accounts.slice(0, 10).reduce((sum: number, acc: any) => sum + parseFloat(acc.amount || 0), 0);
    const top10Percent = totalBalance > 0 ? (top10Balance / totalBalance) * 100 : 0;
    const devBalance = accounts.length > 0 ? parseFloat(accounts[0].amount || 0) : 0;
    const devPercent = totalBalance > 0 ? (devBalance / totalBalance) * 100 : 0;

    return {
      holdersCount: accounts.length,
      top10HoldersPercent: Math.min(100, top10Percent),
      devHoldingPercent: Math.min(100, devPercent),
    };
  } catch (error) {
    return null;
  }
}

// Get bonding curve data from Helius for a pump.fun token
async function getBondingCurveData(bondingCurveAddress: string, heliusApiKey: string): Promise<{
  virtualSolReserves: number;
  virtualTokenReserves: number;
  bondingCurvePercent: number;
} | null> {
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [bondingCurveAddress, { encoding: 'jsonParsed' }],
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const lamports = data.result?.value?.lamports || 0;
    const solBalance = lamports / 1e9;
    
    // Bonding curve progress = SOL in curve / 85 SOL (total needed)
    const bondingCurvePercent = Math.min(100, (solBalance / TOTAL_BONDING_CURVE_SOL) * 100);
    
    return {
      virtualSolReserves: solBalance,
      virtualTokenReserves: 0, // Not needed for our calculation
      bondingCurvePercent,
    };
  } catch (error) {
    return null;
  }
}

// Fetch tokens from DexScreener and enrich with on-chain data
async function fetchPumpFunTokens(filters: ScannerFilters, heliusApiKey: string): Promise<TokenData[]> {
  console.log('Fetching tokens with filters:', JSON.stringify(filters));
  
  try {
    // Get latest pump.fun tokens from DexScreener
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=pumpfun',
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      throw new Error('DexScreener API failed');
    }
    
    const data = await response.json();
    const pairs = (data.pairs || []).filter((p: any) => p.dexId === 'pumpfun');
    
    console.log(`Found ${pairs.length} pumpfun pairs from DexScreener`);
    
    const filteredTokens: TokenData[] = [];
    const now = Date.now();
    
    // First pass: filter by basic criteria
    for (const pair of pairs) {
      const marketCap = pair.marketCap || pair.fdv || 0;
      const volume24h = pair.volume?.h24 || 0;
      const createdAt = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).getTime() : now;
      const ageMinutes = Math.floor((now - createdAt) / 60000);
      
      // Apply basic filters
      if (marketCap < filters.minMarketCap || marketCap > filters.maxMarketCap) continue;
      if (ageMinutes > filters.maxAgeMinutes) continue;
      
      const buys24h = pair.txns?.h24?.buys || 0;
      const sells24h = pair.txns?.h24?.sells || 0;
      
      filteredTokens.push({
        mint: pair.baseToken?.address || '',
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '???',
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        marketCap,
        liquidityUsd: pair.liquidity?.usd || 0,
        volume24h,
        bondingCurvePercent: null, // Will be fetched from chain
        devHoldingPercent: null,
        insidersPercent: null,
        holdersCount: null,
        top10HoldersPercent: null,
        buys24h,
        sells24h,
        txns24h: buys24h + sells24h,
        botUsers: null,
        createdAtToken: pair.pairCreatedAt || new Date().toISOString(),
        ageMinutes,
        pairAddress: pair.pairAddress || '',
        dexId: 'pumpfun',
        riskScore: 50,
        imageUrl: pair.info?.imageUrl || null,
      });
    }
    
    console.log(`After basic filters: ${filteredTokens.length} tokens`);
    
    // Get on-chain bonding curve data for top tokens
    const tokensToEnrich = filteredTokens.slice(0, 30);
    const enrichedTokens: TokenData[] = [];
    
    for (const token of tokensToEnrich) {
      // Get bonding curve data
      const bcData = await getBondingCurveData(token.pairAddress, heliusApiKey);
      
      if (bcData) {
        token.bondingCurvePercent = bcData.bondingCurvePercent;
        
        // Apply bonding curve filter - THIS IS KEY FOR MATCHING AXIOM
        if (token.bondingCurvePercent < filters.minBondingCurvePercent) {
          console.log(`Skipping ${token.symbol}: BC ${token.bondingCurvePercent.toFixed(1)}% < ${filters.minBondingCurvePercent}%`);
          continue;
        }
      }
      
      // Get holder data
      const holderData = await getTokenHolders(token.mint, heliusApiKey);
      if (holderData) {
        token.holdersCount = holderData.holdersCount;
        token.top10HoldersPercent = holderData.top10HoldersPercent;
        token.devHoldingPercent = holderData.devHoldingPercent;
        
        // Apply dev holding filter
        if (holderData.devHoldingPercent > filters.maxDevHoldingPercent) {
          console.log(`Skipping ${token.symbol}: Dev ${holderData.devHoldingPercent.toFixed(1)}% > ${filters.maxDevHoldingPercent}%`);
          continue;
        }
      }
      
      // Calculate risk score
      let riskScore = 50;
      if (token.ageMinutes < 5) riskScore += 15;
      if (token.volume24h > 50000) riskScore -= 15;
      if (token.txns24h > 200) riskScore -= 10;
      if (token.bondingCurvePercent !== null && token.bondingCurvePercent > 60) riskScore -= 15;
      if (token.devHoldingPercent !== null && token.devHoldingPercent > 10) riskScore += 20;
      if (token.top10HoldersPercent !== null && token.top10HoldersPercent > 70) riskScore += 15;
      if (token.holdersCount !== null && token.holdersCount > 100) riskScore -= 10;
      
      token.riskScore = Math.max(0, Math.min(100, riskScore));
      
      enrichedTokens.push(token);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`After on-chain filters: ${enrichedTokens.length} tokens`);
    
    // Sort by bonding curve (highest first - closest to graduating)
    enrichedTokens.sort((a, b) => {
      const bcA = a.bondingCurvePercent || 0;
      const bcB = b.bondingCurvePercent || 0;
      return bcB - bcA;
    });
    
    return enrichedTokens.slice(0, 20);
    
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const heliusApiKey = Deno.env.get('HELIUS_API_KEY')!;
    
    if (!heliusApiKey) {
      throw new Error('Helius API key not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's scanner settings
    const { data: settings } = await supabase
      .from('scanner_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Use settings or defaults matching Axiom's "Final Stretch"
    const filters: ScannerFilters = {
      minMarketCap: settings?.min_market_cap || 12000,
      maxMarketCap: settings?.max_market_cap || 60000,
      maxAgeMinutes: settings?.max_age_minutes || 30,
      minVolumeUsd: settings?.min_volume_usd || 15000,
      maxDevHoldingPercent: settings?.max_dev_holding_percent || 5,
      maxInsidersPercent: settings?.max_insiders_percent || 20,
      minBondingCurvePercent: settings?.min_bonding_curve_percent || 35, // Key for Final Stretch
    };

    const tokens = await fetchPumpFunTokens(filters, heliusApiKey);

    // Clear old and insert new tokens
    await supabase.from('scanned_tokens').delete().eq('user_id', user.id);

    if (tokens.length > 0) {
      const tokenRecords = tokens.map(t => ({
        user_id: user.id,
        mint: t.mint,
        name: t.name,
        symbol: t.symbol,
        price_usd: t.priceUsd,
        price_change_5m: t.priceChange5m,
        price_change_1h: t.priceChange1h,
        price_change_24h: t.priceChange24h,
        market_cap: t.marketCap,
        liquidity_usd: t.liquidityUsd,
        volume_24h: t.volume24h,
        bonding_curve_percent: t.bondingCurvePercent,
        dev_holding_percent: t.devHoldingPercent,
        insiders_percent: t.insidersPercent,
        holders_count: t.holdersCount,
        top_10_holders_percent: t.top10HoldersPercent,
        buys_24h: t.buys24h,
        sells_24h: t.sells24h,
        txns_24h: t.txns24h,
        bot_users: t.botUsers,
        created_at_token: t.createdAtToken,
        age_minutes: t.ageMinutes,
        pair_address: t.pairAddress,
        dex_id: t.dexId,
        risk_score: t.riskScore,
        scanned_at: new Date().toISOString(),
      }));

      await supabase.from('scanned_tokens').insert(tokenRecords);
    }

    console.log(`Scanner completed: ${tokens.length} tokens passed all filters`);

    return new Response(JSON.stringify({ 
      success: true, 
      count: tokens.length,
      tokens 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Scanner failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
