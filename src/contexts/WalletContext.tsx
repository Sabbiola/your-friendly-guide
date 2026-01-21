import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWalletTransactions, WalletTransactionsData, ParsedSwap, TransactionSummary } from '@/hooks/useWalletTransactions';
import { useSolanaWallet, WalletData } from '@/hooks/useSolanaWallet';

interface WalletContextType {
  // Wallet address
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  
  // On-chain wallet data (balance, tokens)
  walletData: WalletData | null;
  walletLoading: boolean;
  walletError: string | null;
  
  // Transaction data (trades, PnL)
  transactionData: WalletTransactionsData | null;
  trades: ParsedSwap[];
  summary: TransactionSummary | null;
  transactionsLoading: boolean;
  transactionsError: string | null;
  
  // Computed values
  tradesToday: number;
  topTokens: { mint: string; symbol: string; pnl: number; trades: number }[];
  platformDistribution: { name: string; value: number; count: number }[];
  dailyPnL: { date: string; pnl: number }[];
  
  // Actions
  refreshTransactions: () => Promise<void>;
  isInitialized: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = 'phantom_wallet_address';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddressState] = useState<string>(() => {
    return localStorage.getItem(WALLET_STORAGE_KEY) || '';
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Use the wallet hook with the stored address
  const { 
    walletData, 
    isLoading: walletLoading, 
    error: walletError,
    refetch: refetchWallet,
  } = useSolanaWallet(walletAddress || null);

  const {
    data: transactionData,
    trades,
    summary,
    isLoading: transactionsLoading,
    error: transactionsError,
    fetchTransactions,
    getTradesToday,
    getTopTokensByPnL,
    getPlatformDistribution,
    getDailyPnL,
  } = useWalletTransactions();

  const setWalletAddress = useCallback((address: string) => {
    setWalletAddressState(address);
    if (address) {
      localStorage.setItem(WALLET_STORAGE_KEY, address);
    } else {
      localStorage.removeItem(WALLET_STORAGE_KEY);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    if (!walletAddress) return;
    await fetchTransactions(walletAddress, 200);
    setIsInitialized(true);
  }, [walletAddress, fetchTransactions]);

  // Fetch transactions when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      refreshTransactions();
    }
  }, [walletAddress, refreshTransactions]);

  const value: WalletContextType = {
    walletAddress,
    setWalletAddress,
    walletData,
    walletLoading,
    walletError,
    transactionData,
    trades,
    summary,
    transactionsLoading,
    transactionsError,
    tradesToday: getTradesToday(),
    topTokens: getTopTokensByPnL(),
    platformDistribution: getPlatformDistribution(),
    dailyPnL: getDailyPnL(),
    refreshTransactions,
    isInitialized,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}
