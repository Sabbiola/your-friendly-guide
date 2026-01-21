import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, ExternalLink, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DexScreenerChartProps {
  mint: string;
  symbol?: string;
  className?: string;
}

export function DexScreenerChart({ mint, symbol, className }: DexScreenerChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // DexScreener embed URL for Solana tokens
  const embedUrl = `https://dexscreener.com/solana/${mint}?embed=1&theme=dark&trades=0&info=0`;

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const openDexScreener = () => {
    window.open(`https://dexscreener.com/solana/${mint}`, '_blank');
  };

  const chartContent = (
    <div 
      className={cn(
        "relative bg-[#0d1117] overflow-hidden transition-all",
        isFullscreen 
          ? "fixed inset-0 z-[9999] rounded-none" 
          : "h-80 rounded-lg border border-[#1e2530]"
      )}
    >
      {/* Fullscreen Header */}
      {isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0d1117] to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{symbol || 'TOKEN'}/SOL</span>
            <span className="text-[#9ca3af]">·</span>
            <span className="text-primary font-medium">DexScreener</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-sm text-[#9ca3af] hover:text-white hover:bg-[#1e2530] gap-2"
              onClick={openDexScreener}
            >
              <ExternalLink className="w-4 h-4" />
              Apri in DexScreener
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs">Caricamento grafico...</span>
          </div>
        </div>
      )}
      
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        title={`${symbol || 'Token'} Chart`}
        onLoad={() => setIsLoading(false)}
        allow="clipboard-write"
        loading="lazy"
      />

      {/* ESC hint for fullscreen */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1e2530]/80 rounded-full text-xs text-[#9ca3af]">
          Premi <kbd className="px-1.5 py-0.5 bg-[#374151] rounded text-white mx-1">ESC</kbd> per uscire
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-1", className)}>
      {/* Header - only show when not fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#9ca3af] text-xs">{symbol || 'TOKEN'}/SOL</span>
            <span className="text-[#9ca3af]">·</span>
            <span className="text-primary font-medium">DexScreener</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-[#9ca3af] hover:text-white hover:bg-[#1e2530] gap-1"
              onClick={openDexScreener}
            >
              <ExternalLink className="w-3 h-3" />
              Apri
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
              onClick={() => setIsFullscreen(true)}
              title="Schermo intero"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Chart - render in portal when fullscreen */}
      {isFullscreen 
        ? createPortal(chartContent, document.body)
        : chartContent
      }
    </div>
  );
}
