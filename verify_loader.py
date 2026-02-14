import sys
import os
import logging
import time

# Setup basic logging to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Add backend to path so we can import app modules
# Assuming we run this from the project root or similar
# Adjust path as necessary
current_dir = os.getcwd()
backend_dir = os.path.join(current_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

print(f"Added {backend_dir} to sys.path")

from app.services.ml.model_loader import load_model, get_model

def test_singleton_behavior():
    print("\n--- Testing Singleton Model Loader ---")
    
    # 1. First Load
    print("[1] Initial Load...")
    start = time.time()
    load_model()
    print(f"First load took: {time.time() - start:.4f}s")
    
    # Verify it's loaded
    model = get_model()
    print(f"Model object ID: {id(model)}")
    
    # 2. Second Load (Should be instant and log skip)
    print("\n[2] Second Load (Should be skipped)...")
    start = time.time()
    load_model()
    print(f"Second load took: {time.time() - start:.4f}s")
    
    # Verify object ID matches (same object)
    model2 = get_model()
    print(f"Model2 object ID: {id(model2)}")
    
    if id(model) == id(model2):
        print("SUCCESS: Object IDs match. Singleton behavior confirmed.")
    else:
        print("FAILURE: Object IDs do not match!")

if __name__ == "__main__":
    try:
        test_singleton_behavior()
    except Exception as e:
        print(f"An error occurred: {e}")
