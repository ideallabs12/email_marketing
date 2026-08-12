# Email Marketing Platform — Progress Log

## What we're building
Self-hosted email marketing app (Django + Next.js + PostgreSQL + Celery/Redis), sending emails via Brevo.

---

## 1. Created project folders

```
email_marketing/
├── backend/
├── frontend/
└── docker-compose.yml
```

---

## 2. Set up Django backend

Created virtual environment inside `backend/`:
```powershell
python -m venv venv
```

Activated it (need to do this every time we open a new terminal):
```powershell
venv\Scripts\Activate.ps1
```

Installed packages:
```powershell
pip install django djangorestframework psycopg2-binary celery redis python-decouple
```

Created the Django project:
```powershell
django-admin startproject config .
```

---

## 3. Created Django apps

```powershell
python manage.py startapp contacts
python manage.py startapp campaigns
python manage.py startapp templates
python manage.py startapp tracking
python manage.py startapp core
```

Moved them into an `apps/` folder:
```powershell
mv contacts apps
mv campaigns apps
mv templates apps
mv tracking apps
mv core apps
```

Made `apps/` a proper Python package:
```powershell
New-Item apps\__init__.py -ItemType File
```

Updated each app's `apps.py` name, e.g. `apps/contacts/apps.py`:
```python
name = 'apps.contacts'
```

Registered all apps in `config/settings.py` under `INSTALLED_APPS`:
```python
'apps.contacts',
'apps.campaigns',
'apps.templates',
'apps.tracking',
'apps.core',
```

Checked it worked:
```powershell
python manage.py makemigrations
```
✅ Output: `No changes detected` — apps recognized correctly.

---

## 4. Connected PostgreSQL

Checked Postgres was installed:
```powershell
psql --version
```
✅ PostgreSQL 18.4

Created the database:
```powershell
psql -U postgres
```
```sql
CREATE DATABASE email_marketing;
\q
```

Updated `DATABASES` in `config/settings.py` to use Postgres instead of SQLite.

Ran migrations:
```powershell
python manage.py migrate
```
✅ All default tables created — Django is talking to Postgres successfully.

---

## 5. Moved secrets to `.env`

Goal: keep `SECRET_KEY` and DB password out of `settings.py`, using `python-decouple`.

Steps completed:
- Created `.env` file in `backend/`
- Added values: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- Updated `config/settings.py`:
```python
from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```
- Re-ran `python manage.py migrate` — confirmed still working, reading correctly from `.env`

✅ Note for later: once containerized, `DB_HOST` needs to be the Postgres **service name** (`db`) instead of `localhost` when running inside Docker — handled via `docker-compose.yml` environment overrides, not by editing `.env` again.

---

## 6. Added `.gitignore`

Created `.gitignore` in `backend/` to exclude:
- `.env`
- `venv/`
- `__pycache__/`
- `*.pyc`

⚠️ Still needs actual content added — file currently exists but is empty (0 bytes). Fix before first git commit.

---

## 7. Installed Docker Desktop

Since our app (Django, PostgreSQL, Redis, and later Next.js) needs to run consistently across machines and eventually deploy to a VPS, we're containerizing everything with Docker.

**Steps taken:**
- Downloaded Docker Desktop from https://www.docker.com/products/docker-desktop/
- Chose **AMD64** architecture (standard for Windows PCs/laptops)
- Kept **Linux containers** mode (default) — not Windows containers, since Django/Postgres/Redis all use Linux-based images
- Kept **"Use WSL 2 instead of Hyper-V"** checked during install
- Skipped Docker account sign-in (not required for local development)
- Restarted computer after install
- Opened Docker Desktop and waited for the engine to start

**Verified installation:**
```powershell
docker --version
```
✅ Output: `Docker version 29.6.1, build 8900f1d`

---

## 8. Created `requirements.txt`

Froze installed packages so the Docker image installs the same versions used locally:
```powershell
pip freeze > requirements.txt
```
✅ Created `backend/requirements.txt`

---

## 9. Created `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

---

## 10. Created `docker-compose.yml` (project root)

