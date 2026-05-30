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
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
import requests
from starlette.responses import Response as StarletteResponse  # Тот самый важный импорт!

# ---------- Настройка окружения ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("dezi")

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App & Инициализация ----------
app = FastAPI(title="Dezi Market API")
api_router = APIRouter(prefix="/api")

# ---------- АБСОЛЮТНЫЙ ПЕРЕХВАТЧИК OPTIONS (ASGI УРОВЕНЬ) ----------
@app.middleware("http")
async def catch_options_preflight(request: Request, call_next):
    if request.method == "OPTIONS":
        response = StarletteResponse(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "https://diplom-kappa-three.vercel.app"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With, Origin"
        return response
    
    response = await call_next(request)
    # На всякий случай добавляем CORS-заголовки и к обычным ответам (GET, POST)
    response.headers["Access-Control-Allow-Origin"] = "https://diplom-kappa-three.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

STORAGE_URL = ""
APP_NAME = os.environ.get("APP_NAME", "dezi-market")
storage_key_holder = {"key": None}

def init_storage() -> Optional[str]:
    return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Хранилище недоступно")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        storage_key_holder["key"] = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Хранилище недоступно")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        storage_key_holder["key"] = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Файл не найден")
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------- Password & JWT ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Исправили куки под требования безопасности современных браузеров (samesite="none", secure=True)
def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=1209600, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

# ---------- Auth Dependency ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Неверный тип токена")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Срок токена истёк")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Недействительный токен")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        return user
    return dep

# ---------- Pydantic Models ----------
class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[str] = None

class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileBody(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class DesignCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=10, max_length=4000)
    category: str
    styles: List[str] = Field(min_length=1)
    external_url: str = Field(min_length=4, max_length=500)
    price: float = 0.0
    is_free: bool = True
    tags: List[str] = []
    images: List[str] = []

class DesignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    styles: Optional[List[str]] = None
    external_url: Optional[str] = None
    price: Optional[float] = None
    is_free: Optional[bool] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    status: Optional[str] = None

class AdminCreateUserBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    role: str = "user"

class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u.get("_id") or u.get("id")),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "user"),
        "avatar_url": u.get("avatar_url"),
        "bio": u.get("bio"),
        "created_at": u.get("created_at"),
    }

async def serialize_design(d: dict, current_user: Optional[dict] = None) -> dict:
    author = await db.users.find_one({"_id": ObjectId(d["author_id"])}) if d.get("author_id") else None
    saved = False
    liked = False
    if current_user:
        saved = await db.favorites.find_one({"user_id": current_user["id"], "design_id": str(d["_id"])}) is not None
        liked = await db.likes.find_one({"user_id": current_user["id"], "design_id": str(d["_id"])}) is not None
    return {
        "id": str(d["_id"]),
        "title": d["title"],
        "description": d["description"],
        "category": d["category"],
        "styles": d.get("styles") or ([d["style"]] if d.get("style") else []),
        "external_url": d.get("external_url", ""),
        "price": d.get("price", 0.0),
        "is_free": d.get("is_free", True),
        "tags": d.get("tags", []),
        "images": d.get("images", []),
        "status": d.get("status", "pending"),
        "likes_count": d.get("likes_count", 0),
        "downloads_count": d.get("downloads_count", 0),
        "views_count": d.get("views_count", 0),
        "rating": d.get("rating", 0.0),
        "rating_count": d.get("rating_count", 0),
        "created_at": d.get("created_at"),
        "updated_at": d.get("updated_at"),
        "author": {
            "id": str(author["_id"]) if author else None,
            "name": author.get("name") if author else "Аноним",
            "avatar_url": author.get("avatar_url") if author else None,
            "role": author.get("role") if author else "user",
        } if author else None,
        "saved_by_me": saved,
        "liked_by_me": liked,
    }

# ---------- Auth Routes ----------
@api_router.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "user",
        "avatar_url": None,
        "bio": None,
        "created_at": now_iso(),
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    access = create_access_token(uid, email, "user")
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)

@api_router.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    uid = str(user["_id"])
    access = create_access_token(uid, email, user.get("role", "user"))
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token