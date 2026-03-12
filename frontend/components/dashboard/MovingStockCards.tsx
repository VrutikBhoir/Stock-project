'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { STOCKS, Stock } from '@/data/stocks';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://stocklens-production-89a6.up.railway.app/';
const BATCH_SIZE = 6;

type Quote = {
  symbol?: string;
  price?: number;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;

  // 🔥 ADDED
  signal?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  news?: {
  sentiment: string;
  confidence: number;
  headline: string;
  summary?: string;
  impact?: 'Low' | 'Medium' | 'High';
};
};

type TickerItem = {
  key: string;
  stock: Stock;
  quote?: Quote;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

async function fetchQuotesBatch(
  symbols: string[],
  signal: AbortSignal
): Promise<Partial<Record<string, Quote>>> {
  const response = await fetch(
    `${API_BASE_URL}/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Quotes request failed (${response.status})`);
  }

  const raw = await response.json();

const normalized: Partial<Record<string, Quote>> = {};
Object.entries(raw || {}).forEach(([key, value]) => {
  normalized[key.toUpperCase()] = value as Quote;
});

return normalized;
}

function formatPrice(price?: number): string {
  if (typeof price !== 'number' || !Number.isFinite(price)) return '--';
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatVolume(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (value >= 1.0e9) return `${(value / 1.0e9).toFixed(1)}B`;
  if (value >= 1.0e6) return `${(value / 1.0e6).toFixed(1)}M`;
  if (value >= 1.0e3) return `${(value / 1.0e3).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) % 1000000;
  }
  return hash || 1;
}

function generateFallbackCandles(symbol: string, price?: number): Candle[] {
  const base = typeof price === 'number' && Number.isFinite(price) ? price : 100;
  const seedBase = hashSymbol(symbol);
  const candles: Candle[] = [];
  let seed = seedBase;
  let prev = base;

  for (let i = 0; i < 14; i += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = seed / 233280 - 0.5;
    const drift = 1 + noise * 0.01;
    const open = prev;
    const close = prev * drift;
    const high = Math.max(open, close) * 1.002;
    const low = Math.min(open, close) * 0.998;
    prev = close;

    candles.push({
      time: Date.now() - (14 - i) * 60000,
      open,
      high,
      low,
      close,
    });
  }

  return candles;
}

async function fetchCandles(
  symbol: string,
  signal: AbortSignal
): Promise<Candle[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/candles?symbol=${encodeURIComponent(symbol)}&limit=20`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
      cache: 'no-store',
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function MiniCandles({ candles }: { candles: Candle[] }) {
  const safeCandles = candles.length > 0 ? candles : generateFallbackCandles('FALLBACK', 100);

  const highs = safeCandles.map((c) => c.high);
  const lows = safeCandles.map((c) => c.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  return (
    <svg className="mini-candles" viewBox="0 0 120 40" preserveAspectRatio="none">
      {safeCandles.map((candle, index) => {
        const x = (index / safeCandles.length) * 120;
        const openY = 36 - ((candle.open - min) / range) * 30;
        const closeY = 36 - ((candle.close - min) / range) * 30;
        const highY = 36 - ((candle.high - min) / range) * 30;
        const lowY = 36 - ((candle.low - min) / range) * 30;
        const bullish = candle.close >= candle.open;
        const color = bullish ? '#22c55e' : '#ef4444';
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);

        return (
          <g key={index}>
            <line
              x1={x + 2}
              x2={x + 2}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth="1"
              opacity="0.9"
            />
            <rect
              x={x}
              y={bodyY}
              width="4"
              height={bodyHeight}
              fill={color}
              rx="0.6"
              />
          </g>
        );
      })}
    </svg>
  );
}

export default function MovingStockCards({
  data: _data,
  signals
}: {
  data?: unknown[];
  signals?: Record<string, any>;
}) {
  const router = useRouter()
  const symbols = useMemo(() => STOCKS.map((stock) => stock.symbol), []);
  const stockBySymbol = useMemo(() => {
    return new Map(STOCKS.map((stock) => [stock.symbol, stock]));
  }, []);

  const [items, setItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, Candle[]>>({});

  const controllerRef = useRef<AbortController | null>(null);
  const cursorRef = useRef(0);
  const mountedRef = useRef(false);
  const candlesCacheRef = useRef<Map<string, Candle[]>>(new Map());

  const fetchCandlesForSymbol = useCallback(async (symbol: string, price?: number) => {
    const cached = candlesCacheRef.current.get(symbol);
    if (cached && cached.length > 0) {
      return;
    }

    const controller = controllerRef.current;
    if (!controller) return;

    try {
      const candles = await fetchCandles(symbol, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (candles.length > 0) {
        candlesCacheRef.current.set(symbol, candles);
        setCandlesBySymbol((prev) => ({
          ...prev,
          [symbol]: candles,
        }));
      } else {
        const fallback = cached?.length ? cached : generateFallbackCandles(symbol, price);
        candlesCacheRef.current.set(symbol, fallback);
        setCandlesBySymbol((prev) => ({
          ...prev,
          [symbol]: fallback,
        }));
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const fallback = cached?.length ? cached : generateFallbackCandles(symbol, price);
        candlesCacheRef.current.set(symbol, fallback);
        setCandlesBySymbol((prev) => ({
          ...prev,
          [symbol]: fallback,
        }));
      }
    }
  }, []);

  const runBatchFetch = useCallback(async () => {
    if (symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    cursorRef.current = 0;
    setItems([]);
    setIsLoading(true);
    setErrorMessage(null);

    while (cursorRef.current < symbols.length && mountedRef.current) {
      const start = cursorRef.current;
      const end = Math.min(start + BATCH_SIZE, symbols.length);
      const batch = symbols.slice(start, end);
      cursorRef.current = end;

      try {
        const quoteMap = await fetchQuotesBatch(batch, controller.signal);
        console.log('QUOTE MAP FROM API:', quoteMap);
        if (!mountedRef.current || controller.signal.aborted) {
          return;
        }

        const newItems = batch
          .map((symbol) => {
            const stock = stockBySymbol.get(symbol);
            if (!stock) return null;
            return {
              key: symbol,
              stock,
              quote: quoteMap[symbol],
            } as TickerItem;
          })
          .filter((entry): entry is TickerItem => entry !== null);

        setItems((prev) => [...prev, ...newItems]);
        newItems.forEach((item) => {
          const basePrice = item.quote?.currentPrice ?? item.quote?.price;
          void fetchCandlesForSymbol(item.stock.symbol, basePrice);
        });
        setIsLoading(false);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        setErrorMessage('Unable to load some market data. Continuing...');
      }
    }
  }, [symbols, stockBySymbol]);

  useEffect(() => {
    mountedRef.current = true;
    runBatchFetch();

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [runBatchFetch]);

  const loopedItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  if (isLoading && items.length === 0) {
    return (
      <div className="moving-stocks-state">Loading live market data...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="moving-stocks-state">
        {errorMessage || 'No live stock data available right now.'}
      </div>
    );
  }

  return (
    <div className="moving-stocks-container">
      {errorMessage && <div className="status-banner">{errorMessage}</div>}

      <div className="moving-stock-viewport">
        <div
          className="moving-stock-track"
        >
          {loopedItems.map((item, index) => {
            
            const price = item.quote?.currentPrice ?? item.quote?.price;
            const changePercent = item.quote?.changePercent;
            const change = item.quote?.change;
            const isUp = typeof changePercent === 'number' && changePercent >= 0;
            const changeClass = isUp ? 'positive' : 'negative';
            const signal = item.quote?.signal ?? 'neutral';
            const news = item.quote?.news;
            const headline = news?.headline;
            const sentiment = news?.sentiment;
            const impact = news?.impact;
            const summary = news?.summary;
            console.log('USING QUOTE FOR', item.stock.symbol, item.quote);
            return (
              <article
                className="moving-stock-card"
                key={`${item.key}-${index}`}
              >
                <header className="stock-header">
                  <strong className="stock-symbol">{item.stock.symbol}</strong>
                  <span className="stock-exchange">
                    {item.stock.exchange || 'EXCH'}
                  </span>
                </header>

                <p className="stock-name">{item.stock.name}</p>
                
                <div className="price-row">
                  <span className="stock-price">${formatPrice(price)}</span>
                  <span className={`stock-change ${changeClass}`}>
                    {formatPercent(changePercent)}
                  </span>
                </div>
                <div className="mini-candles-wrap">
                  <MiniCandles candles={candlesBySymbol[item.stock.symbol] || generateFallbackCandles(item.stock.symbol, price)} />
                </div>
                <div className="meta-grid">
                  <span>Volume: {formatVolume(item.quote?.volume)}</span>
                  <span>
                    Change: {formatPrice(change)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .moving-stocks-container {
          overflow: hidden;
          width: 100%;
          padding: 0;
          border-radius: 16px;
          background: transparent;
        }

        .status-banner {
          margin: 0 16px 12px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.12);
          border: 1px solid rgba(251, 191, 36, 0.35);
        }

        .moving-stocks-state {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
        }

        .moving-stock-viewport {
          height: 180px;
          overflow: hidden;
          position: relative;
          padding: 0 8px;
        }

        .moving-stock-track {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: scroll-left 70\s linear infinite;
          will-change: transform;
        }

        .moving-stock-track:hover {
          animation-play-state: paused;
        }

        .moving-stock-card {
      width: 280px; 
      height: 170px;
      flex: 0 0 auto;
      padding: 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(12, 20, 38, 0.98), rgba(20, 32, 56, 0.95));
      border: 1px solid rgba(56, 189, 248, 0.25);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 30px rgba(2, 6, 23, 0.4);
      display: grid;
      grid-template-rows: auto auto auto 42px auto auto;
    }

        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stock-symbol {
          color: #60a5fa;
          font-size: 16px;
        }

        .stock-exchange {
          font-size: 11px;
          color: #94a3b8;
          background: rgba(100, 116, 139, 0.18);
          border-radius: 6px;
          padding: 2px 8px;
        }

        .stock-name {
          margin: 6px 0 8px;
          color: #cbd5e1;
          font-size: 12px;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .stock-price {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
        }

        .stock-change {
          font-size: 13px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .stock-change.positive {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.12);
        }

        .stock-change.negative {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.12);
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 8px;
          font-size: 11px;
          color: #94a3b8;
        }

        .mini-candles-wrap {
          height: 42px;
          margin-bottom: 6px;
        }

        .mini-candles {
          width: 100%;
          height: 42px;
        }

        .signal-pill {
          margin: 6px 0;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          width: fit-content;
        }

        .signal-pill.bullish {
          background: rgba(34, 197, 94, 0.18);
          color: #22c55e;
        }

        .signal-pill.bearish {
          background: rgba(239, 68, 68, 0.18);
          color: #ef4444;
        }

        .signal-pill.neutral {
          background: rgba(148, 163, 184, 0.18);
          color: #94a3b8;
        }

        @keyframes scroll-left {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 768px) {
          .moving-stock-viewport {
            height: 160px;
          }

          .moving-stock-card {
            width: 240px;
            height: 165px;
          }

          .stock-price {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
