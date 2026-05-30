# Dezi Market — Digital Templates Marketplace

## Original Problem Statement
Создай современный адаптивный веб-сайт НА РУССКОМ интернет-магазина цифровых шаблонов в стиле Behance и Pinterest для дизайнеров. Сайт предназначен для поиска и покупки UI Kit, Mockups, Icons, Templates и Illustrations. Пользователи могут публиковать свои дизайны → модерация → публикация. Админка может редактировать любую карточку (фото, описание, название и т.д.), создавать карточки без проверки. Сайт на русском языке.

## Architecture
- **Frontend**: React 19 + Tailwind + Shadcn UI, Pinterest masonry, glassmorphic header, light/dark theme.
- **Backend**: FastAPI + MongoDB (motor). JWT cookies (httpOnly) + Bearer fallback. Role-based: user/moderator/admin.
- **Storage**: Local Storage / MongoDB GridFS (Локальное хранилище бэкенда для превью-изображений и кастомных дизайнов).
- **Payments**: MOCKED — `/designs/{id}/purchase` writes a purchase record without real money.

## User Personas
- **Visitor**: discovers digital design resources via search & filters.
- **Creator (user)**: uploads designs → goes to pending → moderator approves.
- **Moderator**: reviews pending queue, can edit any design, approve/reject.
- **Admin**: everything moderator can do + manage user roles.

## Core Requirements (Static)
- Russian UI.
- Light/dark theme toggle.
- Header: logo, search, nav (Каталог, Категории, В тренде, Избранное), avatar.
- Hero with big search.
- Pinterest masonry grid with hover overlay (Like/Save/Download).
- Sidebar filters: Style, Category, Price, Sort by.
- Product detail: gallery + side panel + comments + related.
- Profile: works, purchases, settings (avatar upload).
- Upload form with image uploads.
- Admin panel: pending queue + approved + rejected + users management.
- Edit-any-design dialog with image replacement.

## Implemented (2026-05-30)
- ✅ JWT auth (register/login/logout/refresh/me) with httpOnly cookies, bcrypt.
- ✅ Admin + moderator seeded.
- ✅ CRUD designs with `status` workflow (pending/approved/rejected).
- ✅ Author auto-publish for admin/moderator.
- ✅ Image upload via Local Storage / MongoDB + serving via /api/files/{path}.
- ✅ Likes, favorites, comments, downloads, purchase (mock).
- ✅ Filters (style/category/price), sort (popular/newest/rating/downloads), search.
- ✅ Trending endpoint.
- ✅ Admin moderation flow + user-role management.
- ✅ Edit-any-design dialog (admin can change images, status).
- ✅ Profile tabs: works / purchases / settings (with avatar upload).
- ✅ Light/dark theme switching with persistence.
- ✅ Fully responsive (header + sidebar + grid).

## Mocked / Incomplete
- 🟡 Purchase flow is MOCKED — no real payment gateway integrated.
- 🟡 Rating widget UI deferred (rating numbers display but no submit-rating UI yet).

## P0/P1 Backlog
- P1: Real rating UI (1-5 stars submit).
- P1: Email notifications on moderation decisions.
- P2: Stripe integration for paid downloads.
- P2: Author public page (designs by author).
- P2: Search suggestions / typeahead.

## Test Credentials
See `/app/memory/test_credentials.md`.
