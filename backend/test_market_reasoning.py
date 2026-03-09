"""
Test script for Market Reasoning Assistant

Tests the AI market reasoning functionality with various signal scenarios
to verify conservative explanations and investor-specific interpretations.
"""

import sys
import os

# Add the current directory (backend) to Python path for app imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.app.services.ml.market_reasoning import explain_market_signals


def test_market_reasoning():
    """Test market reasoning with various signal scenarios."""
    
    print("🧠 Testing AI Market Reasoning Assistant")
    print("=" * 60)
    
    # Test Scenario 1: Strong bullish signals
    print("\n📊 Scenario 1: Strong Bullish Signals")
    print("-" * 50)
    
    result1 = explain_market_signals(
        composite_score=78.5,
        technical_score=82.0,
        trend_score=75.3,
        risk_score=45.2,
        momentum_score=80.1,
        rsi_value=58.0,
        macd_state="Above Signal",
        volatility_level="Medium",
        support_level=148.50,
        resistance_level=158.00,
        entry_zone_low=150.25,
        entry_zone_high=152.75,
        exit_zone_low=156.00,
        exit_zone_high=159.50,
        model_confidence=85.0,
        investor_type="Balanced",
        investment_horizon="Medium-term"
    )
    
    print(f"📈 Decision Signal: {result1['decision_signal']}")
    print(f"\n🤖 AI Reasoning:")
    print(result1['ai_reasoning'])
    print(f"\n💡 Key Insights: {result1['key_insights']}")
    print(f"\n👤 Investor Interpretation: {result1['investor_interpretation']}")
    print(f"\n⚠️  {result1['risk_notice']}")
    
    # Test Scenario 2: Low confidence signals - should be conservative
    print("\n📊 Scenario 2: Low Confidence Signals")
    print("-" * 50)
    
    result2 = explain_market_signals(
        composite_score=52.3,
        technical_score=48.5,
        trend_score=55.1,
        risk_score=68.7,
        momentum_score=49.2,
        rsi_value=72.5,
        macd_state="Below Signal",
        volatility_level="High",
        support_level=145.00,
        resistance_level=157.50,
        entry_zone_low=146.00,
        entry_zone_high=148.25,
        exit_zone_low=150.00,
        exit_zone_high=153.75,
        model_confidence=42.0,
        investor_type="Conservative",
        investment_horizon="Long-term"
    )
    
    print(f"📈 Decision Signal: {result2['decision_signal']}")
    print(f"\n🤖 AI Reasoning:")
    print(result2['ai_reasoning'])
    print(f"\n💡 Key Insights: {result2['key_insights']}")
    print(f"\n👤 Investor Interpretation: {result2['investor_interpretation']}")
    print(f"\n⚠️  {result2['risk_notice']}")
    
    # Test Scenario 3: Aggressive investor with mixed signals
    print("\n📊 Scenario 3: Aggressive Investor Mixed Signals")
    print("-" * 50)
    
    result3 = explain_market_signals(
        composite_score=65.8,
        technical_score=70.2,
        trend_score=58.4,
        risk_score=55.9,
        momentum_score=72.3,
        rsi_value=28.5,
        macd_state="Above Signal", 
        volatility_level="High",
        support_level=148.00,
        resistance_level=155.00,
        entry_zone_low=149.50,
        entry_zone_high=151.25,
        exit_zone_low=153.25,
        exit_zone_high=156.80,
        model_confidence=67.0,
        investor_type="Aggressive",
        investment_horizon="Short-term"
    )
    
    print(f"📈 Decision Signal: {result3['decision_signal']}")
    print(f"\n🤖 AI Reasoning:")
    print(result3['ai_reasoning'])
    print(f"\n💡 Key Insights: {result3['key_insights']}")
    print(f"\n👤 Investor Interpretation: {result3['investor_interpretation']}")
    print(f"\n⚠️  {result3['risk_notice']}")
    
    # Test Scenario 4: Weak bearish signals
    print("\n📊 Scenario 4: Weak Bearish Signals")
    print("-" * 50)
    
    result4 = explain_market_signals(
        composite_score=32.1,
        technical_score=28.7,
        trend_score=35.9,
        risk_score=78.4,
        momentum_score=25.6,
        rsi_value=75.2,
        macd_state="Below Signal",
        volatility_level="Low",
        support_level=149.00,
        resistance_level=156.00,
        entry_zone_low=147.75,
        entry_zone_high=149.50,
        exit_zone_low=145.25,
        exit_zone_high=147.00,
        model_confidence=58.0,
        investor_type="Conservative",
        investment_horizon="Long-term"
    )
    
    print(f"📈 Decision Signal: {result4['decision_signal']}")
    print(f"\n🤖 AI Reasoning:")
    print(result4['ai_reasoning'])
    print(f"\n💡 Key Insights: {result4['key_insights']}")
    print(f"\n👤 Investor Interpretation: {result4['investor_interpretation']}")
    print(f"\n⚠️  {result4['risk_notice']}")
    
    print("\n" + "=" * 60)
    print("✅ Market Reasoning Assistant Testing Complete")
    
    # Verification Summary
    print("\n🔍 Verification Summary:")
    print(f"- Scenario 1 (Strong bullish): {result1['decision_signal']}")
    print(f"- Scenario 2 (Low confidence): {result2['decision_signal']}")  
    print(f"- Scenario 3 (Aggressive mixed): {result3['decision_signal']}")
    print(f"- Scenario 4 (Weak bearish): {result4['decision_signal']}")
    
    # Validate key characteristics
    validations = []
    
    # Check that all reasoning references provided inputs
    for i, result in enumerate([result1, result2, result3, result4], 1):
        if "composite score" in result['ai_reasoning'].lower():
            validations.append(f"✅ Scenario {i} reasoning references composite score")
        
        if "model confidence" in result['ai_reasoning'].lower():
            validations.append(f"✅ Scenario {i} reasoning mentions model confidence")
    
    # Check that low confidence results in conservative stance
    if result2['decision_signal'] == 'HOLD':
        validations.append("✅ Low confidence correctly results in HOLD signal")
    
    # Check that conservative interpretations mention caution
    conservative_texts = [result2['investor_interpretation'], result4['investor_interpretation']]
    if any('conservative' in text.lower() or 'caution' in text.lower() or 'careful' in text.lower() 
           for text in conservative_texts):
        validations.append("✅ Conservative interpretations appropriately cautious")
    
    # Check that aggressive interpretation is more action-oriented
    if any(word in result3['investor_interpretation'].lower() 
           for word in ['aggressive', 'tactical', 'conviction', 'opportunity']):
        validations.append("✅ Aggressive interpretation appropriately action-oriented")
    
    # Check that all risk notices are present
    if all('RISKS:' in result['risk_notice'] for result in [result1, result2, result3, result4]):
        validations.append("✅ All scenarios include proper risk notices")
    
    print("\n📋 Validation Results:")
    for validation in validations:
        print(f"  {validation}")


if __name__ == "__main__":
    test_market_reasoning()