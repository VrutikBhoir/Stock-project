from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.app.services.ml.hybrid.predictor import predict_future

router = APIRouter()


class PredictRequest(BaseModel):
    days: int = Field(..., ge=1, le=180)
    input_data: Dict[str, Any] = Field(default_factory=dict)


@router.post("/predict")
def hybrid_predict(payload: PredictRequest):
    try:
        result = predict_future(payload.days, payload.input_data)
        return result
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc)})
    except Exception as exc:
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Prediction failed: {exc}"})
