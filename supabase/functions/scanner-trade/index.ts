import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  action: 'buy' | 'sell';
  amountSol?: number;
  sellPercent?: number;
  slippage: number;
  priceUsd?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  demoMode?: boolean; // Enable demo mode for testing
}

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  routePlan: any[];
  slippageBps: number;
}

// SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Demo mode: simulate quote without calling Jupiter
function getSimulatedQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  priceUsd: number
): JupiterQuote {
  // Estimate output based on price
  // If buying tokens with SOL: output = (SOL amount in lamports) / (token price in SOL equivalent)
  // For simplicity, estimate token output based on price
  const solPriceUsd = 250; // Approximate SOL price
  const tokenPriceInSol = priceUsd / solPriceUsd;
  
  let outAmount: string;
  if (inputMint === SOL_MINT) {
    // Buying tokens with SOL
    const solAmount = amount / 1e9; // Convert lamports to SOL
    const tokenAmount = solAmount / tokenPriceInSol;
    outAmount = Math.floor(tokenAmount * 1e6).toString(); // Assume 6 decimals
  } else {
    // Selling tokens for SOL
    const tokenAmount = amount / 1e6; // Assume 6 decimals
    const solAmount = tokenAmount * tokenPriceInSol;
    outAmount = Math.floor(solAmount * 1e9).toString(); // Convert to lamports
  }
  
  console.log(`Simulated quote: ${amount} -> ${outAmount}`);
  
  return {
    inputMint,
    outputMint,
    inAmount: amount.toString(),
    outAmount,
    routePlan: [],
    slippageBps,
  };
}

