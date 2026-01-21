import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TokenAnalysisCard } from '@/components/assistant/TokenAnalysisCard';
import { ChatMessage } from '@/components/assistant/ChatMessage';
import { UserProfileCard } from '@/components/assistant/UserProfileCard';
import { useTokenAnalysis } from '@/hooks/useTokenAnalysis';
import { useTradingAssistant } from '@/hooks/useTradingAssistant';
import { useWalletContext } from '@/contexts/WalletContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Search, 
  Sparkles, 
  Trash2, 
  Bot,
  ArrowRight,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
  { label: 'Analizza rischi', prompt: 'Analizza i rischi di questo token e dimmi se è sicuro investire' },
  { label: 'Strategia entry', prompt: 'Suggerisci una strategia di entry per questo token' },
  { label: 'Valuta liquidità', prompt: 'Valuta la liquidità e dimmi se posso entrare con 1 SOL' },
  { label: 'Red flags', prompt: 'Ci sono red flags in questo token? Dev holdings, rug risk?' },
];

export default function Assistant() {
  const [tokenInput, setTokenInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { tokenData, isLoading: tokenLoading, analyzeToken, clearToken } = useTokenAnalysis();
  const { messages, isLoading: chatLoading, sendMessage, clearChat, error: chatError } = useTradingAssistant();
  const { summary, walletAddress } = useWalletContext();

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show error toast
  useEffect(() => {
    if (chatError) {
      toast.error(chatError);
    }
  }, [chatError]);

  const handleAnalyzeToken = async () => {
    if (!tokenInput.trim()) return;
    
    const result = await analyzeToken(tokenInput.trim());
    if (result) {
      toast.success(`Token ${result.symbol || 'analizzato'} caricato`);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const walletStats = summary ? {
      totalPnlSol: summary.totalPnlSol,
      totalTrades: summary.totalTrades,
      winningTrades: summary.winningTrades,
      losingTrades: summary.losingTrades,
      winRate: summary.winRate,
    } : null;

    await sendMessage(chatInput.trim(), tokenData, walletStats);
    setChatInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'token' | 'chat') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'token') {
        handleAnalyzeToken();
      } else {
        handleSendMessage();
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/30 to-success/10 flex items-center justify-center border border-success/20">
              <Bot className="w-5 h-5 text-success" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Trading Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                Analisi AI per i tuoi trade su Solana
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Pulisci chat
            </Button>
          )}
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* Left Panel - Profile & Token */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 overflow-y-auto">
            {/* User Profile */}
            <UserProfileCard />

            {/* Token Search */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Analizza Token</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Inserisci token address..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'token')}
                  className="text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleAnalyzeToken}
                  disabled={tokenLoading || !tokenInput.trim()}
                >
                  {tokenLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {tokenData && (
                <button
                  onClick={clearToken}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  Rimuovi token
                </button>
              )}
            </div>

            {/* Token Analysis */}
            <TokenAnalysisCard token={tokenData} isLoading={tokenLoading} />
          </div>

          {/* Right Panel - Chat */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col glass-card p-0 overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/20">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Ciao! Sono il tuo Trading Assistant
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-md">
                    Posso analizzare token, suggerire strategie di trading e aiutarti a identificare opportunità e rischi.
                  </p>
                  
                  {/* Quick Start */}
                  <div className="space-y-3 w-full max-w-md">
                    <p className="text-xs text-muted-foreground">Inizia con una domanda:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_PROMPTS.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleQuickPrompt(item.prompt)}
                          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left text-sm"
                        >
                          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {messages.map((msg, i) => (
                    <ChatMessage 
                      key={i} 
                      role={msg.role} 
                      content={msg.content}
                      isLoading={chatLoading && i === messages.length - 1 && msg.role === 'assistant'}
                    />
                  ))}
                  {chatLoading && messages[messages.length - 1]?.role === 'user' && (
                    <ChatMessage role="assistant" content="" isLoading />
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-border/50 p-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Chiedi qualcosa sul token o sul trading..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'chat')}
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4"
                >
                  {chatLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {tokenData 
                  ? `Analizzando: ${tokenData.symbol} • ${tokenData.priceUsd ? `$${tokenData.priceUsd.toFixed(6)}` : 'N/A'}`
                  : 'Inserisci un token address per un\'analisi più accurata'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
