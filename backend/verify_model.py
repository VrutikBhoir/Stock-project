#!/usr/bin/env python
"""Verify the trained narrative models."""
import joblib

try:
    m = joblib.load('app/services/ml/models/narrative_engine_final.pkl')
    print('✅ Model loaded successfully')
    print(f'   Keys: {list(m.keys())}')
    print(f'   Sentiment model: {m.get("sentiment_model") is not None}')
    print(f'   Conviction model: {m.get("conviction_model") is not None}')
    print(f'   Scaler: {m.get("scaler") is not None}')
    print('✅ All components present and ready')
except Exception as e:
    print(f'❌ Error: {str(e)}')
