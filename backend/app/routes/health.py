from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/health")
def health_get():
    return {"status": "ok"}

@router.head("/health")
def health_head():
    return Response(status_code=200)

@router.options("/health")
def health_options():
    # CORSMiddleware will append CORS headers if Origin present
    return Response(status_code=200)
