const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedSwap {
  signature: string;
  blockTime: number;
  type: 'buy' | 'sell';
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  priceUsd: number | null;
  platform: 'jupiter' | 'raydium' | 'pumpfun' | 'unknown';
}

interface TransactionResponse {
  trades: ParsedSwap[];
  summary: {
    totalTrades: number;
    totalBuys: number;
    totalSells: number;
    totalPnlSol: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
  };
}

// Known DEX program IDs
const DEX_PROGRAMS = {
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  JUPITER_V4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
};

// SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// RPC URLs with fallbacks
const RPC_URLS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
];

async function fetchWithFallback(body: object): Promise<any> {
  for (const rpcUrl of RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return data;
        }
      }
    } catch (error) {
      console.log(`RPC ${rpcUrl} failed, trying next...`);
    }
  }
  throw new Error('All RPC endpoints failed');
}

async function getTransactionSignatures(walletAddress: string, limit = 100): Promise<string[]> {
  const data = await fetchWithFallback({
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [
      walletAddress,
      { limit }
    ],
  });
  
  return data.result?.map((sig: any) => sig.signature) || [];
}

async function getTransactionDetails(signature: string): Promise<any> {
  const data = await fetchWithFallback({
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
    ],
  });
  
  return data.result;
}

function detectPlatform(tx: any): 'jupiter' | 'raydium' | 'pumpfun' | 'unknown' {
  const accountKeys = tx?.transaction?.message?.accountKeys || [];
  const programIds = accountKeys.map((k: any) => k.pubkey || k);
  
  if (programIds.includes(DEX_PROGRAMS.JUPITER_V6) || programIds.includes(DEX_PROGRAMS.JUPITER_V4)) {
    return 'jupiter';
  }
  if (programIds.includes(DEX_PROGRAMS.RAYDIUM_V4) || programIds.includes(DEX_PROGRAMS.RAYDIUM_CPMM)) {
    return 'raydium';
  }
  if (programIds.includes(DEX_PROGRAMS.PUMP_FUN)) {
    return 'pumpfun';
  }
  return 'unknown';
}

function parseSwapFromTransaction(tx: any, walletAddress: string): ParsedSwap | null {
  if (!tx || tx.meta?.err) return null;
  
  const platform = detectPlatform(tx);
  if (platform === 'unknown') return null;
  
  try {
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];
    
    // Track balance changes for wallet owner
    const balanceChanges: Map<string, { pre: number; post: number; decimals: number }> = new Map();
    
    // Process pre-balances
    for (const balance of preBalances) {
      if (balance.owner === walletAddress) {
        const mint = balance.mint;
        const amount = parseFloat(balance.uiTokenAmount?.uiAmount || '0');
        balanceChanges.set(mint, { 
          pre: amount, 
          post: 0, 
          decimals: balance.uiTokenAmount?.decimals || 9 
        });
      }
    }
    
    // Process post-balances
    for (const balance of postBalances) {
      if (balance.owner === walletAddress) {
        const mint = balance.mint;
        const amount = parseFloat(balance.uiTokenAmount?.uiAmount || '0');
        const existing = balanceChanges.get(mint);
        if (existing) {
          existing.post = amount;
        } else {
          balanceChanges.set(mint, { 
            pre: 0, 
            post: amount, 
            decimals: balance.uiTokenAmount?.decimals || 9 
          });
        }
      }
    }
    
    // Also check SOL balance changes
    const accountKeys = tx.transaction?.message?.accountKeys || [];
    const walletIndex = accountKeys.findIndex((k: any) => 
      (k.pubkey || k) === walletAddress
    );
    
    if (walletIndex !== -1) {
      const preSol = (tx.meta?.preBalances?.[walletIndex] || 0) / 1e9;
      const postSol = (tx.meta?.postBalances?.[walletIndex] || 0) / 1e9;
      const solChange = postSol - preSol;
      
      // Find the token that changed (not SOL/WSOL)
      let tokenMint: string | null = null;
      let tokenChange = 0;
      let tokenDecimals = 9;
      
      for (const [mint, changes] of balanceChanges.entries()) {
        if (mint !== SOL_MINT && mint !== WSOL_MINT) {
          const change = changes.post - changes.pre;
          if (Math.abs(change) > 0) {
            tokenMint = mint;
            tokenChange = change;
            tokenDecimals = changes.decimals;
            break;
          }
        }
      }
      
      // Skip if no token swap detected
      if (!tokenMint || Math.abs(tokenChange) < 0.0001) return null;
      
      // Determine if buy or sell
      // Buy: SOL decreases, token increases
      // Sell: SOL increases, token decreases
      const isBuy = tokenChange > 0 && solChange < 0;
      const isSell = tokenChange < 0 && solChange > 0;
      
      if (!isBuy && !isSell) return null;
      
      return {
        signature: tx.transaction?.signatures?.[0] || '',
        blockTime: tx.blockTime || 0,
        type: isBuy ? 'buy' : 'sell',
        tokenMint,
        tokenSymbol: '', // Will be filled later
        tokenAmount: Math.abs(tokenChange),
        solAmount: Math.abs(solChange),
        priceUsd: null, // Will be filled later
        platform,
      };
    }
  } catch (error) {
    console.error('Error parsing transaction:', error);
  }
  
  return null;
}

