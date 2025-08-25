import hashlib, os
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from gtts import gTTS

router = APIRouter(tags=["TTS"])
CACHE_DIR = os.path.join(os.getenv("DATA_DIR","./backend/data"), "tts_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

@router.get("/tts")
def tts(text: str = Query(..., min_length=1), lang: str = "en", slow: bool = False):
    key = f"{lang}:{slow}:{text}".encode("utf-8")
    mp3 = os.path.join(CACHE_DIR, f"{hashlib.md5(key).hexdigest()}.mp3")
    if not os.path.exists(mp3):
        try:
            gTTS(text=text, lang=lang, slow=slow).save(mp3+".tmp")
            os.replace(mp3+".tmp", mp3)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"TTS failed: {e}")
    return FileResponse(mp3, media_type="audio/mpeg", filename="audio.mp3")
