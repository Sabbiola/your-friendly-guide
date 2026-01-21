import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface TradePayload {
  wallet_address: string;
  token_mint: string;
  token_symbol: string;
  trade_type: 'buy' | 'sell';
  amount_token: number;
  amount_sol: number;
  price_usd?: number;
  tx_signature?: string;
  pnl_sol?: number;
  pnl_percent?: number;
}

interface PositionPayload {
  wallet_address: string;
  token_mint: string;
  token_symbol: string;
  amount: number;
  avg_buy_price?: number;
  current_price?: number;
  unrealized_pnl_sol?: number;
  unrealized_pnl_percent?: number;
  is_open?: boolean;
}

interface WalletPayload {
  address: string;
  name?: string;
  balance_sol?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and get user
    const { data: settings, error: settingsError } = await supabase
      .from('bot_settings')
      .select('user_id')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('API key validation error:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = settings.user_id;
    const url = new URL(req.url);
    const path = url.pathname.replace('/bot-api', '');

    console.log(`Bot API request: ${req.method} ${path} for user ${userId}`);

    // Route handling
    if (path === '/trade' && req.method === 'POST') {
      const body: TradePayload = await req.json();
      
      // Get or create wallet
      let walletId: string | null = null;
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('address', body.wallet_address)
        .maybeSingle();

      if (wallet) {
        walletId = wallet.id;
      }

      // Insert trade
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: userId,
          wallet_id: walletId,
          token_mint: body.token_mint,
          token_symbol: body.token_symbol,
          trade_type: body.trade_type,
          amount_token: body.amount_token,
          amount_sol: body.amount_sol,
          price_usd: body.price_usd,
          tx_signature: body.tx_signature,
          pnl_sol: body.pnl_sol,
          pnl_percent: body.pnl_percent,
        })
        .select()
        .single();

      if (tradeError) {
        console.error('Trade insert error:', tradeError);
        throw tradeError;
      }

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      const isWin = (body.pnl_sol ?? 0) > 0;
      
      const { data: existingStats } = await supabase
        .from('performance_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (existingStats) {
        await supabase
          .from('performance_stats')
          .update({
            total_trades: existingStats.total_trades + 1,
            winning_trades: existingStats.winning_trades + (isWin ? 1 : 0),
            losing_trades: existingStats.losing_trades + (isWin ? 0 : 1),
            total_pnl_sol: parseFloat(existingStats.total_pnl_sol || 0) + (body.pnl_sol || 0),
            total_volume_sol: parseFloat(existingStats.total_volume_sol || 0) + body.amount_sol,
          })
          .eq('id', existingStats.id);
      } else {
        await supabase
          .from('performance_stats')
          .insert({
            user_id: userId,
            date: today,
            total_trades: 1,
            winning_trades: isWin ? 1 : 0,
            losing_trades: isWin ? 0 : 1,
            total_pnl_sol: body.pnl_sol || 0,
            total_volume_sol: body.amount_sol,
          });
      }

      return new Response(
        JSON.stringify({ success: true, trade }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/position' && req.method === 'POST') {
      const body: PositionPayload = await req.json();

      // Get wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('address', body.wallet_address)
        .maybeSingle();

      const walletId = wallet?.id || null;

      // Upsert position
      const { data: position, error: posError } = await supabase
        .from('positions')
        .upsert({
          user_id: userId,
          wallet_id: walletId,
          token_mint: body.token_mint,
          token_symbol: body.token_symbol,
          amount: body.amount,
          avg_buy_price: body.avg_buy_price,
          current_price: body.current_price,
          unrealized_pnl_sol: body.unrealized_pnl_sol,
          unrealized_pnl_percent: body.unrealized_pnl_percent,
          is_open: body.is_open ?? true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,wallet_id,token_mint',
        })
        .select()
        .single();

      if (posError) {
        console.error('Position upsert error:', posError);
        throw posError;
      }

      return new Response(
        JSON.stringify({ success: true, position }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/wallet' && req.method === 'POST') {
      const body: WalletPayload = await req.json();

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .upsert({
          user_id: userId,
          address: body.address,
          name: body.name,
          balance_sol: body.balance_sol,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,address',
        })
        .select()
        .single();

      if (walletError) {
        console.error('Wallet upsert error:', walletError);
        throw walletError;
      }

      return new Response(
        JSON.stringify({ success: true, wallet }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/stats' && req.method === 'GET') {
      // Get aggregated stats
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId);

      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_open', true);

      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      const totalPnl = trades?.reduce((sum, t) => sum + (parseFloat(t.pnl_sol as any) || 0), 0) || 0;
      const winningTrades = trades?.filter(t => (parseFloat(t.pnl_sol as any) || 0) > 0).length || 0;
      const winRate = trades?.length ? (winningTrades / trades.length) * 100 : 0;

      return new Response(
        JSON.stringify({
          totalPnl,
          totalTrades: trades?.length || 0,
          winningTrades,
          winRate,
          openPositions: positions?.length || 0,
          activeWallets: wallets?.length || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bot API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
