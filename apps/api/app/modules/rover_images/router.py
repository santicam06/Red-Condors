from fastapi import APIRouter

# Endpoints for this domain are added as the feature is built.
# Keep request/response models in schemas.py and logic in service.py.
router = APIRouter(prefix="/rover-images", tags=["rover-images"])
