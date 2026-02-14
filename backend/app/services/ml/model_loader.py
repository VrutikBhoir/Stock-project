import os
import time
import joblib

# --------------------------------------------------
# Resolve absolute path
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "all_forecasts.pkl")

# --------------------------------------------------
# Load models ONCE at startup
# --------------------------------------------------
start = time.time()

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

ALL_MODELS = joblib.load(MODEL_PATH)

print(f"[SUCCESS] Loaded {len(ALL_MODELS)} models in {time.time() - start:.2f}s")
