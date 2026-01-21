import { supabase } from "@/integrations/supabase/client";

export interface TradeNotification {
  token: string;
  tokenMint: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  totalValue: number;
  platform: string;
  txHash: string;
  walletAddress: string;
  walletLabel: string;
}

export interface PnLAlertNotification {
  pnl: number;
  pnlPercentage: number;
  threshold: number;
}

export interface StopLossNotification {
  token: string;
  tokenMint: string;
  pnl: number;
  pnlPercentage: number;
  threshold: number;
  walletLabel: string;
}

export interface TakeProfitNotification {
  token: string;
  tokenMint: string;
  pnl: number;
  pnlPercentage: number;
  threshold: number;
  walletLabel: string;
}

export interface WalletMovementNotification {
  token: string;
  tokenMint?: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  platform: string;
  txHash: string;
  walletAddress: string;
  walletLabel: string;
}

type NotificationType = 'trade' | 'pnl_alert' | 'stop_loss' | 'take_profit' | 'wallet_movement';

type NotificationData = 
  | TradeNotification 
  | PnLAlertNotification 
  | StopLossNotification 
  | TakeProfitNotification 
  | WalletMovementNotification;

async function sendNotification(type: NotificationType, data: NotificationData): Promise<boolean> {
  try {
    const { data: response, error } = await supabase.functions.invoke('telegram-notify', {
      body: { type, data },
    });

    if (error) {
      console.error('Error sending Telegram notification:', error);
      return false;
    }

    console.log('Telegram notification sent:', response);
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

export const telegramService = {
  notifyTrade: (data: TradeNotification) => sendNotification('trade', data),
  notifyPnLAlert: (data: PnLAlertNotification) => sendNotification('pnl_alert', data),
  notifyStopLoss: (data: StopLossNotification) => sendNotification('stop_loss', data),
  notifyTakeProfit: (data: TakeProfitNotification) => sendNotification('take_profit', data),
  notifyWalletMovement: (data: WalletMovementNotification) => sendNotification('wallet_movement', data),
};
