import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickSeriesPartialOptions,
} from 'lightweight-charts';
import { useStock } from '../StockContext';

interface IntradayBar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IntradaySessionBar {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IntradayResponse {
  time: string;
  price: number;
  market_open: boolean;
  market_status: string;
  data_age_hours: number;
  data_age_minutes: number;
  last_trade_time: string;
  is_market_hours: boolean;
  is_data_fresh: boolean;
  rate_limited?: boolean;
  cache_age_seconds?: number;
  status?: string;
  ohlc: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  };
  candle?: {
    time: string | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
  };
}

const IntradayChart: React.FC = () => {
  const { stock } = useStock();
  
  const [dataPoints, setDataPoints] = useState<IntradayBar[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean>(false);
  const [marketStatus, setMarketStatus] = useState<string>('unknown');
  const [lastTradeTime, setLastTradeTime] = useState<string>('');
  const [dataAgeMinutes, setDataAgeMinutes] = useState<number>(0);
  const [rateLimited, setRateLimited] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const openCheckRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitUntil = useRef<number>(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://stocklens-production-89a6.up.railway.app';

  const POLL_RATE_OPEN = 60000;
  const MARKET_RECHECK_MS = 300000;

  // 1️⃣ Chart + Series initialization - runs ONCE on mount
  useEffect(() => {
    console.log("📊 [CHART] Initializing Lightweight Charts (NOT TradingView widget)...");
    console.log("📦 [CHART] Container ref:", chartContainerRef.current);
    console.log("📐 [CHART] Container dimensions:", {
      width: chartContainerRef.current?.clientWidth,
      height: chartContainerRef.current?.clientHeight,
      offsetWidth: chartContainerRef.current?.offsetWidth,
      offsetHeight: chartContainerRef.current?.offsetHeight,
    });
    
    if (!chartContainerRef.current) {
      console.error("❌ [CHART] Container ref is NULL - cannot initialize");
      return;
    }

    if (chartContainerRef.current.clientWidth === 0 || chartContainerRef.current.clientHeight === 0) {
      console.error("❌ [CHART] Container has zero dimensions - chart won't render");
    }

    try {
      console.log("🎨 [CHART] Calling createChart()...");
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth || 800,
        height: 420,
        layout: {
          background: { color: '#0b1220' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        timeScale: { 
          timeVisible: true, 
          secondsVisible: false,
          rightOffset: 10,
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          },
        },
        rightPriceScale: {
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
      });
      console.log("✅ [CHART] Chart object created:", chartRef.current);
      console.log("🔍 [CHART] Chart has addCandlestickSeries?", typeof chartRef.current.addCandlestickSeries);
      console.log("🔍 [CHART] Lightweight chart mounted - NOT a TradingView widget");

      console.log("📊 [CHART] Adding candlestick series...");
      try {
        // v4.2.0 API - addCandlestickSeries with options
        seriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
        console.log("✅ [CHART] Series created successfully:", seriesRef.current);
      } catch (seriesError) {
        console.error("💥 [CHART] Error creating series:", seriesError);
        console.error("💥 [CHART] Error details:", {
          message: (seriesError as any).message,
          stack: (seriesError as any).stack
        });
        throw seriesError;
      }

      // Check if canvas was created
      const canvas = chartContainerRef.current?.querySelector('canvas');
      if (canvas) {
        console.log("✅ [CHART] Canvas element found:", {
          width: canvas.width,
          height: canvas.height,
          display: window.getComputedStyle(canvas).display,
          visibility: window.getComputedStyle(canvas).visibility,
        });
      } else {
        console.error("❌ [CHART] No canvas element found - chart did not render properly");
      }

      // Check for any iframes (should be NONE)
      const iframes = document.querySelectorAll('iframe');
      if (iframes.length > 0) {
        console.warn("⚠️ [CHART] WARNING: iframes detected on page:", iframes.length);
        iframes.forEach((iframe, i) => {
          console.warn(`  iframe ${i}:`, iframe.src);
        });
      } else {
        console.log("✅ [CHART] No iframes present - confirmed using Lightweight Charts only");
      }

      console.log("✅✅✅ [CHART] INITIALIZATION COMPLETE ✅✅✅");
    } catch (error) {
      console.error("💥 [CHART] Initialization error:", error);
    }

    return () => {
      console.log("🧹 [CHART] Cleanup: removing chart");
      chartRef.current?.remove();
    };
  }, []);

  // 2️⃣ Mount flag initialization
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 3️⃣ Data synchronization - update chart when dataPoints change
  useEffect(() => {
    if (!seriesRef.current) {
      console.warn("⚠️ [DATA] Series not ready, skipping data sync");
      return;
    }

    console.log(`📈 [DATA] Syncing ${dataPoints.length} candles to chart`);
    
    if (dataPoints.length === 0) {
      console.log("🔄 [DATA] Clearing chart (no data from backend)");
      seriesRef.current.setData([]);
      return;
    }

    // Log sample of data for debugging
    if (dataPoints.length > 0) {
      console.log(`📊 [DATA] Sample candles:`, {
        first: dataPoints[0],
        middle: dataPoints[Math.floor(dataPoints.length / 2)],
        last: dataPoints[dataPoints.length - 1]
      });
    }

    // Validate candles before setting
    const validCandles = dataPoints.filter(candle => {
      const isValid = 
        typeof candle.time === 'number' &&
        typeof candle.open === 'number' &&
        typeof candle.high === 'number' &&
        typeof candle.low === 'number' &&
        typeof candle.close === 'number' &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close) &&
        candle.open > 0 &&
        candle.high > 0 &&
        candle.low > 0 &&
        candle.close > 0;
      
      if (!isValid) {
        console.error("❌ [DATA] Invalid candle detected:", candle);
      }
      return isValid;
    });

    if (validCandles.length !== dataPoints.length) {
      console.warn(`⚠️ [DATA] Filtered out ${dataPoints.length - validCandles.length} invalid candles`);
    }

    if (validCandles.length === 0) {
      console.error("❌ [DATA] No valid candles after filtering! All data was invalid.");
      seriesRef.current.setData([]);
      return;
    }

    console.log(`📈 [DATA] Setting ${validCandles.length} valid candles to chart`);
    try {
      seriesRef.current.setData(validCandles);
      console.log(`✅ [DATA] Data set successfully`);
      
      // Auto-fit both time and price scale to show all data
      // Use setTimeout to ensure data is fully rendered before fitting
      setTimeout(() => {
        if (chartRef.current && seriesRef.current) {
          // Fit the time scale to show all bars
          chartRef.current.timeScale().fitContent();
          
          // Fit the price scale to show all price data
          chartRef.current.priceScale('right').applyOptions({
            autoScale: true,
          });
          
          console.log(`✅ [DATA] Chart auto-scaled to data range`);
        }
      }, 50);
    } catch (err) {
      console.error("❌ [DATA] Error setting data to chart:", err);
    }
  }, [dataPoints]);

  // 4️⃣ Stock change handler - critical for clearing old data
  useEffect(() => {
    if (!stock?.symbol) {
      console.log("⚠️ [STOCK] No stock selected - cleaning up");
      stopPolling();
      stopMarketCheck();
      setDataPoints([]);
      setError(null);
      setMarketOpen(false);
      setMarketStatus('unknown');
      return;
    }

    console.log(`🔄 [STOCK] Stock changed to: ${stock.symbol}`);
    console.log("🧹 [STOCK] Clearing previous data and stopping timers");

    let isActive = true;

    // Stop all timers immediately
    stopPolling();
    stopMarketCheck();

    // Clear chart series immediately
    if (seriesRef.current) {
      console.log("🗑️ [STOCK] Clearing chart series");
      seriesRef.current.setData([]);
    }

    // Clear state
    setDataPoints([]);
    setError(null);
    setRateLimited(false);
    rateLimitUntil.current = 0;

    const initializeIntraday = async () => {
      console.log(`🚀 [STOCK] Initializing intraday data for ${stock.symbol}`);
      
      // Try to load cached session data first (instant display)
      loadLastSessionData(stock.symbol);

      // Fetch fresh session data from backend
      console.log(`📡 [SESSION] Fetching session data for ${stock.symbol}...`);
      await fetchSessionData(stock.symbol);
      if (!isActive) return;

      // Check current market status
      console.log(`📡 [LIVE] Checking market status for ${stock.symbol}...`);
      const isOpen = await fetchIntraday();
      if (!isActive) return;

      if (isOpen) {
        console.log(`🟢 [MARKET] Market is OPEN - starting live polling`);
        startPolling();
      } else {
        console.log(`🔴 [MARKET] Market is CLOSED - starting recheck loop`);
        stopPolling();
        startMarketCheck();
      }
    };

    initializeIntraday();

    return () => {
      console.log(`🧹 [STOCK] Cleanup for ${stock.symbol}`);
      isActive = false;
      stopPolling();
      stopMarketCheck();
    };
  }, [stock?.symbol]);

  useEffect(() => {
    if (stock?.symbol && dataPoints.length > 0) {
      saveLastSessionData(stock.symbol, dataPoints);
    }
  }, [dataPoints, stock?.symbol]);

  const isFlat = useMemo(() => {
    if (dataPoints.length < 2) return true;
    const first = dataPoints[0]?.close;
    return dataPoints.every(point => point.close === first);
  }, [dataPoints]);

  const showLive = marketOpen && !isFlat;

  const toUnixTime = (value: string | number | null | undefined): UTCTimestamp | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.floor(value) as UTCTimestamp;
    }
    if (typeof value !== 'string') return null;
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) return null;
    return Math.floor(ts / 1000) as UTCTimestamp;
  };

  const normalizeSessionPoints = (points: IntradaySessionBar[]) => {
    return points
      .map(point => {
        const unixTime = toUnixTime(point.time);
        if (!unixTime) return null;
        return {
          time: unixTime,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        } as IntradayBar;
      })
      .filter((point): point is IntradayBar => point !== null);
  };

  const loadLastSessionData = (symbol: string) => {
    try {
      const key = `intraday_${symbol}`;
      const stored = localStorage.getItem(key);
      if (!stored) {
        console.log(`📦 [CACHE] No cached session for ${symbol}`);
        return;
      }

      const parsed = JSON.parse(stored) as IntradayBar[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.log(`📦 [CACHE] Empty cache for ${symbol}`);
        return;
      }

      const cleaned = parsed.filter(point =>
        typeof point.time === 'number' &&
        typeof point.open === 'number' &&
        typeof point.high === 'number' &&
        typeof point.low === 'number' &&
        typeof point.close === 'number'
      );

      if (cleaned.length === 0) {
        console.log(`📦 [CACHE] No valid candles in cache for ${symbol}`);
        return;
      }

      const last = cleaned[cleaned.length - 1];
      const lastTime = last.time * 1000;
      const daysSince = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
      
      if (daysSince < 7) {
        console.log(`✅ [CACHE] Loaded ${cleaned.length} cached candles for ${symbol} (${daysSince.toFixed(1)} days old)`);
        setDataPoints(cleaned);
      } else {
        console.log(`⏰ [CACHE] Cache too old for ${symbol} (${daysSince.toFixed(1)} days)`);
      }
    } catch (err) {
      console.error(`❌ [CACHE] Error loading session for ${symbol}:`, err);
    }
  };

  const saveLastSessionData = (symbol: string, points: IntradayBar[]) => {
    try {
      const key = `intraday_${symbol}`;
      const toSave = points.slice(-390);
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (err) {
      console.error('Error saving session data:', err);
    }
  };

  const fetchSessionData = async (symbol: string) => {
    try {
      setLoading(true);
      console.log(`📡 [SESSION] Requesting full session for ${symbol}...`);
      
      const response = await axios.get<IntradaySessionBar[]>(`${API_BASE_URL}/api/intraday/session`, {
        params: { symbol },
        validateStatus: status => status < 500,
      });

      console.log(`📊 [SESSION] Response status: ${response.status}`);
      
      if (response.status !== 200) {
        console.error(`❌ [SESSION] Non-200 response for ${symbol}:`, response.status, response.data);
        setError(`Failed to fetch session data: ${response.status}`);
        return;
      }

      const sessionBars = response.data || [];
      console.log(`📊 [SESSION] Received ${sessionBars.length} bars from backend`);
      
      if (sessionBars.length === 0) {
        console.warn(`⚠️ [SESSION] Backend returned empty session for ${symbol}`);
        setError(`No session data available for ${symbol}. Try another stock.`);
        return;
      }

      console.log(`📊 [SESSION] First bar sample:`, sessionBars[0]);
      console.log(`📊 [SESSION] Last bar sample:`, sessionBars[sessionBars.length - 1]);

      const normalized = normalizeSessionPoints(sessionBars);
      console.log(`✅ [SESSION] Normalized to ${normalized.length} valid candles`);
      
      if (normalized.length > 0) {
        console.log(`📈 [SESSION] Setting session data (${normalized.length} candles)`);
        console.log(`📈 [SESSION] First normalized bar:`, normalized[0]);
        console.log(`📈 [SESSION] Last normalized bar:`, normalized[normalized.length - 1]);
        setDataPoints(normalized);
        setError(null);
      } else {
        console.error(`❌ [SESSION] No valid candles after normalization for ${symbol}`);
        setError(`Failed to normalize session data for ${symbol}`);
      }
    } catch (err: any) {
      console.error(`❌ [SESSION] Error fetching session for ${symbol}:`, err);
      console.error(`❌ [SESSION] Error details:`, {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      if (dataPoints.length === 0) {
        setError(err.response?.data?.detail || err.message || 'Failed to fetch session data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIntraday = async (): Promise<boolean> => {
    if (!stock?.symbol) return false;
    if (Date.now() < rateLimitUntil.current) return false;

    try {
      setLoading(true);
      console.log(`📡 [LIVE] Fetching intraday for ${stock.symbol}...`);
      
      const response = await axios.get<IntradayResponse>(`${API_BASE_URL}/api/intraday`, {
        params: { symbol: stock.symbol },
        validateStatus: status => status < 500,
      });

      console.log(`📊 [LIVE] Response status: ${response.status} for ${stock.symbol}`);

      if (response.status === 429) {
        rateLimitUntil.current = Date.now() + POLL_RATE_OPEN;
        setMarketOpen(false);
        setMarketStatus('rate_limited');
        setRateLimited(true);
        setError('Rate limit reached. Showing last session data.');
        stopPolling();
        return false;
      }

      if (response.status !== 200) {
        console.error(`❌ [LIVE] Non-200 response for ${stock.symbol}:`, response.status, response.data);
        if (dataPoints.length === 0) {
          setError(`Failed to fetch live data: ${response.status}`);
        }
        return false;
      }

      const data = response.data;
      console.log(`📊 [LIVE] Data received:`, {
        market_open: data.market_open,
        price: data.price,
        has_candle: !!data.candle,
        has_ohlc: !!data.ohlc
      });

      setMarketOpen(data.market_open);
      setMarketStatus(data.market_status);
      setRateLimited(Boolean(data.rate_limited));
      rateLimitUntil.current = 0;
      setLastTradeTime(data.last_trade_time);
      setDataAgeMinutes(data.data_age_minutes);

      if (!data.market_open) {
        stopPolling();
        startMarketCheck();
      } else {
        stopMarketCheck();
      }

      // Extract live candle data
      const candle = data.candle || data.ohlc;
      const fallbackCandle = (candle && candle.time) ? null : (data.price != null && data.last_trade_time ? {
        time: data.last_trade_time.replace(' ', 'T'),
        open: data.price,
        high: data.price,
        low: data.price,
        close: data.price,
      } : null);
      const resolvedCandle = fallbackCandle || candle;
      
      if (!resolvedCandle || !resolvedCandle.time) {
        console.warn(`⚠️ [LIVE] No valid candle data for ${stock.symbol} - candle:`, candle, 'data:', data);
        return data.market_open;
      }

      const barTime = toUnixTime(resolvedCandle.time);
      
      if (!barTime) {
        console.warn(`⚠️ [LIVE] No valid timestamp in live candle for ${stock.symbol}, skipping update`);
        return data.market_open;
      }

      const newBar: IntradayBar = {
        time: barTime,
        open: Number(resolvedCandle.open),
        high: Number(resolvedCandle.high),
        low: Number(resolvedCandle.low),
        close: Number(resolvedCandle.close),
      };

      console.log(`📊 [LIVE] New candle for ${stock.symbol} - time: ${newBar.time}, close: ${newBar.close.toFixed(2)}`);

      setDataPoints(prev => {
        // CRITICAL: If market is closed, NEVER modify session data
        if (!data.market_open && prev.length > 0) {
          console.log("🔴 [LIVE] Market closed - preserving session data, not appending");
          return prev;
        }

        // If no session data loaded yet, start with this candle
        if (prev.length === 0) {
          console.warn(`⚠️ [LIVE] No session data for ${stock.symbol} - starting with single live candle`);
          return [newBar];
        }

        // Update existing candle if same timestamp
        const last = prev[prev.length - 1];
        if (last.time === newBar.time) {
          console.log(`🔄 [LIVE] Updating existing candle at ${newBar.time}`);
          return [...prev.slice(0, -1), newBar];
        }

        // Append new candle
        console.log(`➕ [LIVE] Appending new candle - total: ${prev.length + 1}`);
        const updated = [...prev, newBar];
        
        // Keep last 390 candles (full trading day)
        if (updated.length > 390) {
          return updated.slice(updated.length - 390);
        }
        return updated;
      });

      setError(null);
      return data.market_open;
    } catch (err: any) {
      console.error('Error fetching intraday data:', err);
      if (dataPoints.length === 0) {
        setError(err.response?.data?.detail || 'Failed to fetch price data');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(fetchIntraday, POLL_RATE_OPEN);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startMarketCheck = () => {
    stopMarketCheck();
    openCheckRef.current = setInterval(async () => {
      const isOpen = await fetchIntraday();
      if (isOpen) {
        stopMarketCheck();
        startPolling();
      }
    }, MARKET_RECHECK_MS);
  };

  const stopMarketCheck = () => {
    if (openCheckRef.current) {
      clearInterval(openCheckRef.current);
      openCheckRef.current = null;
    }
  };

  // Don't early return - let chart container render so ref attaches
  const stockSymbol = stock?.symbol || 'N/A';
  const hasValidStock = isMounted && stock;

  return (
    <div className="intraday-chart-container">
      <div className="chart-header">
        <h3>Live Intraday Price: {stockSymbol}</h3>
        <div className="header-info">
          {loading && <span className="loading-indicator">Updating...</span>}

          {rateLimited && (
            <span className="market-status rate-limited">Rate Limited</span>
          )}

          {showLive ? (
            <span className="market-status open">
              <span className="pulse-dot"></span> LIVE
            </span>
          ) : (
            <span className="market-status closed">Market Closed</span>
          )}

          {!showLive && lastTradeTime && (
            <span className="last-trade-info">Last trade: {new Date(lastTradeTime).toLocaleString()}</span>
          )}

          {dataPoints.length > 0 && (
            <span className="data-points-count">
              {dataPoints.length} {dataPoints.length === 1 ? 'bar' : 'bars'}
            </span>
          )}

          {!showLive && dataPoints.length > 0 && (
            <span className="session-note">📊 Showing last session</span>
          )}
        </div>
      </div>

      <div className="chart-surface">
        <div
          ref={chartContainerRef}
          style={{ 
            width: '100%', 
            height: '420px',
            position: 'relative',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            backgroundColor: '#0b1220',
            borderRadius: '8px',
          }}
        />
        {error && dataPoints.length === 0 && (
          <div className="chart-error-overlay">⚠️ {error}</div>
        )}
      </div>

      <style jsx>{`
        .intraday-chart-container {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          min-height: 420px;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .header-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #e2e8f0;
          font-weight: 600;
        }
        .loading-indicator {
          font-size: 0.8rem;
          color: #38bdf8;
          animation: pulse 1.5s infinite;
        }
        .market-status {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        }
        .market-status.open {
          color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .market-status.closed {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .market-status.rate-limited {
          color: #f97316;
          background: rgba(249, 115, 22, 0.15);
          border: 1px solid rgba(249, 115, 22, 0.3);
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        .last-trade-info {
          font-size: 0.7rem;
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .session-note {
          font-size: 0.7rem;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .data-points-count {
          font-size: 0.7rem;
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .chart-error {
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-size: 0.9rem;
        }
        .chart-error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ef4444;
          font-size: 0.9rem;
          background: rgba(15, 23, 42, 0.9);
          padding: 16px 24px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .chart-surface {
          width: 100%;
          position: relative;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default IntradayChart;
