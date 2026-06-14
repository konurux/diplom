import io
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import bcrypt
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import (
    APIRouter, Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile,
)
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, EmailStr, Field
from starlette.responses import Response as StarletteResponse

# ---------- Настройка ----------
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dezi")

APP_NAME = os.environ.get("APP_NAME", "dezi-market")

# ---------- DB ----------
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Dezi Market API")
api_router = APIRouter(prefix="/api")

# ---------- GridFS (Ваше хранилище в БД) ----------
async def put_object(path: str, data: bytes, content_type: str) -> dict:
    fs = AsyncIOMotorGridFSBucket(db)
    await fs.upload_from_stream(path, data, metadata={"contentType": content_type})
    return {"path": path, "size": len(data)}

async def get_object(path: str):
    fs = AsyncIOMotorGridFSBucket(db)
    grid_out = await fs.open_download_stream_by_name(path)
    data = await grid_out.read()
    return data, grid_out.metadata.get("contentType", "image/jpeg")

# ---------- Middleware (CORS) ----------
@app.middleware("http")
async def catch_options_preflight(request: Request, call_next):
    origin = request.headers.get("Origin", "https://diplom-kappa-three.vercel.app")
    if request.method == "OPTIONS":
        response = StarletteResponse(status_code=204)
    else:
        response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# ---------- ФУНКЦИЯ ЗАГРУЗКИ (ИСПРАВЛЕННАЯ) ----------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Допустимы только изображения")
    
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 10MB")
        
    result = await put_object(path, data, file.content_type)
    
    await db.files.insert_one({
        "storage_path": result["path"],
        "owner_id": user["id"],
        "size": result["size"],
        "content_type": file.content_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def get_file(path: str):
    record = await db.files.find_one({"storage_path": path})
    if not record: raise HTTPException(status_code=404)
    data, ctype = await get_object(path)
    return StreamingResponse(io.BytesIO(data), media_type=ctype)

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    # Тут остальные индексы...
    logger.info("Бэкенд запущен и подключен к MongoDB (GridFS)")

app.include_router(api_router)