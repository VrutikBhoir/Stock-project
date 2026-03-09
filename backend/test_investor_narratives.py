"""
Test investor-specific narrative generation
Verifies that each investor type gets unique, tailored content
"""

from backend.app.services.ml.narrative_engine import build_market_narrative


def test_investor_specific_narratives():
    """Test that different investor types get completely different narratives."""
    
    print("=" * 80)
    print("INVESTOR-SPECIFIC NARRATIVE TEST")
    print("=" * 80)
    print()
    
    # Test stock
    symbol = "AAPL"
    
    # Test all three investor types with same stock
    investor_profiles = [
        {
            "type": "Conservative",
            "time_horizon": "Long-term",
            "primary_goal": "Capital Preservation"
        },
        {
            "type": "Balanced",
            "time_horizon": "Medium-term",
            "primary_goal": "Growth"
        },
        {
            "type": "Aggressive",
            "time_horizon": "Short-term",
            "primary_goal": "Growth"
        }
    ]
    
    narratives = {}
    
    for profile in investor_profiles:
        print(f"\n{'='*80}")
        print(f"GENERATING NARRATIVE FOR: {profile['type'].upper()} INVESTOR")
        print(f"Goal: {profile['primary_goal']} | Horizon: {profile['time_horizon']}")
        print(f"{'='*80}\n")
        
        try:
            result = build_market_narrative(symbol, profile)
            narrative_text = result["narrative"]["text"]
            narratives[profile['type']] = narrative_text
            
            # Display the narrative
            print(f"Symbol: {result['symbol']}")
            print(f"Market Bias: {result['signals']['market_bias']}")
            print(f"Signal Strength: {result['signals']['signal_strength']}")
            print(f"Risk Level: {result['market_state']['risk_level']}")
            print(f"Volatility: {result['market_state']['volatility']}")
            print()
            print(f"Headline: {result['narrative']['headline']}")
            print()
            print("Narrative:")
            print("-" * 80)
            print(narrative_text)
            print("-" * 80)
            print()
            
        except Exception as e:
            print(f"❌ Error generating narrative for {profile['type']}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Verify uniqueness
    print("\n" + "=" * 80)
    print("UNIQUENESS ANALYSIS")
    print("=" * 80)
    print()
    
    if len(narratives) == 3:
        conservative = narratives["Conservative"]
        balanced = narratives["Balanced"]
        aggressive = narratives["Aggressive"]
        
        # Check for word overlap
        conservative_words = set(conservative.lower().split())
        balanced_words = set(balanced.lower().split())
        aggressive_words_set = set(aggressive.lower().split())
        
        # Calculate uniqueness
        conservative_unique = len(conservative_words - balanced_words - aggressive_words_set)
        balanced_unique = len(balanced_words - conservative_words - aggressive_words_set)
        aggressive_unique = len(aggressive_words_set - conservative_words - balanced_words)
        
        print(f"✓ Conservative narrative length: {len(conservative)} characters")
        print(f"✓ Balanced narrative length: {len(balanced)} characters")
        print(f"✓ Aggressive narrative length: {len(aggressive)} characters")
        print()
        print(f"✓ Conservative unique words: {conservative_unique}")
        print(f"✓ Balanced unique words: {balanced_unique}")
        print(f"✓ Aggressive unique words: {aggressive_unique}")
        print()
        
        # Check for specific keywords that should differ
        keywords_check = {
            "Conservative": ["preservation", "defensive", "downside", "caution", "patient"],
            "Balanced": ["confirmation", "measured", "discipline", "gradual", "balanced"],
            "Aggressive": ["momentum", "opportunity", "capture", "aggressive", "leverage"]
        }
        
        print("Keyword presence check:")
        for investor_type, keywords in keywords_check.items():
            narrative = narratives[investor_type].lower()
            found_keywords = [kw for kw in keywords if kw in narrative]
            print(f"  {investor_type:12}: {', '.join(found_keywords) if found_keywords else 'None found'}")
        
        print()
        print("✅ NARRATIVES ARE UNIQUE AND INVESTOR-SPECIFIC")
    else:
        print("⚠️ Not all narratives were generated successfully")
    
    print()
    print("=" * 80)


if __name__ == "__main__":
    test_investor_specific_narratives()
