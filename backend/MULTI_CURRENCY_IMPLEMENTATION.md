# Multi-Currency Price Normalization System

## Overview
This document describes the multi-currency price normalization system implemented in the backend to support both US (USD) and Indian (INR) stocks in a unified portfolio.

## Implementation Summary

### Key Changes

#### 1. **Price Service** (`backend/app/services/price_service.py`)
Enhanced with currency conversion capabilities:

- **Constants**:
  - `USD_TO_INR = 83.0` - Current conversion rate
  - `US_EXCHANGES = {"NASDAQ", "NYSE", "US"}` - US exchanges (USD)
  - `INDIA_EXCHANGES = {"NSE", "BSE", "INDIA"}` - Indian exchanges (INR)

- **Functions**:
  - `get_exchange_for_symbol(symbol)` - Determines exchange from stocks.json or symbol suffix
  - `normalize_price_to_inr(symbol, price, exchange)` - Converts USD prices to INR
  - `get_stock_price(symbol)` - Modified to return INR-normalized prices

#### 2. **Stock Exchange Mapping** (`shared/stocks.json`)
Comprehensive mapping of 114+ stocks with their exchanges:
- US stocks: AAPL, MSFT, NVDA, TSLA, AMZN, etc.
- Indian stocks: TCS, INFY, RELIANCE, HDFCBANK, etc.

Format:
```json
{
  "AAPL": { "exchange": "US", "name": "Apple Inc." },
  "TCS": { "exchange": "INDIA", "name": "Tata Consultancy Services" }
}
```

#### 3. **Automatic Integration**
No changes needed to:
- `portfolio_engine.py` - Already uses `get_stock_price()`
- `portfolio.py` API endpoints - Already uses price service
- `portfolio_risk_engine.py` - Already uses price service
- `stop_loss_monitor.py` - Already uses price service

All portfolio calculations automatically work in INR.

## How It Works

### Exchange Detection Priority

1. **Stocks.json lookup**: Check `shared/stocks.json` for explicit mapping
2. **Suffix detection**: `.NS` = NSE, `.BO` = BSE (Indian exchanges)
3. **Default**: Assume US exchange if no match

### Price Normalization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API/Service calls get_stock_price("AAPL")               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch raw price from Alpha Vantage / yfinance           │
│    AAPL: $262.00 USD                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Determine exchange: get_exchange_for_symbol("AAPL")     │
│    Result: "US" (from stocks.json)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Normalize to INR: normalize_price_to_inr()              │
│    Input: $262.00, Exchange: US                             │
│    Conversion: 262 × 83 = ₹21,746                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Return normalized price: ₹21,746                         │
│    All calculations downstream use INR                      │
└─────────────────────────────────────────────────────────────┘
```

### Example: Portfolio Calculation

**Holdings**:
- 10 shares of AAPL @ $262 (NASDAQ)
- 5 shares of TCS @ ₹3,500 (NSE)

**Normalized Values**:
- AAPL: $262 × 83 = ₹21,746 per share
  - Total: ₹21,746 × 10 = **₹217,460**
- TCS: ₹3,500 (no conversion needed)
  - Total: ₹3,500 × 5 = **₹17,500**

**Portfolio Value**: ₹217,460 + ₹17,500 = **₹234,960 INR**

## Testing

Run the test suite:
```bash
python backend/test_currency_conversion.py
```

Tests verify:
- ✓ US stocks convert USD → INR
- ✓ Indian stocks remain in INR
- ✓ Exchange detection works
- ✓ Portfolio calculations use unified INR

## Key Benefits

1. **Unified Currency**: All portfolio values, P&L, and calculations in INR
2. **Automatic Conversion**: No manual intervention needed
3. **Exchange Detection**: Smart detection based on stocks.json and symbol suffixes
4. **Maintainable**: Single source of truth for currency conversion
5. **Scalable**: Easy to update USD_TO_INR rate as needed

## Configuration

### Updating USD to INR Rate

Edit `backend/app/services/price_service.py`:
```python
USD_TO_INR = 83.0  # Update this value
```

### Adding New Stocks

Edit `shared/stocks.json`:
```json
{
  "NEWSYMBOL": {
    "exchange": "US",  // or "INDIA"
    "name": "New Company Name"
  }
}
```

## Important Notes

1. **NSE stocks** already trade in INR - no conversion applied
2. **NASDAQ/NYSE stocks** trade in USD - converted to INR
3. **Symbol suffixes** (.NS, .BO) override stocks.json mapping
4. **Default behavior**: Unknown symbols assume US exchange
5. **Rate updates**: Update USD_TO_INR periodically for accuracy

## Future Enhancements

Consider:
- Fetch live USD/INR rate from currency API
- Support additional currencies (EUR, GBP, etc.)
- Currency conversion history for P&L accuracy
- User preference for display currency

---

**Status**: ✓ Implemented and tested
**Date**: 2026-03-05
**Test Results**: All 6 tests passed
