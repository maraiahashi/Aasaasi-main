from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/api/health")
def health_get():
    return {"status": "ok"}

@router.head("/api/health")
def health_head():
    return Response(status_code=200)

@router.options("/api/health")
def health_options():
    # Make OPTIONS always 200 so any preflight by proxies can't fail
    return Response(status_code=200)

@router.head("/")
def root_head():
    return Response(status_code=200)

@router.get("/")
def root_get():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}
