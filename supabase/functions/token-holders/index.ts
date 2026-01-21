import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Holder {
  address: string;
  balance: number;
  percentage: number;
  label?: string;
}

interface TokenHoldersResponse {
  mint: string;
  totalHolders: number | null;
  topHolders: Holder[];
  devWallet: Holder | null;
  top10Percentage: number | null;
  top20Percentage: number | null;
}

async function getTokenHolders(mint: string): Promise<TokenHoldersResponse> {
  // Try to get holder data from various sources
  const result: TokenHoldersResponse = {
    mint,
    totalHolders: null,
    topHolders: [],
    devWallet: null,
    top10Percentage: null,
    top20Percentage: null,
  };

  try {
    // Use Helius if available
    const HELIUS_API_KEY = Deno.env.get("HELIUS_API_KEY");
    
    if (HELIUS_API_KEY) {
      const response = await fetch(`https://api.helius.xyz/v0/token-holders?api-key=${HELIUS_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint, limit: 50 })
      });
      
      if (response.ok) {
        const data = await response.json();
        result.totalHolders = data.total || null;
        
        if (data.result && data.result.length > 0) {
          const totalSupply = data.result.reduce((acc: number, h: any) => acc + (h.amount || 0), 0);
          
          result.topHolders = data.result.slice(0, 20).map((h: any, i: number) => ({
            address: h.owner,
            balance: h.amount || 0,
            percentage: totalSupply > 0 ? ((h.amount || 0) / totalSupply) * 100 : 0,
            label: i === 0 ? 'Largest Holder' : undefined
          }));
          
          // Calculate top 10 and top 20 percentages
          const top10 = result.topHolders.slice(0, 10);
          const top20 = result.topHolders.slice(0, 20);
          result.top10Percentage = top10.reduce((acc, h) => acc + h.percentage, 0);
          result.top20Percentage = top20.reduce((acc, h) => acc + h.percentage, 0);
          
          // First holder could be dev
          if (result.topHolders[0] && result.topHolders[0].percentage > 5) {
            result.devWallet = {
              ...result.topHolders[0],
              label: 'Dev Wallet (Suspected)'
            };
          }
        }
      }
    }
    
    // Fallback: get basic holder count from public RPC
    if (!result.totalHolders) {
      const rpcUrls = ["https://rpc.ankr.com/solana", "https://api.mainnet-beta.solana.com"];
      
      for (const rpc of rpcUrls) {
        try {
          // Get largest token accounts
          const response = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getTokenLargestAccounts",
              params: [mint]
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const accounts = data.result?.value || [];
            
            if (accounts.length > 0) {
              const totalAmount = accounts.reduce((acc: number, a: any) => 
                acc + parseFloat(a.uiAmount || 0), 0);
              
              result.topHolders = accounts.slice(0, 20).map((a: any, i: number) => ({
                address: a.address,
                balance: parseFloat(a.uiAmount || 0),
                percentage: totalAmount > 0 ? (parseFloat(a.uiAmount || 0) / totalAmount) * 100 : 0,
                label: i === 0 ? 'Largest Holder' : undefined
              }));
              
              const top10 = result.topHolders.slice(0, 10);
              result.top10Percentage = top10.reduce((acc, h) => acc + h.percentage, 0);
              
              if (result.topHolders[0] && result.topHolders[0].percentage > 5) {
                result.devWallet = { ...result.topHolders[0], label: 'Dev Wallet (Suspected)' };
              }
            }
            break;
          }
        } catch {
          continue;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching token holders:", error);
  }

  return result;
}

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

    console.log("Fetching holders for:", mint);
    const holdersData = await getTokenHolders(mint);

    return new Response(JSON.stringify(holdersData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Token holders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
