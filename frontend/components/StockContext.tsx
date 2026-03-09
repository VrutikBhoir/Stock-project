import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { Stock, STOCKS } from "../data/stocks";

type StockContextType = {
  sector: string;
  stock: Stock | null;
  sectors: string[];
  stocksForSector: Stock[];
  setSector: (sector: string) => void;
  setStock: (stock: Stock | null) => void;
};

const StockContext = createContext<StockContextType | null>(null);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sectors = useMemo(
    () => Array.from(new Set(STOCKS.map((s) => s.sector))),
    []
  );

  const [sector, setSectorState] = useState<string>(sectors[0] ?? "Technology");

  const stocksForSector = useMemo(
    () => STOCKS.filter((s) => s.sector === sector),
    [sector]
  );

  // Default stock = first in the initial sector
  const [stock, setStock] = useState<Stock | null>(
    () => STOCKS.find((s) => s.sector === (sectors[0] ?? "Technology")) ?? null
  );

  // When sector changes, auto-select first stock in new sector
  const setSector = useCallback((newSector: string) => {
    setSectorState(newSector);
    const first = STOCKS.find((s) => s.sector === newSector) ?? null;
    setStock(first);
  }, []);

  return (
    <StockContext.Provider
      value={{ sector, stock, sectors, stocksForSector, setSector, setStock }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside StockProvider");
  return ctx;
};