#!/usr/bin/env python
"""
Integration test for ML-Driven Narrative Engine.

This test validates the complete end-to-end flow:
1. Feature extraction from real prediction data
2. ML model inference (sentiment + conviction)
3. Narrative formatting + investor customization
4. API response generation

Run with:
    python backend/test_integration.py
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def test_feature_extraction():
    """Test 1: Feature extraction from prediction data."""
    logger.info("\n" + "="*70)
    logger.info("TEST 1: Feature Extraction")
    logger.info("="*70)
    
    from app.services.ml.narrative_engine import NarrativeEngine
    
    engine = NarrativeEngine()
    
    # Mock prediction data
    mock_prediction = {
        "confidence_score": 75.5,
        "volatility": 0.18,
        "trend": {"direction": "up", "percentage_change": 2.45},
        "live_price": 150.0,
    }
    
    mock_analysis = {
        "overall_score": 72.0,
        "scores": {
            "technical": 70.0,
            "momentum": 68.0,
        },
        "expected_performance": {"medium_term_return": 3.25},
    }
    
    try:
        features = engine._extract_features(mock_prediction, mock_analysis)
        logger.info(f"✅ Features extracted successfully")
        logger.info(f"   Shape: {features.shape}")
        logger.info(f"   Values: {features}")
        return True
    except Exception as e:
        logger.error(f"❌ Feature extraction failed: {str(e)}")
        return False


def test_ml_prediction():
    """Test 2: ML model inference."""
    logger.info("\n" + "="*70)
    logger.info("TEST 2: ML Model Inference")
    logger.info("="*70)
    
    from app.services.ml.narrative_engine import NarrativeEngine
    import numpy as np
    
    engine = NarrativeEngine()
    
    if engine.model_package is None:
        logger.warning("⚠️ Models not loaded. Skipping ML test.")
        return False
    
    # Test feature vector
    features = np.array([[75.0, 1.0, 72.0, 70.0, 68.0, 3.25, 0.18]])
    
    try:
        sentiment, conviction, confidence = engine._predict_with_ml(features)
        logger.info(f"✅ ML Prediction successful")
        logger.info(f"   Sentiment: {sentiment}")
        logger.info(f"   Conviction: {conviction}")
        logger.info(f"   Confidence: {confidence:.1f}%")
        
        # Validate outputs
        assert sentiment in ["Bullish", "Neutral", "Bearish"], f"Invalid sentiment: {sentiment}"
        assert conviction in ["High", "Medium", "Low"], f"Invalid conviction: {conviction}"
        assert 0 <= confidence <= 100, f"Confidence out of range: {confidence}"
        
        logger.info(f"✅ All validations passed")
        return True
    except Exception as e:
        logger.error(f"❌ ML prediction failed: {str(e)}")
        return False


def test_narrative_generation():
    """Test 3: Complete narrative generation."""
    logger.info("\n" + "="*70)
    logger.info("TEST 3: Narrative Generation (BRK.A, Conservative, Long-term)")
    logger.info("="*70)
    
    try:
        from app.services.ml.narrative_engine import get_narrative_engine
        from app.services.ml.price_predictor import get_prediction_with_analysis
        
        # Test stock with distinctive profile
        symbol = "BRK.A"
        investor_type = "Conservative"
        horizon = "long_term"
        
        logger.info(f"Fetching prediction data for {symbol}...")
        analysis_result = get_prediction_with_analysis(symbol, horizon)
        
        if not analysis_result.get("prediction"):
            logger.warning(f"⚠️ Could not fetch data for {symbol}")
            return False
        
        logger.info(f"Generating narrative for {symbol}...")
        engine = get_narrative_engine()
        narrative = engine.generate_from_prediction(
            symbol=symbol,
            prediction_data=analysis_result["prediction"],
            analysis_data=analysis_result["investment_analysis"],
            investor_type=investor_type,
            time_horizon=horizon,
            investment_goal="Capital Protection"
        )
        
        # Validate response structure
        required_keys = ["symbol", "model_used", "narrative", "market_data", "investor_context"]
        missing_keys = [k for k in required_keys if k not in narrative]
        
        if missing_keys:
            logger.error(f"❌ Missing keys: {missing_keys}")
            return False
        
        # Extract and display key values
        sentiment = narrative.get("narrative", {}).get("sentiment")
        confidence = narrative.get("narrative", {}).get("confidence")
        conviction = narrative.get("narrative", {}).get("conviction")
        recommendation = narrative.get("investor_context", {}).get("recommendation")
        
        logger.info(f"✅ Narrative generated successfully")
        logger.info(f"   Sentiment: {sentiment}")
        logger.info(f"   Confidence: {confidence:.1f}%")
        logger.info(f"   Conviction: {conviction}")
        logger.info(f"   Recommendation: {recommendation}")
        logger.info(f"   Model Used: {narrative.get('model_used')}")
        logger.info(f"   Generated By: {narrative.get('explainability', {}).get('generated_by')}")
        
        # Pretty print action guidance
        action = narrative.get("investor_context", {}).get("action_guidance", "")
        logger.info(f"\n   Action Guidance:")
        for line in action.split(". "):
            if line.strip():
                logger.info(f"   {line.strip()}")
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Narrative generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_confidence_varies():
    """Test 4: Verify confidence varies across different stocks."""
    logger.info("\n" + "="*70)
    logger.info("TEST 4: Confidence Variation Across Stocks")
    logger.info("="*70)
    
    test_cases = [
        ("AAPL", "Balanced", "medium_term"),
        ("NVDA", "Aggressive", "short_term"),
        ("JNJ", "Conservative", "long_term"),
    ]
    
    try:
        from app.services.ml.narrative_engine import get_narrative_engine
        from app.services.ml.price_predictor import get_prediction_with_analysis
        
        confidences = []
        sentiments = []
        
        engine = get_narrative_engine()
        
        for symbol, investor_type, horizon in test_cases:
            logger.info(f"\nTesting {symbol}...")
            try:
                analysis_result = get_prediction_with_analysis(symbol, horizon)
                
                if not analysis_result.get("prediction"):
                    logger.warning(f"  ⚠️ Could not fetch data")
                    continue
                
                narrative = engine.generate_from_prediction(
                    symbol=symbol,
                    prediction_data=analysis_result["prediction"],
                    analysis_data=analysis_result["investment_analysis"],
                    investor_type=investor_type,
                    time_horizon=horizon
                )
                
                conf = narrative.get("narrative", {}).get("confidence")
                sent = narrative.get("narrative", {}).get("sentiment")
                
                confidences.append(conf)
                sentiments.append(sent)
                
                logger.info(f"  ✅ {symbol}: {sent} ({conf:.1f}% conf)")
            
            except Exception as e:
                logger.warning(f"  ⚠️ {symbol}: {str(e)}")
        
        # Validate variation
        if len(confidences) < 2:
            logger.warning("⚠️ Not enough valid results to test variation")
            return False
        
        min_conf = min(confidences)
        max_conf = max(confidences)
        range_conf = max_conf - min_conf
        
        logger.info(f"\n✅ Confidence Range: {min_conf:.1f}% - {max_conf:.1f}% (variation: {range_conf:.1f}%)")
        
        if range_conf < 5:
            logger.warning(f"⚠️ Confidence range very small—models may not be differentiating")
            return False
        
        logger.info(f"✅ Sentiments: {set(sentiments)}")
        
        if len(set(sentiments)) > 1:
            logger.info(f"✅ Multiple sentiments detected (not all same)")
        else:
            logger.warning(f"⚠️ All sentiments are '{sentiments[0]}'—suspicious")
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Variation test failed: {str(e)}")
        return False


def main():
    """Run all integration tests."""
    logger.info("\n\n")
    logger.info("🚀 ML-Driven Narrative Engine - Integration Test Suite")
    logger.info("=" * 70)
    
    results = {
        "Feature Extraction": test_feature_extraction(),
        "ML Inference": test_ml_prediction(),
        "Narrative Generation": test_narrative_generation(),
        "Confidence Variation": test_confidence_varies(),
    }
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("📊 Test Summary")
    logger.info("=" * 70)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{status}: {test_name}")
    
    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    logger.info("\n" + "=" * 70)
    if passed_count == total_count:
        logger.info(f"🎉 ALL TESTS PASSED ({passed_count}/{total_count})")
        logger.info("   Narrative engine is ML-driven and production-ready!")
    else:
        logger.info(f"⚠️ SOME TESTS FAILED ({passed_count}/{total_count})")
        logger.info("   Check logs above for details")
    logger.info("=" * 70 + "\n")
    
    return 0 if passed_count == total_count else 1


if __name__ == "__main__":
    sys.exit(main())
