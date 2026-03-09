import logging
import os
import joblib

logger = logging.getLogger(__name__)

lgb = None
load_model = None
_LGB_IMPORT_ERROR = None
_LSTM_IMPORT_ERROR = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "models"))

LIGHTGBM_MODEL_PATH = os.getenv("LIGHTGBM_MODEL_PATH", os.path.join(MODEL_DIR, "lightgbm.txt"))
ARIMA_MODEL_PATH = os.getenv("ARIMA_MODEL_PATH", os.path.join(MODEL_DIR, "all_forecasts.pkl"))
LSTM_MODEL_PATH = os.getenv("LSTM_MODEL_PATH", os.path.join(MODEL_DIR, "lstm_model.h5"))
SCALER_PATH = os.getenv("FEATURE_SCALER_PATH", os.path.join(MODEL_DIR, "feature_scaler.pkl"))
LIGHTGBM_STRICT_STARTUP = os.getenv("LIGHTGBM_STRICT_STARTUP", "false").lower() == "true"

_MODEL_BUNDLE = {}


def _require_file(path: str, label: str) -> None:
    if not os.path.exists(path):
        raise FileNotFoundError(f"{label} not found at {path}")


def _load_lightgbm_model(path: str):
    try:
        return lgb.Booster(model_file=path)
    except Exception:
        pass

    try:
        with open(path, "r", encoding="utf-8") as handle:
            first_line = handle.readline().strip()
        if "MSE" in first_line and "->" in first_line:
            raise RuntimeError("LightGBM model file appears to be a log, not a model")
    except UnicodeDecodeError:
        pass

    try:
        candidate = joblib.load(path)
        if hasattr(candidate, "predict"):
            return candidate
    except Exception:
        pass

    raise RuntimeError("LightGBM model could not be loaded; check file format")


def load_models() -> dict:
    if _MODEL_BUNDLE:
        return _MODEL_BUNDLE

    global lgb, load_model, _LGB_IMPORT_ERROR, _LSTM_IMPORT_ERROR

    if lgb is None:
        try:
            import lightgbm as _lgb
            lgb = _lgb
        except Exception as exc:
            _LGB_IMPORT_ERROR = exc
            raise RuntimeError(f"lightgbm is not installed: {_LGB_IMPORT_ERROR}")

    if load_model is None:
        try:
            from tensorflow.keras.models import load_model as _load_model
            load_model = _load_model
        except Exception as exc:
            _LSTM_IMPORT_ERROR = exc
            raise RuntimeError(f"tensorflow is not installed: {_LSTM_IMPORT_ERROR}")

    _require_file(LIGHTGBM_MODEL_PATH, "LightGBM model")
    _require_file(ARIMA_MODEL_PATH, "ARIMA/SARIMA model")
    _require_file(LSTM_MODEL_PATH, "LSTM model")
    _require_file(SCALER_PATH, "Feature scaler")

    logger.info("Loading hybrid forecasting models")

    try:
        _MODEL_BUNDLE["lightgbm"] = _load_lightgbm_model(LIGHTGBM_MODEL_PATH)
    except Exception as exc:
        if LIGHTGBM_STRICT_STARTUP:
            raise
        logger.warning("LightGBM unavailable at startup: %s", exc)
        _MODEL_BUNDLE["lightgbm"] = None
    _MODEL_BUNDLE["arima"] = joblib.load(ARIMA_MODEL_PATH)
    _MODEL_BUNDLE["lstm"] = load_model(LSTM_MODEL_PATH, compile=False)
    _MODEL_BUNDLE["scaler"] = joblib.load(SCALER_PATH)

    logger.info("Hybrid forecasting models loaded successfully")
    return _MODEL_BUNDLE


def get_models() -> dict:
    if not _MODEL_BUNDLE:
        raise RuntimeError("Models are not loaded. Call load_models() at startup.")
    return _MODEL_BUNDLE
