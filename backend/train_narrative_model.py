#!/usr/bin/env python
"""
Train the Narrative Engine ML Model

This script trains a RandomForest classifier to predict market sentiment
(Bullish, Neutral, Bearish) and conviction (High, Medium, Low) based on
real prediction features.

Usage:
    python train_narrative_model.py

Output:
    - app/services/ml/models/narrative_engine_final.pkl
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent / "app" / "services" / "ml" / "models"
MODEL_PATH = MODEL_DIR / "narrative_engine_final.pkl"


def generate_training_data():
    """
    Generate synthetic training data with realistic distributions.
    
    Features:
        - confidence: 0-100 (model confidence)
        - trend_score: -1 to 1 (down=-1, neutral=0, up=1)
        - overall_score: 0-100 (investment analysis score)
        - technical_score: 0-100 (technical indicator strength)
        - momentum_score: 0-100 (momentum indicator)
        -expected_return: -10 to +10 (%)
        - volatility: 0-0.5 (annualized)
    
    Targets:
        - sentiment: Bullish (2), Neutral (1), Bearish (0)
        - conviction: High (2), Medium (1), Low (0)
    """
    np.random.seed(42)
    n_samples = 1500
    
    # Initialize arrays
    X = []
    sentiments = []
    convictions = []
    
    # Generate bullish scenarios (70% of high-conviction cases)
    bullish_samples = int(n_samples * 0.35)
    for _ in range(bullish_samples):
        confidence = np.random.normal(75, 15)
        confidence = np.clip(confidence, 0, 100)
        
        trend_score = np.random.normal(0.7, 0.2)
        overall_score = np.random.normal(72, 15)
        technical_score = np.random.normal(70, 18)
        momentum_score = np.random.normal(68, 20)
        expected_return = np.random.normal(4.5, 2)
        volatility = np.random.normal(0.15, 0.08)
        
        X.append([confidence, trend_score, overall_score, technical_score, momentum_score, expected_return, volatility])
        sentiments.append(2)  # Bullish
        # High conviction if confidence > 75 and scores aligned
        if confidence > 75 and overall_score > 65:
            convictions.append(2)  # High
        elif confidence > 55:
            convictions.append(1)  # Medium
        else:
            convictions.append(0)  # Low
    
    # Generate bearish scenarios
    bearish_samples = int(n_samples * 0.3)
    for _ in range(bearish_samples):
        confidence = np.random.normal(70, 15)
        confidence = np.clip(confidence, 0, 100)
        
        trend_score = np.random.normal(-0.6, 0.25)
        overall_score = np.random.normal(35, 15)
        technical_score = np.random.normal(32, 20)
        momentum_score = np.random.normal(30, 22)
        expected_return = np.random.normal(-3.5, 2)
        volatility = np.random.normal(0.22, 0.1)
        
        X.append([confidence, trend_score, overall_score, technical_score, momentum_score, expected_return, volatility])
        sentiments.append(0)  # Bearish
        if confidence > 75 and overall_score < 40:
            convictions.append(2)  # High
        elif confidence > 55:
            convictions.append(1)  # Medium
        else:
            convictions.append(0)  # Low
    
    # Generate neutral scenarios
    neutral_samples = n_samples - bullish_samples - bearish_samples
    for _ in range(neutral_samples):
        confidence = np.random.normal(50, 20)
        confidence = np.clip(confidence, 0, 100)
        
        trend_score = np.random.normal(0, 0.35)
        overall_score = np.random.normal(50, 20)
        technical_score = np.random.normal(50, 25)
        momentum_score = np.random.normal(50, 25)
        expected_return = np.random.normal(0.5, 2.5)
        volatility = np.random.normal(0.18, 0.12)
        
        X.append([confidence, trend_score, overall_score, technical_score, momentum_score, expected_return, volatility])
        sentiments.append(1)  # Neutral
        if confidence > 70:
            convictions.append(1)  # Medium
        else:
            convictions.append(0)  # Low
    
    return np.array(X), np.array(sentiments), np.array(convictions)


def train_narrative_model():
    """Train and save the narrative engine ML model."""
    logger.info("🚀 Training Narrative Engine ML Model...")
    
    # Create model directory
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate training data
    logger.info("Generating training data...")
    X, sentiments, convictions = generate_training_data()
    
    # Standardize features
    logger.info("Standardizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train sentiment classifier
    logger.info("Training sentiment classifier (Bullish/Neutral/Bearish)...")
    sentiment_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    sentiment_model.fit(X_scaled, sentiments)
    
    # Train conviction classifier
    logger.info("Training conviction classifier (High/Medium/Low)...")
    conviction_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    conviction_model.fit(X_scaled, convictions)
    
    # Evaluate
    sentiment_score = sentiment_model.score(X_scaled, sentiments)
    conviction_score = conviction_model.score(X_scaled, convictions)
    
    logger.info(f"✅ Sentiment model accuracy: {sentiment_score:.2%}")
    logger.info(f"✅ Conviction model accuracy: {conviction_score:.2%}")
    
    # Save the model package
    logger.info(f"Saving model to {MODEL_PATH}...")
    model_package = {
        "sentiment_model": sentiment_model,
        "conviction_model": conviction_model,
        "scaler": scaler,
        "sentiment_labels": {0: "Bearish", 1: "Neutral", 2: "Bullish"},
        "conviction_labels": {0: "Low", 1: "Medium", 2: "High"},
        "feature_names": ["confidence", "trend_score", "overall_score", "technical_score", "momentum_score", "expected_return", "volatility"]
    }
    
    joblib.dump(model_package, MODEL_PATH)
    logger.info(f"✅ Model saved to {MODEL_PATH}")
    
    return MODEL_PATH


if __name__ == "__main__":
    try:
        model_path = train_narrative_model()
        logger.info(f"🎉 Training complete! Model ready at: {model_path}")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Training failed: {str(e)}", exc_info=True)
        sys.exit(1)