```yaml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_DB: email_marketing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "email@123"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: always
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    restart: always
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DEBUG: "True"
      SECRET_KEY: "django-insecure-..."
      DB_NAME: email_marketing
      DB_USER: postgres
      DB_PASSWORD: "email@123"
      DB_HOST: db
      DB_PORT: "5432"
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

---

## 11. Built and started the full stack

```powershell
docker compose up --build
```

✅ All images built/pulled successfully
✅ All containers started: `db-1`, `redis-1`, `backend-1`
✅ Django: `Starting development server at http://0.0.0.0:8000/`

---

## 12. Ran migrations inside the container

```powershell
docker compose exec backend python manage.py migrate
```
✅ All 18 migrations applied successfully.

---

## ✅ Phase 1 Complete

- ✅ Django + DRF backend scaffolded
- ✅ Postgres connected (locally and via Docker)
- ✅ Redis running (via Docker)
- ✅ Docker Compose brings up `db`, `redis`, `backend` with one command
- ✅ Migrations applying successfully inside the container
- ✅ Verified Django reachable at `http://localhost:8000`

---

## 13-07-2026 | 11:00

### ✅ Phase 2 Complete: Celery + Docker Services + Next.js Frontend Scaffold

---

### 1. Celery Configuration (Django Backend)

**Files changed:**

- **`backend/config/celery.py`** *(new)*
  - Created the Celery application named `config`.
  - Set `DJANGO_SETTINGS_MODULE` to `config.settings`.
  - Configured `app.config_from_object('django.conf:settings', namespace='CELERY')` so all `CELERY_*` settings are picked up automatically from Django settings.
  - Called `app.autodiscover_tasks()` so task modules in all registered Django apps are loaded automatically.

- **`backend/config/__init__.py`** *(updated)*
  - Imported the Celery app as `celery_app` so that Django loads Celery on startup and `@shared_task` decorators work correctly across all apps.

- **`backend/config/settings.py`** *(updated)*
  - Added `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`, both reading from `.env` via `python-decouple`.
  - Added a `CELERY_BEAT_SCHEDULE` placeholder for the future `daily-send-cap-reset` periodic task (scheduled daily at midnight UTC). This is a scaffold — the actual task logic will be implemented in Phase 4.

- **`backend/.env`** *(updated)*
  - Added:
    ```
    CELERY_BROKER_URL=redis://redis:6379/0
    CELERY_RESULT_BACKEND=redis://redis:6379/0
    ```
  - Redis host is `redis` (the Docker Compose service name), not `localhost`.

---

### 2. Docker Compose — Celery Worker & Beat Services

**File changed:** `docker-compose.yml`

Added two new services:

- **`celery_worker`**
  - Builds from `./backend` Dockerfile (same image as the backend).
  - Command: `celery -A config worker --loglevel=info`
  - Shares the same environment variables as the `backend` service (DB_HOST: `db`, Redis: `redis`).
  - Depends on: `db`, `redis`, `backend`.

- **`celery_beat`**
  - Builds from `./backend` Dockerfile.
  - Command: `celery -A config beat --loglevel=info`
  - Shares the same environment variables.
  - Depends on: `db`, `redis`, `backend`.

---

### 3. Next.js Frontend Scaffold

**Directory:** `frontend/`

- **Scaffolded** using `npx create-next-app@latest` with:
  - TypeScript (`--ts`)
  - Tailwind CSS (`--tailwind`)
  - ESLint (`--eslint`)
  - App Router (`--app`)
  - `src/` directory layout (`--src-dir`)
  - npm as package manager (`--use-npm`)

- **Directory structure created:**
  ```
  frontend/
  ├── src/
  │   ├── app/           (Next.js App Router pages)
  │   ├── components/    (reusable UI components — to be populated)
  │   ├── services/
  │   │   └── apiClient.ts   (API client scaffold)
  │   ├── hooks/         (custom React hooks — to be populated)
  │   └── types/
  │       └── index.ts   (shared TypeScript types)
  ├── Dockerfile
  ├── .dockerignore
  └── package.json
  ```

- **`frontend/src/services/apiClient.ts`** *(new)*
  - Minimal API client scaffold with `get` and `post` helpers.
  - Reads the Django backend URL from `NEXT_PUBLIC_API_URL` env variable, defaulting to `http://localhost:8000`.
  - No real API calls yet — purely structural scaffolding for Phase 3+.

