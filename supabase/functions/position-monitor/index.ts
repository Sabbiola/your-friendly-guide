import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Position {
  id: string;
  user_id: string;
  token_mint: string;
  token_symbol: string;
  amount: number;
  avg_buy_price: number | null;
  entry_price: number | null;
  current_price: number | null;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  is_open: boolean;
}

// Get current token prices from Jupiter
async function getTokenPrices(mints: string[]): Promise<Record<string, number>> {
  try {
    const ids = mints.join(',');
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`);
    
    if (!response.ok) {
      console.error('Jupiter price API failed');
      return {};
    }

    const data = await response.json();
    const prices: Record<string, number> = {};

    for (const mint of mints) {
      if (data.data?.[mint]?.price) {
        prices[mint] = parseFloat(data.data[mint].price);
      }
    }

    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Position monitor starting...');

    // Get all open positions
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('is_open', true);

    if (posError || !positions || positions.length === 0) {
      console.log('No open positions to monitor');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No open positions',
        checked: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Monitoring ${positions.length} open positions`);

    // Get unique mints
    const mints = [...new Set(positions.map(p => p.token_mint))];
    
    // Fetch current prices
    const prices = await getTokenPrices(mints);
    console.log(`Got prices for ${Object.keys(prices).length} tokens`);

    let triggeredCount = 0;
    const updates: { position: Position; action: 'stop_loss' | 'take_profit'; pnlPercent: number }[] = [];

    // Check each position
    for (const position of positions) {
      const currentPrice = prices[position.token_mint];
      
      if (!currentPrice || !position.entry_price || position.entry_price <= 0) {
        continue;
      }

      const pnlPercent = ((currentPrice - position.entry_price) / position.entry_price) * 100;
      const stopLoss = position.stop_loss_percent || 10;
      const takeProfit = position.take_profit_percent || 50;

      // Update current price and PnL in database
      await supabase
        .from('positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl_percent: pnlPercent,
          unrealized_pnl_sol: (pnlPercent / 100) * position.amount * currentPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      // Check stop loss
      if (pnlPercent <= -stopLoss) {
        console.log(`Stop loss triggered for ${position.token_symbol}: ${pnlPercent.toFixed(2)}%`);
        updates.push({ position, action: 'stop_loss', pnlPercent });
        triggeredCount++;
      }
      // Check take profit
      else if (pnlPercent >= takeProfit) {
        console.log(`Take profit triggered for ${position.token_symbol}: ${pnlPercent.toFixed(2)}%`);
        updates.push({ position, action: 'take_profit', pnlPercent });
        triggeredCount++;
      }
    }

    // Execute triggered trades
    for (const update of updates) {
      const { position, action, pnlPercent } = update;
      
      try {
        // Get user's session for auth (use service key for automated trades)
        const { data: { session } } = await supabase.auth.getSession();
        
        // Execute sell via scanner-trade function
        const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('scanner-trade', {
          body: {
            tokenMint: position.token_mint,
            tokenSymbol: position.token_symbol,
            tokenName: position.token_symbol,
            action: 'sell',
            sellPercent: 100, // Full exit on SL/TP
            slippage: 15, // Higher slippage for automated trades
            priceUsd: prices[position.token_mint] || 0,
          },
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`, // Use service key
          },
        });

        if (tradeError) {
          console.error(`Failed to execute ${action} for ${position.token_symbol}:`, tradeError);
          continue;
        }

        // Send Telegram notification
        await supabase.functions.invoke('telegram-notify', {
          body: {
            type: action,
            data: {
              token: position.token_symbol,
              tokenMint: position.token_mint,
              pnlPercentage: pnlPercent,
              pnl: (pnlPercent / 100) * position.amount * (prices[position.token_mint] || 0),
              threshold: action === 'stop_loss' ? position.stop_loss_percent : position.take_profit_percent,
              walletLabel: 'Trading Bot',
            },
          },
        });

        console.log(`${action} executed for ${position.token_symbol}`);

      } catch (error) {
        console.error(`Error executing ${action} for ${position.token_symbol}:`, error);
      }
    }

    console.log(`Position monitor completed: ${positions.length} checked, ${triggeredCount} triggered`);

    return new Response(JSON.stringify({ 
      success: true,
      checked: positions.length,
      triggered: triggeredCount,
      pricesUpdated: Object.keys(prices).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Position monitor error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Monitor failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});