import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RealtimeCandlestickChartProps {
  mint: string;
  symbol?: string;
  initialPrice?: number | null;
  className?: string;
}

type TimeframeOption = '1s' | '5s' | '15s' | '1m';

const TIMEFRAME_CONFIG: Record<TimeframeOption, { ms: number; label: string; maxCandles: number }> = {
  '1s': { ms: 1000, label: '1s', maxCandles: 300 },
  '5s': { ms: 5000, label: '5s', maxCandles: 200 },
  '15s': { ms: 15000, label: '15s', maxCandles: 150 },
  '1m': { ms: 60000, label: '1m', maxCandles: 120 },
};

export function RealtimeCandlestickChart({ mint, symbol, initialPrice, className }: RealtimeCandlestickChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(initialPrice ?? null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1s');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Zoom and scroll state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const config = TIMEFRAME_CONFIG[timeframe];

  // Visible candles based on zoom
  const visibleCandleCount = Math.max(20, Math.floor(60 / zoomLevel));

  const fetchPrice = useCallback(async (): Promise<number | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('realtime-price', {
        body: { mint }
      });
      if (error) return null;
      return data?.price ?? null;
    } catch {
      return null;
    }
  }, [mint]);

  const updateCandle = useCallback((price: number) => {
    const now = Date.now();
    const candleTime = Math.floor(now / config.ms) * config.ms;

    setCandles(prev => {
      const newCandles = [...prev];
      const lastCandle = newCandles[newCandles.length - 1];

      if (lastCandle && lastCandle.time === candleTime) {
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
        lastCandle.close = price;
        lastCandle.volume += 1;
      } else {
        newCandles.push({
          time: candleTime,
          open: lastCandle?.close ?? price,
          high: price,
          low: price,
          close: price,
          volume: 1,
        });
        while (newCandles.length > config.maxCandles) newCandles.shift();
      }
      return newCandles;
    });

    setCurrentPrice(price);
    setIsConnected(true);
    setIsLoading(false);
    setErrorCount(0);
  }, [config.ms, config.maxCandles]);

  useEffect(() => {
    if (!mint) return;
    let isActive = true;
    setIsLoading(true);
    setCandles([]);
    setScrollOffset(0);
    setZoomLevel(1);

    const startPolling = async () => {
      const price = await fetchPrice();
      if (price && isActive) updateCandle(price);
      else if (initialPrice && isActive) updateCandle(initialPrice);

      const pollInterval = timeframe === '1s' ? 500 : timeframe === '5s' ? 1000 : 1500;
      intervalRef.current = setInterval(async () => {
        if (!isActive) return;
        const p = await fetchPrice();
        if (p && isActive) updateCandle(p);
        else setErrorCount(prev => { if (prev > 5) setIsConnected(false); return prev + 1; });
      }, pollInterval);
    };

    startPolling();
    return () => { isActive = false; if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mint, timeframe, fetchPrice, updateCandle, initialPrice]);

  // Get visible candles based on scroll and zoom
  const visibleCandles = useMemo(() => {
    const startIndex = Math.max(0, candles.length - visibleCandleCount - scrollOffset);
    const endIndex = Math.min(candles.length, startIndex + visibleCandleCount);
    return candles.slice(startIndex, endIndex);
  }, [candles, visibleCandleCount, scrollOffset]);

  // Max scroll offset
  const maxScrollOffset = Math.max(0, candles.length - visibleCandleCount);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setScrollOffset(0);
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY < 0) {
        setZoomLevel(prev => Math.min(prev * 1.1, 5));
      } else {
        setZoomLevel(prev => Math.max(prev / 1.1, 0.5));
      }
    } else {
      const scrollDelta = Math.sign(e.deltaY) * 3;
      setScrollOffset(prev => Math.max(0, Math.min(maxScrollOffset, prev + scrollDelta)));
    }
  }, [maxScrollOffset]);

  // Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = dragStart - e.clientX;
    const candleWidth = chartContainerRef.current ? chartContainerRef.current.clientWidth / visibleCandleCount : 10;
    const scrollDelta = Math.round(delta / candleWidth);
    if (Math.abs(scrollDelta) >= 1) {
      setScrollOffset(prev => Math.max(0, Math.min(maxScrollOffset, prev + scrollDelta)));
      setDragStart(e.clientX);
    }
  }, [isDragging, dragStart, visibleCandleCount, maxScrollOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatMarketCap = (price: number) => {
    const mcap = price * 1000000000;
    if (mcap >= 1000000) return `${(mcap / 1000000).toFixed(1)}M`;
    if (mcap >= 1000) return `${(mcap / 1000).toFixed(1)}K`;
    return mcap.toFixed(0);
  };

  // Chart metrics based on visible candles - use Axiom-style fixed percentage range
  const chartMetrics = useMemo(() => {
    if (visibleCandles.length === 0) return null;

    // Get the latest price as center reference
    const latestCandle = visibleCandles[visibleCandles.length - 1];
    const centerPrice = latestCandle.close;
    
    // Use a fixed 8% range (±4% from center) like Axiom
    const rangePercent = 0.08;
    const halfRange = centerPrice * rangePercent / 2;
    
    let minPrice = centerPrice - halfRange;
    let maxPrice = centerPrice + halfRange;
    
    // Ensure all visible candles fit, but don't let outliers destroy the scale
    const allHighs = visibleCandles.map(c => c.high);
    const allLows = visibleCandles.map(c => c.low);
    const dataMin = Math.min(...allLows);
    const dataMax = Math.max(...allHighs);
    
    // Only expand range if data is within 2x of the base range (filter extreme outliers)
    const expandedMin = centerPrice - halfRange * 2;
    const expandedMax = centerPrice + halfRange * 2;
    
    if (dataMin >= expandedMin && dataMin < minPrice) {
      minPrice = dataMin - (centerPrice * 0.005);
    }
    if (dataMax <= expandedMax && dataMax > maxPrice) {
      maxPrice = dataMax + (centerPrice * 0.005);
    }

    const maxVolume = Math.max(...visibleCandles.map(c => c.volume), 1);

    return {
      minPrice,
      maxPrice,
      priceRange: maxPrice - minPrice,
      maxVolume,
    };
  }, [visibleCandles]);

  const displayCandle = hoveredCandle || visibleCandles[visibleCandles.length - 1];
  const priceChange = displayCandle 
    ? ((displayCandle.close - displayCandle.open) / displayCandle.open * 100)
    : 0;

  const chartHeight = isExpanded ? 'h-[420px]' : 'h-80';
  const priceChartHeight = 100;
  
  // Crosshair state
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartMetrics || !svgRef.current || isDragging) {
      setCrosshairPos(null);
      return;
    }
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Only show crosshair in chart area
    if (xPercent > 90 || yPercent > priceChartHeight) {
      setCrosshairPos(null);
      return;
    }
    
    // Calculate price at y position
    const price = chartMetrics.maxPrice - (yPercent / priceChartHeight) * chartMetrics.priceRange;
    
    // Find candle at x position
    const candleIndex = Math.floor((xPercent / 90) * visibleCandles.length);
    const candle = visibleCandles[candleIndex];
    
    setCrosshairPos({
      x: xPercent,
      y: yPercent,
      price,
      time: candle?.time || Date.now(),
    });
    
    if (candle) {
      setHoveredCandle(candle);
    }
  }, [chartMetrics, visibleCandles, isDragging, priceChartHeight]);

  const handleChartMouseLeave = useCallback(() => {
    setCrosshairPos(null);
    setHoveredCandle(null);
    handleMouseUp();
  }, []);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-[#0d1117] rounded border border-[#1e2530]", chartHeight, className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs">Connessione...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#9ca3af] text-xs">{symbol || 'TOKEN'}/USD on Pump V1</span>
          <span className="text-[#9ca3af]">·</span>
          <span className="text-[#9ca3af]">{config.label}</span>
          <span className="text-[#9ca3af]">·</span>
          <span className="text-[#9ca3af]">axiom.trade</span>
          <div className={cn(
            "w-2 h-2 rounded-full ml-1",
            isConnected ? "bg-primary animate-pulse" : "bg-destructive"
          )} />
        </div>
        
        {displayCandle && (
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-primary">●</span>
            <span className="text-[#9ca3af]">O</span>
            <span className="text-white">{formatMarketCap(displayCandle.open)}</span>
            <span className="text-[#9ca3af]">H</span>
            <span className="text-white">{formatMarketCap(displayCandle.high)}</span>
            <span className="text-[#9ca3af]">L</span>
            <span className="text-white">{formatMarketCap(displayCandle.low)}</span>
            <span className="text-[#9ca3af]">C</span>
            <span className="text-white">{formatMarketCap(displayCandle.close)}</span>
            <span className={cn(
              "ml-1",
              priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
            )}>
              ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Timeframe + Zoom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {(Object.keys(TIMEFRAME_CONFIG) as TimeframeOption[]).map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant="ghost"
              className={cn(
                "h-6 px-2 text-xs font-normal rounded",
                timeframe === tf 
                  ? "bg-primary text-primary-foreground" 
                  : "text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
              )}
              onClick={() => setTimeframe(tf)}
            >
              {TIMEFRAME_CONFIG[tf].label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-[#9ca3af] font-mono w-10 text-center">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white hover:bg-[#1e2530]"
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-[#1e2530] mx-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Chart Container with zoom and scroll */}
      <div 
        ref={chartContainerRef}
        className={cn(
          "relative bg-[#0d1117] rounded overflow-hidden transition-all cursor-grab active:cursor-grabbing",
          chartHeight,
          isDragging && "select-none"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleChartMouseLeave}
      >
        {visibleCandles.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#9ca3af] text-sm">
            In attesa di dati...
          </div>
        ) : chartMetrics && (
          <svg 
            ref={svgRef} 
            className="w-full h-full"
            onMouseMove={handleChartMouseMove}
          >
            {/* Price Chart Area - Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={`h-${ratio}`}
                x1="0%"
                y1={`${ratio * priceChartHeight}%`}
                x2="90%"
                y2={`${ratio * priceChartHeight}%`}
                stroke="#1e2530"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
            ))}

            {/* Candlesticks */}
            {visibleCandles.map((candle, index) => {
              const candleWidth = 90 / visibleCandles.length;
              const gap = candleWidth * 0.15;
              const x = (index / visibleCandles.length) * 90;
              const centerX = x + candleWidth / 2;
              
              const isUp = candle.close >= candle.open;
              const upColor = '#22c55e';
              const downColor = '#ef4444';
              const color = isUp ? upColor : downColor;
              
              const highY = ((chartMetrics.maxPrice - candle.high) / chartMetrics.priceRange) * priceChartHeight;
              const lowY = ((chartMetrics.maxPrice - candle.low) / chartMetrics.priceRange) * priceChartHeight;
              const openY = ((chartMetrics.maxPrice - candle.open) / chartMetrics.priceRange) * priceChartHeight;
              const closeY = ((chartMetrics.maxPrice - candle.close) / chartMetrics.priceRange) * priceChartHeight;
              
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(Math.abs(closeY - openY), 0.3);

              return (
                <g 
                  key={candle.time}
                  onMouseEnter={() => setHoveredCandle(candle)}
                  style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
                >
                  {/* Wick */}
                  <line
                    x1={`${centerX}%`}
                    y1={`${highY}%`}
                    x2={`${centerX}%`}
                    y2={`${lowY}%`}
                    stroke={color}
                    strokeWidth="1"
                  />
                  {/* Body */}
                  <rect
                    x={`${x + gap}%`}
                    y={`${bodyTop}%`}
                    width={`${candleWidth - gap * 2}%`}
                    height={`${bodyHeight}%`}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}

            {/* Current price line */}
            {currentPrice && scrollOffset === 0 && (
              <line
                x1="0%"
                y1={`${((chartMetrics.maxPrice - currentPrice) / chartMetrics.priceRange) * priceChartHeight}%`}
                x2="90%"
                y2={`${((chartMetrics.maxPrice - currentPrice) / chartMetrics.priceRange) * priceChartHeight}%`}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
            )}

            {/* Y-Axis price labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const price = chartMetrics.maxPrice - (ratio * chartMetrics.priceRange);
              return (
                <text
                  key={`y-${ratio}`}
                  x="92%"
                  y={`${ratio * priceChartHeight}%`}
                  fill="#9ca3af"
                  fontSize="9"
                  dominantBaseline="middle"
                  fontFamily="monospace"
                >
                  {formatMarketCap(price)}
                </text>
              );
            })}

            {/* Crosshair */}
            {crosshairPos && (
              <>
                {/* Vertical line */}
                <line
                  x1={`${crosshairPos.x}%`}
                  y1="0%"
                  x2={`${crosshairPos.x}%`}
                  y2={`${priceChartHeight}%`}
                  stroke="#6b7280"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                  pointerEvents="none"
                />
                {/* Horizontal line */}
                <line
                  x1="0%"
                  y1={`${crosshairPos.y}%`}
                  x2="90%"
                  y2={`${crosshairPos.y}%`}
                  stroke="#6b7280"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                  pointerEvents="none"
                />
              </>
            )}
          </svg>
        )}

        {/* Crosshair price label */}
        {crosshairPos && chartMetrics && (
          <div 
            className="absolute right-12 px-1.5 py-0.5 bg-[#374151] text-white text-[10px] font-mono rounded-sm pointer-events-none"
            style={{
              top: `${crosshairPos.y}%`,
              transform: 'translateY(-50%)',
            }}
          >
            {formatMarketCap(crosshairPos.price)}
          </div>
        )}

        {/* Crosshair time label */}
        {crosshairPos && (
          <div 
            className="absolute bottom-6 px-1.5 py-0.5 bg-[#374151] text-white text-[10px] font-mono rounded-sm pointer-events-none"
            style={{
              left: `${crosshairPos.x}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {new Date(crosshairPos.time).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        )}

        {/* Current price badge */}
        {currentPrice && chartMetrics && scrollOffset === 0 && !crosshairPos && (
          <div 
            className="absolute right-12 px-1.5 py-0.5 bg-[#ef4444] text-white text-[10px] font-mono font-semibold rounded-sm"
            style={{
              top: `${((chartMetrics.maxPrice - currentPrice) / chartMetrics.priceRange) * priceChartHeight}%`,
              transform: 'translateY(-50%)',
            }}
          >
            {formatMarketCap(currentPrice)}
          </div>
        )}

        {/* Scroll indicator */}
        {scrollOffset > 0 && (
          <div className="absolute top-2 right-14 bg-[#1e2530]/90 px-2 py-1 rounded text-[10px] text-[#9ca3af] font-mono">
            -{scrollOffset} candles
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-[#9ca3af] font-mono px-1">
        {visibleCandles.filter((_, i) => i % Math.ceil(visibleCandles.length / 6) === 0).slice(0, 6).map((candle) => (
          <span key={candle.time}>
            {new Date(candle.time).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
              second: timeframe !== '1m' ? '2-digit' : undefined,
            })}
          </span>
        ))}
      </div>

      {/* Scroll help */}
      <div className="text-[9px] text-[#6b7280] text-center">
        Scroll: naviga · Ctrl+Scroll: zoom · Hover: crosshair
      </div>
    </div>
  );
}