- **`frontend/src/types/index.ts`** *(new)*
  - Placeholder for shared TypeScript types (e.g. `User`). To be expanded as the API is built out.

- **`frontend/Dockerfile`** *(new)*
  - Base image: `node:20-alpine`
  - Copies `package*.json` first, runs `npm install`, then copies source files.
  - CMD: `npm run dev` (development server).

- **`frontend/.dockerignore`** *(new)*
  - Excludes `node_modules` and `.next` from Docker build context (prevents massive slow uploads during builds).

---

### 4. Docker Compose — Frontend Service

**File changed:** `docker-compose.yml`

Added:

```yaml
frontend:
  build: ./frontend
  ports:
    - "3000:3000"
  volumes:
    - ./frontend:/app
    - /app/node_modules   # keeps container node_modules separate from host mount
```

---

### 5. Full Stack Verification

Ran `docker compose down` then `docker compose up --build -d` and confirmed all **6 containers** healthy:

| Container | Image | Status | Port |
|---|---|---|---|
| `db` | postgres:16 | ✅ Up | 5432 |
| `redis` | redis:7 | ✅ Up | 6379 |
| `backend` | email_marketing-backend | ✅ Up | 8000 |
| `celery_worker` | email_marketing-celery_worker | ✅ Up | — |
| `celery_beat` | email_marketing-celery_beat | ✅ Up | — |
| `frontend` | email_marketing-frontend | ✅ Up | 3000 |

**Log confirmations:**
- `celery_worker`: `Connected to redis://redis:6379/0` → `celery@... ready.`
- `celery_beat`: `broker -> redis://redis:6379/0` → `beat: Starting...`
- `frontend`: `▲ Next.js 16.2.10 (Turbopack)` → `✓ Ready in 1124ms`

**Endpoints:**
- Django backend → `http://localhost:8000`
- Next.js frontend → `http://localhost:3000`

---

### ✅ Phase 3 Complete: Django REST API & Webhooks

- Built custom User model (`core.User`).
- Created models, serializers, and ViewSets for `contacts`, `templates`, `campaigns`, and `tracking` apps.
- Configured URL routing via DRF DefaultRouter under `/api/v1/`.
- Implemented `BrevoWebhookView` for real-time tracking events (delivered, opened, clicked, bounced).
- Re-initialized the Postgres database and verified API functionality via the browsable DRF interface.

---

### ✅ Phase 4 Complete: Next.js Frontend Dashboard

---

#### 1. Design System
- **Theme**: Minimalist monochrome (Black `#000000` + White `#ffffff` only).
- Configured CSS variables (`--background`, `--foreground`, `--border`) in `globals.css`.
- Supports auto dark/light mode via `prefers-color-scheme`.

#### 2. Reusable Components (`frontend/src/components/`)

- **`Sidebar.tsx`**: Left-hand navigation with links to Dashboard, Campaigns, Contacts, Templates. Hover effect inverts colors (white text on black).
- **`Card.tsx`**: Bordered container for stat panels and data sections.
- **`Button.tsx`**: Solid black primary button + outline variant, smooth hover opacity transition.

#### 3. Pages Built

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Overview with stat cards, Recent Campaigns list, Quick Links |
| Campaigns | `/campaigns` | Campaign list scaffold with header + New Campaign button |
| Contacts | `/contacts` | Contact list scaffold with Add Contact + Import CSV buttons |
| Templates | `/templates` | Template grid scaffold with empty state |

#### 4. API Client (`frontend/src/services/apiClient.ts`)
- Enhanced with `get`, `post`, `patch`, `delete` methods.
- Reads auth token from `localStorage` and attaches `Authorization: Token <token>` header automatically.
- Added `login()` helper that calls `/api/v1/auth/token/` and stores the returned token.

#### 5. Docker
- Installed `lucide-react` (v1.24.0) inside the container and added to `package.json`.
- Rebuilt the frontend Docker image so `lucide-react` is baked in permanently.
- Frontend verified at `http://localhost:3000`.

---

---

### ✅ Phase 5 Complete: Celery Email Sending via Brevo SMTP

---

