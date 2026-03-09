import React, { useState, useRef, useEffect, useMemo } from "react";
import { useStock } from "./StockContext";
import type { Stock } from "../data/stocks";

interface Props {
  className?: string;
}

export default function SectorStockSelector({ className }: Props) {
  const { sector, stock, sectors, stocksForSector, setSector, setStock } =
    useStock();

  // ── Combobox state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState(
    stock ? `${stock.symbol} — ${stock.name}` : ""
  );
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update display text whenever global stock changes
  useEffect(() => {
    setQuery(stock ? `${stock.symbol} — ${stock.name}` : "");
  }, [stock]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeAndReset();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stock]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo<Stock[]>(() => {
    const q = query.trim().toLowerCase();
    // If the query matches exactly the displayed stock label, show full sector list
    const currentLabel = stock
      ? `${stock.symbol} — ${stock.name}`.toLowerCase()
      : "";
    if (!q || q === currentLabel) return stocksForSector;
    return stocksForSector.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [query, stocksForSector, stock]);

  function closeAndReset() {
    setOpen(false);
    setQuery(stock ? `${stock.symbol} — ${stock.name}` : "");
  }

  function handleSelect(s: Stock) {
    setStock(s);
    setQuery(`${s.symbol} — ${s.name}`);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleManualEntry() {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) {
      closeAndReset();
      return;
    }

    // Check if exact match exists in dropdown
    const exactMatch = filtered.find(
      s => s.symbol.toUpperCase() === trimmed || 
      s.name.toLowerCase() === query.trim().toLowerCase()
    );

    if (exactMatch) {
      handleSelect(exactMatch);
    } else if (filtered.length > 0) {
      // Use first filtered result if available
      handleSelect(filtered[0]);
    } else {
      // Create custom stock entry for manual symbol
      const customStock: Stock = {
        symbol: trimmed,
        name: trimmed,
        sector: sector || "Technology",
        instrumentType: "EQUITY"
      };
      setStock(customStock);
      setQuery(`${customStock.symbol} — ${customStock.name}`);
      setOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") closeAndReset();
    if (e.key === "Enter") {
      e.preventDefault();
      handleManualEntry();
    }
  }

  function handleBlur() {
    // Small delay to allow dropdown click to complete
    setTimeout(() => {
      closeAndReset();
    }, 150);
  }

  return (
    <div
      ref={wrapperRef}
      className={`sss-wrapper${className ? ` ${className}` : ""}`}
    >
      {/* ── Sector dropdown ── */}
      <div className="sss-group">
        <label className="sss-label">Sector</label>
        <select
          className="sss-select"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Searchable stock combobox ── */}
      <div className="sss-group sss-combobox-group">
        <label className="sss-label">Stock</label>
        <div className="sss-combobox">
          <span className="sss-search-icon">🔍</span>
          <input
            ref={inputRef}
            className="sss-input"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setQuery(""); // clear to let user type
              setOpen(true);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type or select a stock…"
            autoComplete="off"
            spellCheck={false}
          />
          {open && filtered.length > 0 && (
            <ul ref={listRef} className="sss-dropdown">
              {filtered.map((s) => (
                <li
                  key={s.symbol}
                  className={`sss-option${stock?.symbol === s.symbol ? " sss-option--active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur
                    handleSelect(s);
                  }}
                >
                  <span className="sss-sym">{s.symbol}</span>
                  <span className="sss-name">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
          {open && filtered.length === 0 && query.trim() && (
            <ul className="sss-dropdown">
              <li className="sss-no-results">
                No stocks found for "{query}"
                <div className="sss-hint">Press Enter to use custom symbol</div>
              </li>
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        .sss-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sss-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sss-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        /* ── Sector <select> ── */
        .sss-select {
          height: 44px;
          padding: 0 2.2rem 0 0.9rem;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 0.875rem;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.7rem center;
          transition: border-color 0.2s, box-shadow 0.2s;
          min-width: 160px;
        }

        .sss-select:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .sss-select option {
          background: #0f172a;
          color: #e2e8f0;
        }

        /* ── Combobox ── */
        .sss-combobox-group {
          min-width: 260px;
        }

        .sss-combobox {
          position: relative;
        }

        .sss-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          pointer-events: none;
          z-index: 1;
        }

        .sss-input {
          width: 100%;
          height: 44px;
          padding: 0 0.9rem 0 2.2rem;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 0.875rem;
          font-family: 'JetBrains Mono', monospace, inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .sss-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .sss-input::placeholder {
          color: #475569;
          font-family: inherit;
        }

        /* ── Dropdown list ── */
        .sss-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          max-height: 280px;
          overflow-y: auto;
          background: #0f172a;
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 10px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
          z-index: 999;
          list-style: none;
          margin: 0;
          padding: 4px 0;
        }

        .sss-dropdown::-webkit-scrollbar {
          width: 4px;
        }
        .sss-dropdown::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 2px;
        }

        .sss-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .sss-option:hover,
        .sss-option--active {
          background: rgba(56, 189, 248, 0.1);
        }

        .sss-sym {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 700;
          color: #38bdf8;
          flex-shrink: 0;
          min-width: 90px;
        }

        .sss-name {
          font-size: 0.82rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sss-no-results {
          padding: 10px 14px;
          color: #64748b;
          font-size: 0.85rem;
          text-align: center;
        }

        .sss-hint {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #475569;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
