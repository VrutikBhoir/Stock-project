import os
import time
from urllib import response
import joblib
import requests
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "all_forecasts.pkl")

MODEL_URL = "https://1drv.ms/u/c/65C7B068D7974E97/IQBiMAuaO-SQTZ7uc_E_cfIUAVgtkVMhnRiJzGQtvkhEMqI?e=4xZHPA&download=1"
def ensure_model_file(path: str):
    if not os.path.exists(path):
        print("[INFO] Model missing. Downloading...")
        download_model()

    if not os.path.exists(path):
        raise RuntimeError(f"Model still missing after download: {path}")

    return path

def download_model():

    if os.path.exists(MODEL_PATH):
        print("[INFO] Model already exists.")
        return

    print("[INFO] Downloading model from OneDrive...")

    os.makedirs(MODEL_DIR, exist_ok=True)

    response = requests.get(MODEL_URL, stream=True, allow_redirects=True)
    if response.status_code != 200:
      raise RuntimeError(f"Failed to download model: {response.status_code}")

    with open(MODEL_PATH, "wb") as f:
        for chunk in response.iter_content(1024 * 1024):
            if chunk:
                f.write(chunk)

    if os.path.getsize(MODEL_PATH) < 1000000:
        raise RuntimeError("Downloaded file looks invalid (too small)")

    print("[SUCCESS] Model downloaded")


def load_all_models():

    start = time.time()

    ensure_model_file(MODEL_PATH)

    print("[INFO] Loading models...")

    models = joblib.load(MODEL_PATH)

    print(f"[SUCCESS] Loaded {len(models)} models in {time.time()-start:.2f}s")

    return models