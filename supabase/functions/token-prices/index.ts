const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let mints: string | null = null;

    // Support both GET with query params and POST with body
    if (req.method === 'POST') {
      const body = await req.json();
      mints = body.mints || body.ids;
    } else {
      const url = new URL(req.url);
      mints = url.searchParams.get('ids') || url.searchParams.get('mints');
    }
    
    if (!mints) {
      return new Response(
        JSON.stringify({ error: 'Missing mints parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching prices for: ${mints}`);

    const mintList = mints.split(',');
    const prices: Record<string, { price: number }> = {};

    // Use Jupiter Quote API as a workaround for pricing (gets real-time swap prices)
    // Or use DexScreener public API for token prices
    for (const mint of mintList) {
      try {
        // DexScreener public API - no auth required
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            // Get the price from the most liquid pair
            const sortedPairs = data.pairs.sort((a: any, b: any) => 
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            );
            const price = parseFloat(sortedPairs[0].priceUsd || '0');
            prices[mint] = { price };
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch price for ${mint}:`, e);
      }
    }

    // Format response similar to Jupiter API
    return new Response(
      JSON.stringify({ data: prices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Token prices error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