#### 1. Credentials & Environment
- Added Brevo SMTP credentials to `backend/.env`:
  - `EMAIL_HOST=smtp-relay.brevo.com`
  - `EMAIL_PORT=587`
  - `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `DEFAULT_FROM_EMAIL`
- Cleaned up `docker-compose.yml` — all backend services now use `env_file: ./backend/.env` instead of repeating env vars inline.

#### 2. Django Email Backend (`config/settings.py`)
- Configured `EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'`
- All SMTP settings read from `.env` via `python-decouple`.

#### 3. Celery Task (`apps/campaigns/tasks.py`) — NEW
- `send_campaign_emails(campaign_id)` task:
  - Fetches the Campaign, Template, and all **subscribed** contacts from the target list.
  - Sends one email per contact using Django's `send_mail()` (which routes through Brevo SMTP).
  - Updates `Campaign.status` to `sent` and `Campaign.sent_at` timestamp on completion.
  - Creates/updates a `CampaignPerformance` record with `total_sent` count.
  - Logs successes and failures per contact.
  - Configured with `max_retries=3` for reliability.

#### 4. Campaign Send Endpoint (`apps/campaigns/views.py`) — UPDATED
- `POST /api/v1/campaigns/{id}/send/` now:
  - Validates campaign is in `draft` or `failed` state before sending.
  - Sets status to `sending` immediately.
  - Calls `send_campaign_emails.delay(campaign.id)` to queue the Celery task asynchronously.

#### 5. Verification
- Celery worker confirmed auto-discovered the new task:

  ```
  [tasks]
    . apps.campaigns.tasks.send_campaign_emails
  celery@... ready.
  ```

---

### ✅ Phase 6 Complete: Core Features & User Workflows

---

#### 1. Speaker Templates Loading & Live Preview
- **WTLS 2027 invitation template** HTML designed and loaded into the DB via a new `python manage.py load_templates` command.
- Personalized replacements (`{{ first_name }}`, `{{ email }}`) handled dynamically in `campaigns/tasks.py`.
- **Live Preview iframe** added to the template edit screen (`/templates/[id]/edit`) rendering template updates instantly on keypress.

#### 2. Authentication & Protected Routes
- Next.js login page built at `/login` styling matching the minimalist monochrome.
- Cookie-based authentication implemented via `apiClient.ts` (`auth_token` cookie).
- Next.js `middleware.ts` created to intercept routes and redirect unauthenticated users to `/login`.
- `AppShell.tsx` hides sidebar layout on the login screen.

#### 3. Dashboard Live Stats
- Overview counts (contacts, campaigns, templates, open rate) linked to live backend values.
- Real-time display of recent campaigns showing their statuses.

#### 4. Contacts CRUD & CSV Verification
- Manual Contact/List creation modals built.
- **CSV Uploader** built with list association.
- **Strict Column Validation**: Backend validates CSV headers against `email`, `first_name`, `last_name`, `is_subscribed`. Mismatch errors or missing `email` columns are reported in the UI before any record is touched.

#### 5. Campaigns & Asynchronous Sending
- Creation form for campaigns (templates/lists association).
- Trigger sending async task directly from UI.
- **Live Sending Status Polling**: The page auto-detects `sending` campaigns and polls the backend every 3 seconds to update statuses live.

---

### What's Next (Phase 7)
- **Daily Send-Cap Reset**: Implement the midnight Celery Beat task in `core/tasks.py` if custom rate limiting is required.

---

### Recent Template Adjustments
- **Template ID 2 Restructuring (WTLS 2027 Speaker Invitation)**:
  - **Hero/Quote Image Blending**: Upgraded the quote block layout to use `mail_footer.png` as a full-section background image spanning the whole block. Adjusted the quote text color to white (`#FFFFFF`) to contrast perfectly against the dark blue building silhouette, ensuring high visibility while looking organically blended.
  - **CTA Removal**: Cleanly stripped out the "Reply to this email" call-to-action button and its helper sub-text to drastically shorten the template.
  - **Compact Spacing & Optimization**: Systematically reduced redundant spacing across the entire layout. Padding in the Hero, Greeting, Event Cards, Quote block, and Footer was significantly reduced (often halved) to create a much tighter, shorter, and highly scannable email layout, which plays exceptionally well with mobile responsiveness.
  - **Structure Restoration**: Addressed and resolved table nesting issues (stray closing tags) caused by automated string-replacement, fully restoring the integrity of the signature and footer grids.
