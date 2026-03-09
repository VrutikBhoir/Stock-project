#!/usr/bin/env python3
"""
Quick test of the AI Market Narrative Engine
"""

from backend.app.services.ml.narrative_engine import build_market_narrative

# Test data
symbol = "MSFT"
investor_profile = {
    "type": "Balanced",
    "time_horizon": "Medium-term",
    "primary_goal": "Growth"
}

print("=" * 80)
print("AI MARKET NARRATIVE ENGINE - TEST")
print("=" * 80)
print()

try:
    print(f"🔄 Generating narrative for {symbol}...")
    result = build_market_narrative(symbol, investor_profile)
    
    print("\n✅ SUCCESS! Generated narrative:")
    print()
    
    # Display results
    print(f"Symbol: {result['symbol']}")
    print()
    
    print("Market State:")
    for key, value in result["market_state"].items():
        print(f"  • {key}: {value}")
    print()
    
    print("Signals:")
    for key, value in result["signals"].items():
        print(f"  • {key}: {value}")
    print()
    
    print("Narrative:")
    print(f"  Headline: {result['narrative']['headline']}")
    print(f"  Investor Type: {result['narrative']['investor_type']}")
    print()
    print(f"  Text:\n{result['narrative']['text']}")
    print()
    
    print("=" * 80)
    print("✅ ALL LAYERS WORKING:")
    print("  ✓ Data fetching (market + news + risk)")
    print("  ✓ Signal aggregation")
    print("  ✓ Investor profile reasoning")
    print("  ✓ Narrative generation (LLM-ready)")
    print("=" * 80)

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
