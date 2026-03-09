import os
import time
import joblib
import requests
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "all_forecasts.pkl")

MODEL_URL = "https://api.onedrive.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL3UvYy82NUM3QjA2OEQ3OTc0RTk3L0lRQmlNQXlhTy1TUVRaN3VjX0VfY2ZJVUFWdGdLVk1oblJpSnpHUXR2a2hFTXFJP2Rvd25sb2FkPTE/root/content"

def ensure_model_file(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")
    return path

def download_model():

    if os.path.exists(MODEL_PATH):
        print("[INFO] Model already exists.")
        return

    print("[INFO] Downloading model from OneDrive...")

    os.makedirs(MODEL_DIR, exist_ok=True)

    response = requests.get(MODEL_URL, stream=True)

    if response.status_code != 200:
        raise RuntimeError("Failed to download model")

    with open(MODEL_PATH, "wb") as f:
        for chunk in response.iter_content(1024 * 1024):
            if chunk:
                f.write(chunk)

    if os.path.getsize(MODEL_PATH) < 1000000:
        raise RuntimeError("Downloaded file looks invalid (too small)")

    print("[SUCCESS] Model downloaded")


def load_all_models():

    start = time.time()

    download_model()

    print("[INFO] Loading models...")

    models = joblib.load(MODEL_PATH)

    print(f"[SUCCESS] Loaded {len(models)} models in {time.time()-start:.2f}s")

    return models