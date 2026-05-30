"""Dezi Market backend API tests — iteration 2 (styles[] + external_url + admin user CRUD)."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admindezi@gmail.com"
ADMIN_PASSWORD = "admin123"
MOD_EMAIL = "moderatordezi@gmail.com"
MOD_PASSWORD = "moder123"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = s.cookies.get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s, r.json()


def _register(name_prefix="TEST_user"):
    email = f"{name_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "testpass123"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "TEST User"}, timeout=20)
    assert r.status_code == 200, f"register failed: {r.text}"
    tok = s.cookies.get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s, r.json(), email, pwd


@pytest.fixture(scope="session")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def moderator():
    return _login(MOD_EMAIL, MOD_PASSWORD)


@pytest.fixture(scope="session")
def user_account():
    return _register("TEST_user")


@pytest.fixture(scope="session")
def user2_account():
    return _register("TEST_user2")


def _payload(**over):
    base = {
        "title": "TEST Design " + uuid.uuid4().hex[:6],
        "description": "This is a TEST design with enough description text.",
        "category": "ui-kit",
        "styles": ["minimalism"],
        "external_url": "https://example.com/design/" + uuid.uuid4().hex[:6],
        "price": 0.0,
        "is_free": True,
        "tags": ["test", "ui"],
        "images": [],
    }
    base.update(over)
    return base


# -------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "designs" in d and "users" in d


# -------- Auth ----------
class TestAuth:
    def test_admin_login(self, admin):
        _, data = admin
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_moderator_login(self, moderator):
        _, data = moderator
        assert data["role"] == "moderator"

    def test_me(self, admin):
        s, _ = admin
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_register_duplicate(self, user_account):
        _, _, email, pwd = user_account
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "Dup"}, timeout=10)
        assert r.status_code == 400

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# -------- Designs schema: styles[] + external_url ----------
class TestDesignSchema:
    def test_create_requires_styles(self, admin):
        s, _ = admin
        payload = _payload()
        payload.pop("styles")
        r = s.post(f"{API}/designs", json=payload, timeout=15)
        assert r.status_code == 422, r.text

    def test_create_requires_external_url(self, admin):
        s, _ = admin
        payload = _payload()
        payload.pop("external_url")
        r = s.post(f"{API}/designs", json=payload, timeout=15)
        assert r.status_code == 422, r.text

    def test_create_rejects_empty_styles(self, admin):
        s, _ = admin
        r = s.post(f"{API}/designs", json=_payload(styles=[]), timeout=15)
        assert r.status_code == 422

    def test_create_with_multiple_styles(self, admin):
        s, _ = admin
        r = s.post(f"{API}/designs", json=_payload(
            title="TEST MultiStyle",
            styles=["minimalism", "modern", "dark"],
            external_url="https://example.com/multi",
        ), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["styles"], list)
        assert set(d["styles"]) == {"minimalism", "modern", "dark"}
        assert d["external_url"] == "https://example.com/multi"
        pytest.multi_design_id = d["id"]

        # Verify persistence via GET
        r2 = requests.get(f"{API}/designs/{d['id']}", timeout=10)
        assert r2.status_code == 200
        d2 = r2.json()
        assert set(d2["styles"]) == {"minimalism", "modern", "dark"}
        assert d2["external_url"] == "https://example.com/multi"

    def test_filter_by_single_style_matches_array(self):
        # multi_design has 'minimalism' in styles array
        r = requests.get(f"{API}/designs", params={"style": "minimalism"}, timeout=10)
        assert r.status_code == 200
        ids = [d["id"] for d in r.json()]
        assert getattr(pytest, "multi_design_id", None) in ids
        # All returned must include 'minimalism' in styles
        for d in r.json():
            assert "minimalism" in d["styles"], d

    def test_patch_styles_and_external_url(self, admin):
        s, _ = admin
        did = pytest.multi_design_id
        r = s.patch(f"{API}/designs/{did}", json={
            "styles": ["scandinavian", "loft"],
            "external_url": "https://example.com/updated",
        }, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(d["styles"]) == {"scandinavian", "loft"}
        assert d["external_url"] == "https://example.com/updated"


# -------- Designs CRUD + roles ----------
class TestDesigns:
    def test_user_creates_pending(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs", json=_payload(), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["author"]["role"] == "user"
        assert isinstance(d["styles"], list)
        assert d["external_url"].startswith("http")
        pytest.user_design_id = d["id"]

    def test_admin_creates_approved(self, admin):
        s, _ = admin
        r = s.post(f"{API}/designs", json=_payload(title="TEST Admin"), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "approved"
        pytest.admin_design_id = d["id"]

    def test_list_default_only_approved(self):
        r = requests.get(f"{API}/designs", timeout=10)
        assert r.status_code == 200
        for d in r.json():
            assert d["status"] == "approved"
            assert isinstance(d["styles"], list)
            assert "external_url" in d

    def test_list_paid_filter(self, admin):
        s, _ = admin
        r = s.post(f"{API}/designs", json=_payload(
            title="TEST Paid", category="mockup", styles=["modern"],
            price=99.0, is_free=False,
        ), timeout=15)
        assert r.status_code == 200
        pytest.paid_design_id = r.json()["id"]

        r = requests.get(f"{API}/designs", params={"price": "paid"}, timeout=10)
        assert r.status_code == 200
        assert all(not d["is_free"] for d in r.json())

    def test_get_design_increments_view(self):
        r1 = requests.get(f"{API}/designs/{pytest.admin_design_id}", timeout=10)
        assert r1.status_code == 200
        v1 = r1.json()["views_count"]
        r2 = requests.get(f"{API}/designs/{pytest.admin_design_id}", timeout=10)
        assert r2.json()["views_count"] == v1 + 1

    def test_owner_edit_resets_to_pending(self, user_account, admin):
        s_admin, _ = admin
        r = s_admin.post(f"{API}/designs/{pytest.user_design_id}/moderate",
                         params={"action": "approve"}, timeout=10)
        assert r.status_code == 200
        s, _, _, _ = user_account
        r = s.patch(f"{API}/designs/{pytest.user_design_id}", json={"title": "TEST Edited"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "pending"


# -------- Moderation ----------
class TestModeration:
    def test_user_cannot_moderate(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.admin_design_id}/moderate",
                   params={"action": "approve"}, timeout=10)
        assert r.status_code == 403

    def test_moderator_reject(self, moderator, admin):
        s_admin, _ = admin
        r = s_admin.post(f"{API}/designs", json=_payload(title="TEST ToReject"), timeout=10)
        did = r.json()["id"]
        s, _ = moderator
        r = s.post(f"{API}/designs/{did}/moderate", params={"action": "reject"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"


# -------- Likes / Favorites / Comments ----------
class TestInteractions:
    def test_like_toggle(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.admin_design_id}/like", timeout=10)
        assert r.json()["liked"] is True
        r = s.post(f"{API}/designs/{pytest.admin_design_id}/like", timeout=10)
        assert r.json()["liked"] is False

    def test_favorite_toggle_and_list(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.admin_design_id}/favorite", timeout=10)
        assert r.json()["saved"] is True
        r = s.get(f"{API}/favorites", timeout=10)
        ids = [d["id"] for d in r.json()]
        assert pytest.admin_design_id in ids

    def test_comments(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.admin_design_id}/comments",
                   json={"text": "TEST comment"}, timeout=10)
        assert r.status_code == 200
        cid = r.json()["id"]
        r = requests.get(f"{API}/designs/{pytest.admin_design_id}/comments", timeout=10)
        assert any(c["id"] == cid for c in r.json())
        r = s.delete(f"{API}/comments/{cid}", timeout=10)
        assert r.status_code == 200


# -------- Purchase / Download (MOCKED purchase) ----------
class TestDownloadPurchase:
    def test_paid_requires_purchase(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.paid_design_id}/download", timeout=10)
        assert r.status_code == 402

    def test_purchase_then_download(self, user_account):
        s, _, _, _ = user_account
        r = s.post(f"{API}/designs/{pytest.paid_design_id}/purchase", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "completed"
        r = s.post(f"{API}/designs/{pytest.paid_design_id}/download", timeout=10)
        assert r.status_code == 200


# -------- Admin: list users / role ----------
class TestAdminUsersBasic:
    def test_user_cannot_list_users(self, user_account):
        s, _, _, _ = user_account
        r = s.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 403

    def test_moderator_cannot_list_users(self, moderator):
        s, _ = moderator
        r = s.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 403

    def test_admin_lists_users(self, admin):
        s, _ = admin
        r = s.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert ADMIN_EMAIL in emails


# -------- Admin: CREATE & DELETE users (NEW iteration 2) ----------
class TestAdminUserCRUD:
    def test_admin_create_user_success(self, admin):
        s, _ = admin
        # Backend normalizes email to lowercase
        email = f"test_created_{uuid.uuid4().hex[:8]}@example.com"
        body = {"email": email, "password": "newpass123", "name": "TEST Created", "role": "user"}
        r = s.post(f"{API}/admin/users", json=body, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == email
        assert d["role"] == "user"
        assert "id" in d
        pytest.created_user_id = d["id"]
        pytest.created_user_email = email
        pytest.created_user_password = "newpass123"

        # Verify they appear in admin/users list
        r2 = s.get(f"{API}/admin/users", timeout=10)
        assert any(u["email"] == email for u in r2.json())

    def test_created_user_can_login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={
            "email": pytest.created_user_email,
            "password": pytest.created_user_password,
        }, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == pytest.created_user_email

    def test_admin_create_user_duplicate_email(self, admin):
        s, _ = admin
        body = {"email": pytest.created_user_email, "password": "x123456", "name": "Dup"}
        r = s.post(f"{API}/admin/users", json=body, timeout=10)
        assert r.status_code == 400

    def test_admin_create_user_invalid_role(self, admin):
        s, _ = admin
        body = {
            "email": f"TEST_badrole_{uuid.uuid4().hex[:6]}@example.com",
            "password": "x123456", "name": "Bad", "role": "superuser",
        }
        r = s.post(f"{API}/admin/users", json=body, timeout=10)
        assert r.status_code == 400

    def test_non_admin_cannot_create_user(self, user_account):
        s, _, _, _ = user_account
        body = {"email": f"TEST_no_{uuid.uuid4().hex[:6]}@example.com",
                "password": "x123456", "name": "No"}
        r = s.post(f"{API}/admin/users", json=body, timeout=10)
        assert r.status_code == 403

    def test_moderator_cannot_create_user(self, moderator):
        s, _ = moderator
        body = {"email": f"TEST_no2_{uuid.uuid4().hex[:6]}@example.com",
                "password": "x123456", "name": "No"}
        r = s.post(f"{API}/admin/users", json=body, timeout=10)
        assert r.status_code == 403

    def test_non_admin_cannot_delete_user(self, user_account):
        s, _, _, _ = user_account
        r = s.delete(f"{API}/admin/users/{pytest.created_user_id}", timeout=10)
        assert r.status_code == 403

    def test_admin_cannot_delete_self(self, admin):
        s, data = admin
        r = s.delete(f"{API}/admin/users/{data['id']}", timeout=10)
        assert r.status_code == 400

    def test_admin_delete_missing_user(self, admin):
        s, _ = admin
        # Valid ObjectId format but nonexistent
        fake_id = "507f1f77bcf86cd799439011"
        r = s.delete(f"{API}/admin/users/{fake_id}", timeout=10)
        assert r.status_code == 404

    def test_admin_delete_cascades(self, admin):
        s, _ = admin
        # Login as the created user, create a design + favorite + comment + like
        s2 = requests.Session()
        r = s2.post(f"{API}/auth/login", json={
            "email": pytest.created_user_email, "password": pytest.created_user_password
        }, timeout=10)
        assert r.status_code == 200
        tok = s2.cookies.get("access_token")
        s2.headers.update({"Authorization": f"Bearer {tok}"})

        # Create a design as that user (will be pending)
        rd = s2.post(f"{API}/designs", json=_payload(title="TEST ToCascade"), timeout=10)
        assert rd.status_code == 200
        did = rd.json()["id"]
        # Approve so it appears in listings
        s.post(f"{API}/designs/{did}/moderate", params={"action": "approve"}, timeout=10)
        # Favorite + like + comment on admin_design_id
        s2.post(f"{API}/designs/{pytest.admin_design_id}/favorite", timeout=10)
        s2.post(f"{API}/designs/{pytest.admin_design_id}/like", timeout=10)
        rc = s2.post(f"{API}/designs/{pytest.admin_design_id}/comments",
                     json={"text": "TEST cascade comment"}, timeout=10)
        assert rc.status_code == 200

        # Now admin deletes the user
        r = s.delete(f"{API}/admin/users/{pytest.created_user_id}", timeout=10)
        assert r.status_code == 200

        # User should no longer be in admin users list
        r = s.get(f"{API}/admin/users", timeout=10)
        emails = [u["email"] for u in r.json()]
        assert pytest.created_user_email not in emails

        # The user's design should be deleted
        r = requests.get(f"{API}/designs/{did}", timeout=10)
        assert r.status_code == 404

        # User can no longer login
        r = requests.post(f"{API}/auth/login", json={
            "email": pytest.created_user_email, "password": pytest.created_user_password
        }, timeout=10)
        assert r.status_code == 401


# -------- Upload ----------
class TestUpload:
    def test_upload_image(self, admin):
        s, _ = admin
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000a49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = s.post(f"{API}/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text
        assert "path" in r.json()

    def test_upload_rejects_non_image(self, admin):
        s, _ = admin
        files = {"file": ("x.txt", io.BytesIO(b"hello"), "text/plain")}
        r = s.post(f"{API}/upload", files=files, timeout=20)
        assert r.status_code == 400


# -------- Cleanup ----------
class TestCleanup:
    def test_cleanup_designs(self, admin):
        s, _ = admin
        for attr in ("admin_design_id", "paid_design_id", "user_design_id", "multi_design_id"):
            did = getattr(pytest, attr, None)
            if did:
                s.delete(f"{API}/designs/{did}", timeout=10)
