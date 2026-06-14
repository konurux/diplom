import io
import logging
import os
import uuid
from datetime import datetime, timezone

import bcrypt
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import (
    APIRouter, Depends, FastAPI, File, HTTPException, Request, UploadFile,
)
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from starlette.responses import Response as StarletteResponse

# --- Настройка ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dezi")
APP_NAME = os.environ.get("APP_NAME", "dezi-market")

# --- База данных ---
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Dezi Market API")
api_router = APIRouter(prefix="/api")

# --- Вспомогательные функции (АВТОРИЗАЦИЯ) ---
JWT_ALGORITHM = "HS256"

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user: raise HTTPException(status_code=401, detail="Пользователь не найден")
        user["id"] = str(user.pop("_id"))
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Ошибка авторизации")

# --- GridFS ---
async def put_object(path: str, data: bytes, content_type: str) -> dict:
    fs = AsyncIOMotorGridFSBucket(db)
    await fs.upload_from_stream(path, data, metadata={"contentType": content_type})
    return {"path": path, "size": len(data)}

async def get_object(path: str):
    fs = AsyncIOMotorGridFSBucket(db)
    grid_out = await fs.open_download_stream_by_name(path)
    data = await grid_out.read()
    return data, grid_out.metadata.get("contentType", "image/jpeg")

# --- Эндпоинты ---
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
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
    data, ctype = await get_object(path)
    return StreamingResponse(io.BytesIO(data), media_type=ctype)

app.include_router(api_router)