async function getTokenSymbols(mints: string[]): Promise<Map<string, string>> {
  const symbols = new Map<string, string>();
  
  // Fetch from Jupiter token list
  try {
    const response = await fetch('https://token.jup.ag/strict');
    if (response.ok) {
      const tokens = await response.json();
      for (const token of tokens) {
        if (mints.includes(token.address)) {
          symbols.set(token.address, token.symbol);
        }
      }
    }
  } catch (error) {
    console.log('Failed to fetch token list');
  }
  
  // Fill in missing symbols with shortened addresses
  for (const mint of mints) {
    if (!symbols.has(mint)) {
      symbols.set(mint, mint.slice(0, 4) + '...');
    }
  }
  
  return symbols;
}

async function getCurrentPrices(mints: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${mints.join(',')}`);
    if (response.ok) {
      const data = await response.json();
      for (const mint of mints) {
        if (data.data?.[mint]) {
          prices.set(mint, parseFloat(data.data[mint].price));
        }
      }
    }
  } catch (error) {
    console.log('Failed to fetch prices');
  }
  
  return prices;
}

function calculatePnL(trades: ParsedSwap[]): TransactionResponse['summary'] {
  // Group trades by token
  const tokenTrades: Map<string, ParsedSwap[]> = new Map();
  
  for (const trade of trades) {
    const existing = tokenTrades.get(trade.tokenMint) || [];
    existing.push(trade);
    tokenTrades.set(trade.tokenMint, existing);
  }
  
  let totalPnlSol = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  
  // Simple PnL: sum of (sell SOL - buy SOL) per token
  for (const [mint, tokenTradeList] of tokenTrades) {
    const buys = tokenTradeList.filter(t => t.type === 'buy');
    const sells = tokenTradeList.filter(t => t.type === 'sell');
    
    const totalBuysSol = buys.reduce((sum, t) => sum + t.solAmount, 0);
    const totalSellsSol = sells.reduce((sum, t) => sum + t.solAmount, 0);
    
    if (sells.length > 0) {
      const pnl = totalSellsSol - totalBuysSol;
      totalPnlSol += pnl;
      
      if (pnl > 0) winningTrades++;
      else if (pnl < 0) losingTrades++;
    }
  }
  
  const totalBuys = trades.filter(t => t.type === 'buy').length;
  const totalSells = trades.filter(t => t.type === 'sell').length;
  const totalCompleted = winningTrades + losingTrades;
  
  return {
    totalTrades: trades.length,
    totalBuys,
    totalSells,
    totalPnlSol,
    winningTrades,
    losingTrades,
    winRate: totalCompleted > 0 ? (winningTrades / totalCompleted) * 100 : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, limit = 100 } = await req.json();
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing walletAddress parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching transactions for wallet: ${walletAddress}`);
    
    // Get transaction signatures
    const signatures = await getTransactionSignatures(walletAddress, limit);
    console.log(`Found ${signatures.length} transactions`);
    
    // Fetch and parse transactions (in batches to avoid rate limits)
    const trades: ParsedSwap[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txPromises = batch.map(sig => getTransactionDetails(sig));
      const txResults = await Promise.allSettled(txPromises);
      
      for (const result of txResults) {
        if (result.status === 'fulfilled' && result.value) {
          const parsed = parseSwapFromTransaction(result.value, walletAddress);
          if (parsed) {
            trades.push(parsed);
          }
        }
      }
      
      // Small delay between batches
      if (i + batchSize < signatures.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Parsed ${trades.length} swap transactions`);
    
    // Get token symbols
    const uniqueMints = [...new Set(trades.map(t => t.tokenMint))];
    const [symbols, prices] = await Promise.all([
      getTokenSymbols(uniqueMints),
      getCurrentPrices(uniqueMints),
    ]);
    
    // Enrich trades with symbols and prices
    for (const trade of trades) {
      trade.tokenSymbol = symbols.get(trade.tokenMint) || trade.tokenMint.slice(0, 4);
      trade.priceUsd = prices.get(trade.tokenMint) || null;
    }
    
    // Sort by time (newest first)
    trades.sort((a, b) => b.blockTime - a.blockTime);
    
    // Calculate summary
    const summary = calculatePnL(trades);
    
    const response: TransactionResponse = {
      trades,
      summary,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet transactions error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
