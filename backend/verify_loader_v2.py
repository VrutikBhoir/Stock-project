import sys
import os
import logging
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure we can import 'app'
# If running from 'backend' directory, 'app' is present.
current_dir = os.getcwd()
if current_dir not in sys.path:
    sys.path.append(current_dir)

logger.info(f"Working directory: {current_dir}")
logger.info(f"Sys path head: {sys.path[:3]}")

try:
    from app.services.ml.model_loader import load_model, get_model
except ImportError as e:
    logger.error(f"Import failed: {e}")
    sys.exit(1)

def test_singleton_behavior():
    logger.info("--- Testing Singleton Model Loader ---")
    
    # 1. First Load
    logger.info("[1] Initial Load...")
    start = time.time()
    try:
        load_model()
    except Exception as e:
        logger.error(f"Load failed: {e}")
        # Assuming model file might be missing or broken, we want to know
        return

    elapsed = time.time() - start
    logger.info(f"First load took: {elapsed:.4f}s")
    
    try:
        model = get_model()
        logger.info(f"Model object ID: {id(model)}")
    except Exception as e:
        logger.error(f"Get model failed: {e}")
        return
    
    # 2. Second Load (Should be instant and log skip)
    logger.info("[2] Second Load (Should be skipped)...")
    start = time.time()
    load_model()
    elapsed2 = time.time() - start
    logger.info(f"Second load took: {elapsed2:.4f}s")
    
    model2 = get_model()
    logger.info(f"Model2 object ID: {id(model2)}")
    
    if id(model) == id(model2):
        logger.info("SUCCESS: Object IDs match. Singleton behavior confirmed.")
    else:
        logger.error("FAILURE: Object IDs do not match!")

if __name__ == "__main__":
    test_singleton_behavior()
