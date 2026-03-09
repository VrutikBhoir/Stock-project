import pandas as pd
import numpy as np
import sys
import os
import importlib.util

# Load module directly to avoid app package initialization side effects
module_path = os.path.join(os.path.dirname(__file__), 'app', 'services', 'ml', 'risk_vs_predict.py')
spec = importlib.util.spec_from_file_location("risk_vs_predict", module_path)
risk_vs_predict = importlib.util.module_from_spec(spec)
sys.modules["risk_vs_predict"] = risk_vs_predict
spec.loader.exec_module(risk_vs_predict)

generate_prediction_response = risk_vs_predict.generate_prediction_response
load_and_validate_data = risk_vs_predict.load_and_validate_data

def test_integration():
    print("\n--- Integration Test with Real CSV ---", flush=True)
    try:
        df = load_and_validate_data()
        result = generate_prediction_response(df)
        
        conf = result['risk_confidence']
        print("Resulting Risk Confidence:", conf, flush=True)
        
        l, m, h = conf['low'], conf['medium'], conf['high']
        print(f"Integration Test Actual Values: Low={l}, Medium={m}, High={h}", flush=True)
        
        # Check monotonic
        if l > m > h:
            print("SUCCESS: Low > Medium > High violation verified.", flush=True)
        else:
            print(f"WARNING: Monotonic check failed? L={l}, M={m}, H={h}", flush=True)
            
    except Exception as e:
        print(f"Integration test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_integration()
