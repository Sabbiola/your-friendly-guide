import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramNotification {
  type: 'trade' | 'pnl_alert' | 'stop_loss' | 'take_profit' | 'wallet_movement' | 'copy_trade_success' | 'copy_trade_failed';
  data: {
    // Trade data
    token?: string;
    tokenMint?: string;
    action?: 'buy' | 'sell';
    amount?: number;
    price?: number;
    totalValue?: number;
    platform?: string;
    txHash?: string;
    
    // Wallet data
    walletAddress?: string;
    walletLabel?: string;
    
    // PnL data
    pnl?: number;
    pnlPercentage?: number;
    threshold?: number;
    
    // Copy trade specific
    sourceWallet?: string;
    executedAmount?: number;
    errorMessage?: string;
    
    // General
    timestamp?: string;
  };
}

function formatTradeMessage(data: TelegramNotification['data']): string {
  const emoji = data.action === 'buy' ? '🟢' : '🔴';
  const actionText = data.action === 'buy' ? 'ACQUISTO' : 'VENDITA';
  
  return `
${emoji} *${actionText} ESEGUITO*

🪙 *Token:* ${data.token || 'Unknown'}
💰 *Importo:* ${data.amount?.toFixed(4)} SOL
💵 *Prezzo:* $${data.price?.toFixed(6)}
📊 *Valore Totale:* $${data.totalValue?.toFixed(2)}
🏦 *Piattaforma:* ${data.platform || 'Jupiter'}

👛 *Wallet Copiato:* ${data.walletLabel || 'Unknown'}
\`${data.walletAddress?.slice(0, 8)}...${data.walletAddress?.slice(-8)}\`

🔗 [Vedi Transazione](https://solscan.io/tx/${data.txHash})
🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatPnLAlertMessage(data: TelegramNotification['data']): string {
  const emoji = (data.pnl || 0) >= 0 ? '📈' : '📉';
  const statusEmoji = (data.pnl || 0) >= 0 ? '🟢' : '🔴';
  
  return `
${emoji} *ALERT PnL*

${statusEmoji} *PnL Attuale:* ${(data.pnl || 0) >= 0 ? '+' : ''}${data.pnl?.toFixed(2)} SOL
📊 *Variazione:* ${(data.pnlPercentage || 0) >= 0 ? '+' : ''}${data.pnlPercentage?.toFixed(2)}%
⚡ *Soglia Raggiunta:* ${data.threshold}%

🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatStopLossMessage(data: TelegramNotification['data']): string {
  return `
🛑 *STOP LOSS ATTIVATO*

🪙 *Token:* ${data.token || 'Unknown'}
📉 *Perdita:* ${data.pnlPercentage?.toFixed(2)}%
💸 *PnL:* ${data.pnl?.toFixed(2)} SOL
🔒 *Soglia Impostata:* ${data.threshold}%

⚡ Posizione chiusa automaticamente

👛 *Wallet:* ${data.walletLabel}
🔗 [Vedi Token](https://solscan.io/token/${data.tokenMint})
🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatTakeProfitMessage(data: TelegramNotification['data']): string {
  return `
🎯 *TAKE PROFIT RAGGIUNTO*

🪙 *Token:* ${data.token || 'Unknown'}
📈 *Profitto:* +${data.pnlPercentage?.toFixed(2)}%
💰 *PnL:* +${data.pnl?.toFixed(2)} SOL
🎯 *Target Raggiunto:* ${data.threshold}%

✅ Posizione chiusa con profitto!

👛 *Wallet:* ${data.walletLabel}
🔗 [Vedi Token](https://solscan.io/token/${data.tokenMint})
🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatWalletMovementMessage(data: TelegramNotification['data']): string {
  const emoji = data.action === 'buy' ? '🟢' : '🔴';
  const actionText = data.action === 'buy' ? 'ACQUISTO' : 'VENDITA';
  
  return `
👀 *MOVIMENTO WALLET SEGUITO*

${emoji} *${actionText}* rilevato

👛 *Wallet:* ${data.walletLabel}
\`${data.walletAddress?.slice(0, 8)}...${data.walletAddress?.slice(-8)}\`

🪙 *Token:* ${data.token || 'Unknown'}
💰 *Importo:* ${data.amount?.toFixed(4)} SOL
💵 *Prezzo:* $${data.price?.toFixed(6)}
🏦 *Piattaforma:* ${data.platform || 'Unknown'}

🔗 [Vedi Transazione](https://solscan.io/tx/${data.txHash})
🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatCopyTradeSuccessMessage(data: TelegramNotification['data']): string {
  const emoji = data.action === 'buy' ? '🟢' : '🔴';
  const actionText = data.action === 'buy' ? 'ACQUISTO' : 'VENDITA';
  
  return `
🤖 *COPY TRADE ESEGUITO*

${emoji} *${actionText}* copiato con successo!

🪙 *Token:* ${data.token || 'Unknown'}
📍 \`${data.tokenMint?.slice(0, 8)}...${data.tokenMint?.slice(-8) || ''}\`

💰 *Importo Eseguito:* ${data.executedAmount?.toFixed(4)} SOL
📊 *Importo Originale:* ${data.amount?.toFixed(4)} SOL
🏦 *DEX:* ${data.platform || 'Jupiter'}

👛 *Wallet Copiato:* 
\`${data.sourceWallet?.slice(0, 8)}...${data.sourceWallet?.slice(-8) || ''}\`

🔗 [Vedi Transazione](https://solscan.io/tx/${data.txHash})
🔗 [DexScreener](https://dexscreener.com/solana/${data.tokenMint})
🔗 [RugCheck](https://rugcheck.xyz/tokens/${data.tokenMint})

🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatCopyTradeFailedMessage(data: TelegramNotification['data']): string {
  const emoji = data.action === 'buy' ? '🟢' : '🔴';
  const actionText = data.action === 'buy' ? 'ACQUISTO' : 'VENDITA';
  
  return `
⚠️ *COPY TRADE FALLITO*

${emoji} *${actionText}* non eseguito

🪙 *Token:* ${data.token || 'Unknown'}
📍 \`${data.tokenMint?.slice(0, 8)}...${data.tokenMint?.slice(-8) || ''}\`

💰 *Importo Tentato:* ${data.amount?.toFixed(4)} SOL
🏦 *DEX:* ${data.platform || 'Jupiter'}

❌ *Errore:* ${data.errorMessage || 'Errore sconosciuto'}

👛 *Wallet Copiato:* 
\`${data.sourceWallet?.slice(0, 8)}...${data.sourceWallet?.slice(-8) || ''}\`

🔗 [DexScreener](https://dexscreener.com/solana/${data.tokenMint})

🕐 ${data.timestamp || new Date().toLocaleString('it-IT')}
`.trim();
}

function formatMessage(notification: TelegramNotification): string {
  switch (notification.type) {
    case 'trade':
      return formatTradeMessage(notification.data);
    case 'pnl_alert':
      return formatPnLAlertMessage(notification.data);
    case 'stop_loss':
      return formatStopLossMessage(notification.data);
    case 'take_profit':
      return formatTakeProfitMessage(notification.data);
    case 'wallet_movement':
      return formatWalletMovementMessage(notification.data);
    case 'copy_trade_success':
      return formatCopyTradeSuccessMessage(notification.data);
    case 'copy_trade_failed':
      return formatCopyTradeFailedMessage(notification.data);
    default:
      return `📢 Notifica: ${JSON.stringify(notification.data)}`;
  }
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }
    
    console.log('Message sent successfully to Telegram');
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      console.error('Missing Telegram configuration');
      return new Response(
        JSON.stringify({ error: 'Telegram non configurato. Aggiungi TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const notification: TelegramNotification = await req.json();
    console.log('Received notification:', JSON.stringify(notification));

    // Add timestamp if not present
    if (!notification.data.timestamp) {
      notification.data.timestamp = new Date().toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    }

    const message = formatMessage(notification);
    const success = await sendTelegramMessage(botToken, chatId, message);

    if (success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notifica inviata con successo' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Errore invio notifica Telegram' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error('Error in telegram-notify function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
