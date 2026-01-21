const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOLANA_RPC_URLS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
];

async function tryRpcRequest(method: string, params: unknown[]): Promise<unknown> {
  let lastError: Error | null = null;
  
  for (const rpcUrl of SOLANA_RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return data.result;
        }
        console.log(`RPC ${rpcUrl} returned error:`, data.error);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`RPC ${rpcUrl} failed:`, lastError.message);
    }
  }
  
  throw lastError || new Error('All RPC endpoints failed');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Missing address parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching wallet data for: ${address}`);

    // Fetch SOL balance
    const balanceResult = await tryRpcRequest('getBalance', [address]);
    const balanceLamports = (balanceResult as { value: number }).value;
    const balanceSol = balanceLamports / 1e9;

    // Fetch token accounts
    const tokenAccountsResult = await tryRpcRequest('getTokenAccountsByOwner', [
      address,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' },
    ]);

    const tokenAccounts = (tokenAccountsResult as { value: unknown[] }).value || [];
    
    const tokens = tokenAccounts
      .map((account: any) => {
        const info = account.account.data.parsed.info;
        const tokenAmount = info.tokenAmount;
        return {
          mint: info.mint,
          symbol: info.mint.slice(0, 4).toUpperCase(),
          balance: parseInt(tokenAmount.amount),
          decimals: tokenAmount.decimals,
          uiAmount: parseFloat(tokenAmount.uiAmount) || 0,
        };
      })
      .filter((token: any) => token.uiAmount > 0);

    return new Response(
      JSON.stringify({
        address,
        balanceSol,
        tokens,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Solana wallet error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