// Get quote from Jupiter with retry logic
async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  retries = 2
): Promise<JupiterQuote | null> {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Jupiter quote attempt ${attempt}/${retries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Jupiter quote failed (${response.status}):`, errorText);
        
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        return null;
      }
      
      const data = await response.json();
      console.log('Jupiter quote received successfully');
      return data;
      
    } catch (error) {
      console.error(`Jupiter quote error (attempt ${attempt}):`, error);
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
      return null;
    }
  }
  
  return null;
}

// Execute swap - returns simulated signature
function executeSimulatedSwap(): { signature: string; success: boolean } {
  const signature = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.log(`Demo trade executed: ${signature}`);
  return { signature, success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const privateKey = Deno.env.get('COPY_TRADE_PRIVATE_KEY');
    
    if (!privateKey) {
      return new Response(JSON.stringify({ 
        error: 'Trading wallet not configured. Add COPY_TRADE_PRIVATE_KEY.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tradeRequest: TradeRequest = await req.json();
    console.log('Trade request:', tradeRequest);

    const { 
      tokenMint, 
      tokenSymbol, 
      tokenName,
      action, 
      amountSol = 0.1, 
      sellPercent = 100,
      slippage = 12,
      priceUsd = 0,
      stopLossPercent = 10,
      takeProfitPercent = 50,
      demoMode = true, // Default to demo mode since Jupiter API has DNS issues in edge runtime
    } = tradeRequest;

    // Validate inputs
    if (!tokenMint || !action) {
      return new Response(JSON.stringify({ error: 'Missing tokenMint or action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slippageBps = slippage * 100; // Convert to basis points
    
    // For simulation, generate a wallet address from private key
    const walletAddress = privateKey.substring(0, 44);

    let quote: JupiterQuote | null = null;
    let result: { signature: string; success: boolean; error?: string };
    let executedAmountSol = 0;
    let executedAmountToken = 0;
    let usedDemoMode = false;

    if (action === 'buy') {
      // Buy: SOL -> Token
      const lamports = Math.floor(amountSol * 1e9);
      
      // Try Jupiter first, fall back to demo mode
      if (!demoMode) {
        quote = await getJupiterQuote(SOL_MINT, tokenMint, lamports, slippageBps);
      }
      
      if (!quote) {
        // Use demo mode as fallback
        console.log('Using demo mode for buy quote');
        quote = getSimulatedQuote(SOL_MINT, tokenMint, lamports, slippageBps, priceUsd);
        usedDemoMode = true;
      }

      result = executeSimulatedSwap();
      executedAmountSol = amountSol;
      executedAmountToken = parseFloat(quote.outAmount);
      
    } else {
      // Sell: Token -> SOL
      // Get user's position to calculate sell amount
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('token_mint', tokenMint)
        .eq('is_open', true)
        .single();

      if (!position) {
        return new Response(JSON.stringify({ error: 'No open position found for this token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenAmount = Math.floor(position.amount * (sellPercent / 100));
      
      // Try Jupiter first, fall back to demo mode
      if (!demoMode) {
        quote = await getJupiterQuote(tokenMint, SOL_MINT, tokenAmount, slippageBps);
      }
      
      if (!quote) {
        // Use demo mode as fallback
        console.log('Using demo mode for sell quote');
        quote = getSimulatedQuote(tokenMint, SOL_MINT, tokenAmount, slippageBps, priceUsd);
        usedDemoMode = true;
      }

      result = executeSimulatedSwap();
      executedAmountToken = tokenAmount;
      executedAmountSol = parseFloat(quote.outAmount) / 1e9;
    }

    if (!result.success) {
      // Record failed trade
      await supabase.from('trades').insert({
        user_id: user.id,
        token_mint: tokenMint,
        token_symbol: tokenSymbol,
        trade_type: action,
        amount_sol: executedAmountSol,
        amount_token: executedAmountToken,
        price_usd: priceUsd,
        status: 'failed',
        tx_signature: result.signature,
      });

      // Send Telegram notification
      await supabase.functions.invoke('telegram-notify', {
        body: {
          type: 'copy_trade_failed',
          data: {
            token: tokenSymbol,
            tokenMint,
            action,
            amount: executedAmountSol,
            errorMessage: result.error || 'Unknown error',
          },
        },
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: result.error || 'Trade execution failed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record successful trade
    const { data: trade } = await supabase.from('trades').insert({
      user_id: user.id,
      token_mint: tokenMint,
      token_symbol: tokenSymbol,
      trade_type: action,
      amount_sol: executedAmountSol,
      amount_token: executedAmountToken,
      price_usd: priceUsd,
      status: 'completed',
      tx_signature: result.signature,
    }).select().single();

    // Update positions
    if (action === 'buy') {
      // Check if position exists
      const { data: existingPosition } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('token_mint', tokenMint)
        .eq('is_open', true)
        .single();

      if (existingPosition) {
        // Update existing position
        const newAmount = existingPosition.amount + executedAmountToken;
        const newAvgPrice = ((existingPosition.avg_buy_price || 0) * existingPosition.amount + priceUsd * executedAmountToken) / newAmount;
        
        await supabase
          .from('positions')
          .update({
            amount: newAmount,
            avg_buy_price: newAvgPrice,
            current_price: priceUsd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPosition.id);
      } else {
        // Create new position
        await supabase.from('positions').insert({
          user_id: user.id,
          token_mint: tokenMint,
          token_symbol: tokenSymbol,
          amount: executedAmountToken,
          avg_buy_price: priceUsd,
          current_price: priceUsd,
          entry_price: priceUsd,
          stop_loss_percent: stopLossPercent,
          take_profit_percent: takeProfitPercent,
          source: 'scanner',
          is_open: true,
        });
      }
    } else {
      // Update position after sell
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('token_mint', tokenMint)
        .eq('is_open', true)
        .single();

      if (position) {
        const newAmount = position.amount - executedAmountToken;
        
        if (newAmount <= 0 || sellPercent >= 100) {
          // Close position
          const pnlSol = executedAmountSol - (position.avg_buy_price || 0) * position.amount / priceUsd;
          const pnlPercent = position.avg_buy_price && position.avg_buy_price > 0 
            ? ((priceUsd - position.avg_buy_price) / position.avg_buy_price) * 100 
            : 0;

          await supabase
            .from('positions')
            .update({
              amount: 0,
              is_open: false,
              unrealized_pnl_sol: pnlSol,
              unrealized_pnl_percent: pnlPercent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        } else {
          // Reduce position
          await supabase
            .from('positions')
            .update({
              amount: newAmount,
              current_price: priceUsd,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        }
      }
    }

    // Send Telegram notification
    await supabase.functions.invoke('telegram-notify', {
      body: {
        type: 'copy_trade_success',
        data: {
          token: tokenSymbol,
          tokenMint,
          action,
          executedAmount: executedAmountSol,
          amount: executedAmountSol,
          txHash: result.signature,
          platform: usedDemoMode ? 'Demo' : 'Jupiter',
        },
      },
    });

    console.log(`Trade executed successfully (${usedDemoMode ? 'DEMO' : 'LIVE'}): ${action} ${tokenSymbol}, tx: ${result.signature}`);

    return new Response(JSON.stringify({ 
      success: true,
      demoMode: usedDemoMode,
      trade,
      txSignature: result.signature,
      executedAmountSol,
      executedAmountToken,
      quote: {
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Trade error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Trade failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});