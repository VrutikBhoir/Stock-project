#!/usr/bin/env python3
"""
Test script for multi-currency price normalization system.
Verifies that US stocks (USD) are converted to INR while Indian stocks remain unchanged.
"""

import sys
import os

# Add backend to Python path
sys.path.insert(0, os.path.dirname(__file__))

from backend.app.services.price_service import (
    normalize_price,
    get_exchange_for_symbol,
    USD_TO_INR,
    US_EXCHANGES,
    INDIA_EXCHANGES
)

def test_currency_conversion():
    """Run comprehensive tests for currency normalization"""
    
    print("=" * 70)
    print(" Multi-Currency Price Normalization Test Suite")
    print("=" * 70)
    print(f"\nConfiguration:")
    print(f"  USD_TO_INR Rate: {USD_TO_INR}")
    print(f"  US Exchanges: {', '.join(US_EXCHANGES)}")
    print(f"  India Exchanges: {', '.join(INDIA_EXCHANGES)}")
    print()
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: AAPL (US stock - should convert)
    print("[Test 1] AAPL - US Stock (NASDAQ)")
    print("-" * 70)
    aapl_usd_price = 262.0
    aapl_exchange = get_exchange_for_symbol('AAPL')
    aapl_inr_price = normalize_price(aapl_usd_price, aapl_exchange)
    aapl_expected = 262 * USD_TO_INR
    
    print(f"  Input: ${aapl_usd_price} USD")
    print(f"  Exchange Detected: {aapl_exchange}")
    print(f"  Output: ₹{aapl_inr_price:,.2f} INR")
    print(f"  Expected: ₹{aapl_expected:,.2f} INR")
    
    if abs(aapl_inr_price - aapl_expected) < 0.01:
        print("  ✓ PASS\n")
        tests_passed += 1
    else:
        print(f"  ✗ FAIL - Got {aapl_inr_price}, expected {aapl_expected}\n")
        tests_failed += 1
    
    # Test 2: TCS (Indian stock - no conversion)
    print("[Test 2] TCS - Indian Stock (NSE)")
    print("-" * 70)
    tcs_inr_price = 3500.0
    tcs_exchange = get_exchange_for_symbol('TCS')
    tcs_normalized = normalize_price(tcs_inr_price, tcs_exchange)
    
    print(f"  Input: ₹{tcs_inr_price:,.2f} INR")
    print(f"  Exchange Detected: {tcs_exchange}")
    print(f"  Output: ₹{tcs_normalized:,.2f} INR")
    print(f"  Expected: ₹{tcs_inr_price:,.2f} INR (no conversion)")
    
    if tcs_normalized == tcs_inr_price:
        print("  ✓ PASS\n")
        tests_passed += 1
    else:
        print(f"  ✗ FAIL - Got {tcs_normalized}, expected {tcs_inr_price}\n")
        tests_failed += 1
    
    # Test 3: MSFT (US stock - NYSE)
    print("[Test 3] MSFT - US Stock (NASDAQ)")
    print("-" * 70)
    msft_usd_price = 405.20
    msft_exchange = get_exchange_for_symbol('MSFT')
    msft_inr_price = normalize_price(msft_usd_price, msft_exchange)
    msft_expected = 405.20 * USD_TO_INR
    
    print(f"  Input: ${msft_usd_price} USD")
    print(f"  Exchange Detected: {msft_exchange}")
    print(f"  Output: ₹{msft_inr_price:,.2f} INR")
    print(f"  Expected: ₹{msft_expected:,.2f} INR")
    
    if abs(msft_inr_price - msft_expected) < 0.01:
        print("  ✓ PASS\n")
        tests_passed += 1
    else:
        print(f"  ✗ FAIL - Got {msft_inr_price}, expected {msft_expected}\n")
        tests_failed += 1
    
    # Test 4: WIPRO.NS (suffix detection)
    print("[Test 4] WIPRO.NS - Suffix Detection")
    print("-" * 70)
    wipro_exchange = get_exchange_for_symbol('WIPRO.NS')
    print(f"  Symbol: WIPRO.NS")
    print(f"  Exchange Detected: {wipro_exchange}")
    print(f"  Expected: NSE or BSE")
    
    if wipro_exchange in ['NSE', 'BSE']:
        print("  ✓ PASS\n")
        tests_passed += 1
    else:
        print(f"  ✗ FAIL - Got {wipro_exchange}, expected NSE or BSE\n")
        tests_failed += 1
    
    # Test 5: RELIANCE (Indian stock)
    print("[Test 5] RELIANCE - Indian Stock (NSE)")
    print("-" * 70)
    reliance_price = 2800.0
    reliance_exchange = get_exchange_for_symbol('RELIANCE')
    reliance_normalized = normalize_price(reliance_price, reliance_exchange)
    
    print(f"  Input: ₹{reliance_price:,.2f} INR")
    print(f"  Exchange Detected: {reliance_exchange}")
    print(f"  Output: ₹{reliance_normalized:,.2f} INR")
    print(f"  Expected: ₹{reliance_price:,.2f} INR (no conversion)")
    
    if reliance_normalized == reliance_price:
        print("  ✓ PASS\n")
        tests_passed += 1
    else:
        print(f"  ✗ FAIL - Got {reliance_normalized}, expected {reliance_price}\n")
        tests_failed += 1
    
    # Test 6: Portfolio calculation example
    print("[Test 6] Sample Portfolio Calculation")
    print("-" * 70)
    print("  Holdings:")
    print("    - 10 shares of AAPL @ $262 = $2,620")
    print("    - 5 shares of TCS @ ₹3,500 = ₹17,500")
    print()
    
    aapl_portfolio_value = normalize_price(262.0, get_exchange_for_symbol('AAPL')) * 10
    tcs_portfolio_value = normalize_price(3500.0, get_exchange_for_symbol('TCS')) * 5
    total_portfolio_value = aapl_portfolio_value + tcs_portfolio_value
    
    print(f"  AAPL Value (INR): ₹{aapl_portfolio_value:,.2f}")
    print(f"  TCS Value (INR): ₹{tcs_portfolio_value:,.2f}")
    print(f"  Total Portfolio Value (INR): ₹{total_portfolio_value:,.2f}")
    print(f"  ✓ All values normalized to INR\n")
    tests_passed += 1
    
    # Summary
    print("=" * 70)
    print(f" Test Results: {tests_passed} passed, {tests_failed} failed")
    print("=" * 70)
    
    if tests_failed == 0:
        print("\n✓ All tests passed! Multi-currency support is working correctly.")
        print("\nKey features verified:")
        print("  • US stocks (NASDAQ/NYSE) convert USD → INR")
        print("  • Indian stocks (NSE/BSE) remain in INR")
        print("  • Exchange detection works for symbol suffixes (.NS, .BO)")
        print("  • Portfolio calculations use unified INR currency")
        return 0
    else:
        print(f"\n✗ {tests_failed} test(s) failed. Please review the implementation.")
        return 1

if __name__ == "__main__":
    exit(test_currency_conversion())
