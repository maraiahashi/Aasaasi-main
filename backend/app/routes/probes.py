from fastapi import APIRouter, Response

router = APIRouter()

# Health probe helpers so Render's GET/HEAD/OPTIONS always succeed quickly
@router.get("/api/health")
def health_get():
    return {"status": "ok"}

@router.head("/api/health")
def health_head():
    return Response(status_code=200, headers={"Allow": "GET,HEAD,OPTIONS"})

@router.options("/api/health")
def health_options():
    return Response(status_code=200, headers={"Allow": "GET,HEAD,OPTIONS"})

# Friendly "/" so Render's port scanner HEAD / doesn't 405 during boot
@router.get("/")
def root():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}

@router.head("/")
def root_head():
    return Response(status_code=200)
