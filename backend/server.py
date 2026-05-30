from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Request,
    Response,
    Depends,
    UploadFile,
    File,
    Form,
    Query,
)
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from bson import ObjectId
import io

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("dezi")

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="Dezi Market API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

from starlette.middleware.cors import CORSMiddleware

# Разрешаем фронтенду ходить на бэкенд
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=1209600, path="/")


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


# ---------- Models ----------
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
    status: Optional[str] = None  # admin/moderator only


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
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Нет refresh токена")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Неверный токен")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        access = create_access_token(str(user["_id"]), user["email"], user.get("role", "user"))
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")


# ---------- Profile ----------
@api_router.patch("/users/me")
async def update_me(body: UpdateProfileBody, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        return user
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return serialize_user(fresh)


# ---------- File Upload ----------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Допустимы только изображения")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        ext = "png"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 10MB")
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({
        "storage_path": result["path"],
        "owner_id": user["id"],
        "size": result.get("size", len(data)),
        "content_type": file.content_type,
        "original_filename": file.filename,
        "is_deleted": False,
        "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api_router.get("/files/{path:path}")
async def get_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Файл не найден")
    data, ctype = get_object(path)
    return StreamingResponse(io.BytesIO(data), media_type=record.get("content_type", ctype))


# ---------- Designs ----------
@api_router.post("/designs")
async def create_design(body: DesignCreate, user: dict = Depends(get_current_user)):
    role = user.get("role", "user")
    status = "approved" if role in ("admin", "moderator") else "pending"
    doc = {
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category,
        "styles": [s for s in body.styles if s][:5] or ["modern"],
        "external_url": body.external_url.strip(),
        "price": 0.0 if body.is_free else max(body.price, 0.0),
        "is_free": body.is_free,
        "tags": [t.strip() for t in body.tags if t.strip()][:12],
        "images": body.images[:8],
        "status": status,
        "author_id": user["id"],
        "likes_count": 0,
        "downloads_count": 0,
        "views_count": 0,
        "rating": 0.0,
        "rating_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    result = await db.designs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return await serialize_design(doc, user)


@api_router.get("/designs")
async def list_designs(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    style: Optional[str] = None,
    price: Optional[str] = None,  # free|paid|all
    sort: str = "popular",  # popular|newest|rating|downloads
    status: str = "approved",
    author_id: Optional[str] = None,
    limit: int = 60,
    skip: int = 0,
):
    current = await get_optional_user(request)
    query: dict = {}
    if status == "approved":
        query["status"] = "approved"
    else:
        # privileged statuses
        if not current or current.get("role") not in ("admin", "moderator"):
            query["status"] = "approved"
        else:
            query["status"] = status
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": q, "$options": "i"}}},
        ]
    if category and category != "all":
        query["category"] = category
    if style and style != "all":
        query["styles"] = style
    if price == "free":
        query["is_free"] = True
    elif price == "paid":
        query["is_free"] = False
    if author_id:
        query["author_id"] = author_id

    sort_map = {
        "popular": [("likes_count", -1), ("views_count", -1)],
        "newest": [("created_at", -1)],
        "rating": [("rating", -1), ("rating_count", -1)],
        "downloads": [("downloads_count", -1)],
    }
    sort_spec = sort_map.get(sort, sort_map["popular"])
    cursor = db.designs.find(query).sort(sort_spec).skip(skip).limit(min(limit, 100))
    designs = []
    async for d in cursor:
        designs.append(await serialize_design(d, current))
    return designs


@api_router.get("/designs/trending")
async def trending(request: Request):
    current = await get_optional_user(request)
    cursor = db.designs.find({"status": "approved"}).sort([("likes_count", -1), ("views_count", -1)]).limit(12)
    return [await serialize_design(d, current) async for d in cursor]


@api_router.get("/designs/{design_id}")
async def get_design(design_id: str, request: Request):
    current = await get_optional_user(request)
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d:
        raise HTTPException(status_code=404, detail="Дизайн не найден")
    if d.get("status") != "approved":
        if not current or (current.get("role") not in ("admin", "moderator") and current["id"] != d["author_id"]):
            raise HTTPException(status_code=403, detail="Нет доступа")
    await db.designs.update_one({"_id": d["_id"]}, {"$inc": {"views_count": 1}})
    d["views_count"] = d.get("views_count", 0) + 1
    return await serialize_design(d, current)


@api_router.patch("/designs/{design_id}")
async def update_design(design_id: str, body: DesignUpdate, user: dict = Depends(get_current_user)):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d:
        raise HTTPException(status_code=404, detail="Дизайн не найден")
    is_owner = d["author_id"] == user["id"]
    is_staff = user.get("role") in ("admin", "moderator")
    if not (is_owner or is_staff):
        raise HTTPException(status_code=403, detail="Нет прав")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in update and not is_staff:
        del update["status"]
    if "is_free" in update and update["is_free"]:
        update["price"] = 0.0
    update["updated_at"] = now_iso()
    if not is_staff and is_owner:
        # author-editing puts design back to pending review
        update.setdefault("status", "pending")
    await db.designs.update_one({"_id": d["_id"]}, {"$set": update})
    fresh = await db.designs.find_one({"_id": d["_id"]})
    return await serialize_design(fresh, user)


@api_router.delete("/designs/{design_id}")
async def delete_design(design_id: str, user: dict = Depends(get_current_user)):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d:
        raise HTTPException(status_code=404, detail="Дизайн не найден")
    if d["author_id"] != user["id"] and user.get("role") not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Нет прав")
    await db.designs.delete_one({"_id": d["_id"]})
    await db.comments.delete_many({"design_id": design_id})
    await db.favorites.delete_many({"design_id": design_id})
    await db.likes.delete_many({"design_id": design_id})
    return {"ok": True}


@api_router.post("/designs/{design_id}/moderate")
async def moderate_design(
    design_id: str,
    action: str = Query(..., description="approve|reject"),
    user: dict = Depends(require_roles("admin", "moderator")),
):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d:
        raise HTTPException(status_code=404, detail="Дизайн не найден")
    new_status = "approved" if action == "approve" else "rejected"
    await db.designs.update_one({"_id": d["_id"]}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    fresh = await db.designs.find_one({"_id": d["_id"]})
    return await serialize_design(fresh, user)


# ---------- Likes / Favorites ----------
@api_router.post("/designs/{design_id}/like")
async def toggle_like(design_id: str, user: dict = Depends(get_current_user)):
    existing = await db.likes.find_one({"user_id": user["id"], "design_id": design_id})
    if existing:
        await db.likes.delete_one({"_id": existing["_id"]})
        await db.designs.update_one({"_id": ObjectId(design_id)}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.likes.insert_one({"user_id": user["id"], "design_id": design_id, "created_at": now_iso()})
    await db.designs.update_one({"_id": ObjectId(design_id)}, {"$inc": {"likes_count": 1}})
    return {"liked": True}


@api_router.post("/designs/{design_id}/favorite")
async def toggle_favorite(design_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "design_id": design_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"saved": False}
    await db.favorites.insert_one({"user_id": user["id"], "design_id": design_id, "created_at": now_iso()})
    return {"saved": True}


@api_router.get("/favorites")
async def list_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    result = []
    for f in favs:
        try:
            d = await db.designs.find_one({"_id": ObjectId(f["design_id"])})
            if d:
                result.append(await serialize_design(d, user))
        except Exception:
            continue
    return result


# ---------- Download / Purchase ----------
@api_router.post("/designs/{design_id}/download")
async def download_design(design_id: str, user: dict = Depends(get_current_user)):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d or d.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Дизайн недоступен")
    if not d.get("is_free", True):
        purchased = await db.purchases.find_one({"user_id": user["id"], "design_id": design_id, "status": "completed"})
        if not purchased:
            raise HTTPException(status_code=402, detail="Требуется покупка")
    await db.designs.update_one({"_id": d["_id"]}, {"$inc": {"downloads_count": 1}})
    return {"ok": True, "files": d.get("images", [])}


@api_router.post("/designs/{design_id}/purchase")
async def purchase_design(design_id: str, user: dict = Depends(get_current_user)):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d or d.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Дизайн недоступен")
    if d.get("is_free", True):
        return {"ok": True, "status": "free"}
    existing = await db.purchases.find_one({"user_id": user["id"], "design_id": design_id, "status": "completed"})
    if existing:
        return {"ok": True, "status": "already_purchased"}
    await db.purchases.insert_one({
        "user_id": user["id"],
        "design_id": design_id,
        "amount": d.get("price", 0.0),
        "status": "completed",  # MOCKED — без реальной оплаты
        "created_at": now_iso(),
    })
    return {"ok": True, "status": "completed"}


@api_router.get("/purchases")
async def list_purchases(user: dict = Depends(get_current_user)):
    items = await db.purchases.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    result = []
    for p in items:
        try:
            d = await db.designs.find_one({"_id": ObjectId(p["design_id"])})
            if d:
                serialized = await serialize_design(d, user)
                serialized["purchase"] = {
                    "amount": p.get("amount", 0),
                    "status": p.get("status"),
                    "created_at": p.get("created_at"),
                }
                result.append(serialized)
        except Exception:
            continue
    return result


# ---------- Comments ----------
@api_router.get("/designs/{design_id}/comments")
async def list_comments(design_id: str):
    cursor = db.comments.find({"design_id": design_id}).sort("created_at", -1).limit(200)
    items = []
    async for c in cursor:
        author = await db.users.find_one({"_id": ObjectId(c["user_id"])}) if c.get("user_id") else None
        items.append({
            "id": str(c["_id"]),
            "text": c["text"],
            "created_at": c.get("created_at"),
            "author": {
                "id": str(author["_id"]) if author else None,
                "name": author.get("name") if author else "Аноним",
                "avatar_url": author.get("avatar_url") if author else None,
            },
        })
    return items


@api_router.post("/designs/{design_id}/comments")
async def create_comment(design_id: str, body: CommentCreate, user: dict = Depends(get_current_user)):
    try:
        d = await db.designs.find_one({"_id": ObjectId(design_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not d:
        raise HTTPException(status_code=404, detail="Дизайн не найден")
    doc = {
        "design_id": design_id,
        "user_id": user["id"],
        "text": body.text.strip(),
        "created_at": now_iso(),
    }
    res = await db.comments.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        "text": doc["text"],
        "created_at": doc["created_at"],
        "author": {"id": user["id"], "name": user.get("name"), "avatar_url": user.get("avatar_url")},
    }


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    try:
        c = await db.comments.find_one({"_id": ObjectId(comment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not c:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if c["user_id"] != user["id"] and user.get("role") not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Нет прав")
    await db.comments.delete_one({"_id": c["_id"]})
    return {"ok": True}


# ---------- Admin: users management ----------
@api_router.get("/admin/users")
async def admin_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}).sort("created_at", -1).to_list(500)
    return [serialize_user(u) for u in users]


@api_router.patch("/admin/users/{user_id}/role")
async def admin_set_role(user_id: str, role: str = Query(..., description="user|moderator|admin"), _user: dict = Depends(require_roles("admin"))):
    if role not in ("user", "moderator", "admin"):
        raise HTTPException(status_code=400, detail="Неверная роль")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    fresh = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_user(fresh)


@api_router.post("/admin/users")
async def admin_create_user(body: AdminCreateUserBody, _user: dict = Depends(require_roles("admin"))):
    if body.role not in ("user", "moderator", "admin"):
        raise HTTPException(status_code=400, detail="Неверная роль")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": body.role,
        "avatar_url": None,
        "bio": None,
        "created_at": now_iso(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current: dict = Depends(require_roles("admin"))):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный ID")
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.designs.delete_many({"author_id": user_id})
    await db.comments.delete_many({"user_id": user_id})
    await db.favorites.delete_many({"user_id": user_id})
    await db.likes.delete_many({"user_id": user_id})
    await db.purchases.delete_many({"user_id": user_id})
    return {"ok": True}


# ---------- Stats ----------
@api_router.get("/stats")
async def stats():
    return {
        "designs": await db.designs.count_documents({"status": "approved"}),
        "pending": await db.designs.count_documents({"status": "pending"}),
        "users": await db.users.count_documents({}),
    }


@api_router.get("/")
async def root():
    return {"app": "Dezi Market API", "status": "ok"}


# ---------- App wiring ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.designs.create_index([("status", 1), ("created_at", -1)])
    await db.designs.create_index([("author_id", 1)])
    await db.designs.create_index([("category", 1), ("styles", 1)])
    await db.favorites.create_index([("user_id", 1), ("design_id", 1)], unique=True)
    await db.likes.create_index([("user_id", 1), ("design_id", 1)], unique=True)
    await db.comments.create_index([("design_id", 1), ("created_at", -1)])

    # Seed admin + moderator
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@dezi.ru")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "name": "Администратор",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "avatar_url": None,
            "bio": "Главный администратор платформы",
            "created_at": now_iso(),
        })
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    mod_email = os.environ.get("MODERATOR_EMAIL", "moderator@dezi.ru")
    mod_password = os.environ.get("MODERATOR_PASSWORD", "moder12345")
    existing_mod = await db.users.find_one({"email": mod_email})
    if not existing_mod:
        await db.users.insert_one({
            "email": mod_email,
            "name": "Модератор",
            "password_hash": hash_password(mod_password),
            "role": "moderator",
            "avatar_url": None,
            "bio": "Модератор контента",
            "created_at": now_iso(),
        })
        logger.info("Moderator seeded")
    elif not verify_password(mod_password, existing_mod["password_hash"]):
        await db.users.update_one(
            {"email": mod_email},
            {"$set": {"password_hash": hash_password(mod_password), "role": "moderator"}},
        )

    init_storage()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
