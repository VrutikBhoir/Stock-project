import os
import sys
import pickle
import time

# Attempt to handle huge files and potential locking
# We will use simple pickle load for all_forecasts.pkl as seen in model_loader.py

def test_file(filepath, description):
    print(f"\n[{description}] Testing: {filepath}")
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return

    file_size = os.path.getsize(filepath) / (1024 * 1024) # MB
    print(f"   Size: {file_size:.2f} MB")
    
    start = time.time()
    try:
        # Using pickle directly as per model_loader.py for all_forecasts
        # For narrative_engine, we also try pickle first.
        with open(filepath, "rb") as f:
            model = pickle.load(f)
            
        elapsed = time.time() - start
        print(f"✅ Successfully loaded in {elapsed:.2f}s")
        print(f"   Type: {type(model)}")
        if hasattr(model, '__class__'):
             print(f"   Class: {model.__class__}")
             
    except Exception as e:
        print(f"❌ Failed to load: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    base_dir = os.path.join("backend", "app", "services", "ml", "models")
    
    # 1. Narrative Engine
    narrative_path = os.path.join(base_dir, "narrative_engine_final.pkl")
    test_file(narrative_path, "Narrative Engine")

    # 2. All Forecasts (Huge)
    forecasts_path = os.path.join(base_dir, "all_forecasts.pkl")
    test_file(forecasts_path, "All Forecasts (7GB)")
