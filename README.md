# OBE Management System

Standalone web app for **Outcome-Based Education** course offerings: Course Description, Opening Report, Assessment Tools, Students & Marks, Closing Report, and CO/PO/PSO attainment.

It has its own UI, APIs, authentication, and database. It does not share data with any other OBE project.

```
React (Vite + Tailwind)  →  Django REST + JWT  →  PostgreSQL
```

## Roles

| Role | Access |
|------|--------|
| **ADMIN** | All courses, catalog, programmes, user management |
| **FACULTY** | Only courses they own (login account) |

Public signup creates the **first administrator only**. After that, faculty logins are created by an admin on **Users**.

A course has two people:

- **Login owner** (`faculty`) — who can edit the offering (always the signed-in faculty)
- **Faculty name** (`teaching_faculty`) — name printed on CD / OR / AT / CR documents
- **Course coordinator** — name printed as coordinator

Offerings are unique per **`(course_code, academic year, login faculty, programme)`**. The same NBA subject can exist as B.Tech CSE and B.Tech IT for the same teacher in one session.

## What the app does

### Admin: Catalog
Sessions (e.g. **2026 Odd** / **2026 Even**), NBA subjects, and the faculty directory (Sector-62 / Sector-128). Seed from Excel with `python manage.py seed_catalog`.

### Admin: Programs
PO/PSO catalogues for **B.Tech (CSE)**, **B.Tech (IT)**, **M.Tech (CSE)**, **M.Tech (AIDS)**. When a faculty picks an NBA subject, PO/PSO counts fill from the matching programme (still editable). If NBA lists the subject as CSE and IT, they must choose CSE or IT before save.

### Courses / Lab Courses
Create an offering: session → NBA subject → programme (if needed) → teaching faculty and coordinator. Theory subjects live under **Courses**; names that contain `LAB` live under **Lab Courses**.

### Course Description
Syllabus for this offering: header, COs and Bloom levels, lecture-wise breakup, evaluation, PBL, books, CO–PO–PSO mapping (level 0–3 + justification). Other documents **read** this data.

### Opening Report
Synced from Course Description. Faculty set targets, previous-year CO attainment, teaching methods, weak/bright strategies. History is scoped to **this faculty’s** offering of the subject, not every teacher of the same NBA code.

### Assessment Tools
Question ↔ CO tools for T1/T2/T3 (theory) or Mid/End/D2D (lab). Stored per offering.

### Students & Marks
Shared roster for T1, T2, T3, TA, and exit survey (labs: Mid, End, D2D, feedback).

- Add students, paste `enrol, name`, or **Upload Excel** (`.xlsx` / `.xls` / `.csv`)
- Enter marks in the grid or upload Excel per exam tab
- **Attainment** sub-tab: Direct / Indirect / Final, charts, PO/PSO

Formulas:

- Direct = 60% tests + 20% assignment
- Indirect = 20% course-exit feedback
- Final = direct + indirect; level 0–3 from percentage
- PO/PSO from CO attainment × mapping strength

Roster/marks Excel is parsed in the **frontend** (`xlsx`). Catalog seed Excel uses backend `openpyxl`.

### Closing Report
End-of-course report with current CO/PO figures, grade distribution, and previous-year snapshots (per faculty + subject + session).

### Dashboard
Course counts, pending attainment, and level distribution for the signed-in user (or all courses for admin).

## Folder structure

```
OBE-MANAGEMENT-SYSTEM/
├── backend/                  # Django API (Render)
│   ├── build.sh              # pip + collectstatic + migrate
│   ├── Procfile              # gunicorn (binds $PORT)
│   ├── .env.example
│   ├── requirements.txt
│   └── obe_backend/          # settings, URLs, dashboard
├── frontend/                 # Vite React (Vercel)
│   ├── vercel.json           # SPA rewrites
│   └── .env.example
├── render.yaml               # optional Render Blueprint
├── data/                     # optional Excel for seed_catalog
└── README.md
```

## API (prefix `/api`)

| Area | Path |
|------|------|
| Auth / users | `/auth/` (login, refresh, logout, signup, me, users) |
| Dashboard | `/dashboard/` |
| Courses, COs, mappings | `/courses/` |
| Sessions / NBA catalog / faculty directory | `/courses/sessions/`, `/courses/catalog/`, `/courses/faculty-directory/` |
| Programmes | `/programs/` |
| Opening report | `/opening-reports/<course_id>/` |
| Assessment tools | `/assessment-tools/<course_id>/` |
| Closing report | `/closing-reports/<course_id>/` |
| Assessments, students, marks | `/assessments/` |
| Bulk roster | `POST /assessments/students/bulk/` |
| CO/PO attainment | `/attainments/` |
| Historical CO | `/attainments/historical/?course=&academic_year=` |

Protected routes use JWT. Access tokens last **15 minutes**; the frontend refreshes with the refresh token. `POST /auth/logout/` blacklists the refresh token.

## Run locally (another computer)

Needs **Python 3.11+**, **Node 18+**, **Git**, and a **PostgreSQL** URL (Neon is fine).

```bash
git clone https://github.com/soaib-2501/OBE-MANAGEMENT-SYSTEM.git
cd OBE-MANAGEMENT-SYSTEM
```

### Backend — terminal 1

```bash
cd backend
python -m venv venv
venv\Scripts\activate              # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env
```

Edit `backend/.env`:

- `SECRET_KEY` — any long random string (required)
- `DEBUG=true`
- `DATABASE_URL` — Neon/Postgres with `?sslmode=require`
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

```bash
python manage.py migrate
python manage.py runserver         # http://localhost:8000
```

`GET http://localhost:8000/` should return `{"status":"ok",...}`.

Optional catalog seed (`data/NBA codes-ODD 2026.xlsx` and `data/data.xlsx`):

```bash
python manage.py seed_catalog --year 2026 --semester ODD
```

### Frontend — terminal 2

```bash
cd frontend
npm install
copy .env.example .env             # macOS/Linux: cp .env.example .env
npm run dev                        # http://localhost:5173
```

`frontend/.env` must be `VITE_API_BASE_URL=http://localhost:8000/api`.

Open **http://localhost:5173**. If no admin exists, use **Create the administrator**. Add faculty from **Users**.

## Typical course workflow

1. **Admin → Catalog** — session, NBA subjects, faculty directory (`seed_catalog` if you have the Excel files).
2. **Admin → Programs** — confirm PO/PSO text for CSE / IT / M.Tech.
3. **Courses** or **Lab Courses** — session, NBA subject, CSE vs IT if asked, **Faculty name (on documents)**, coordinator; Create.
4. **Course Description** — COs, mapping, syllabus; Save; Print.
5. **Opening Report** — targets and strategies; Save; Print.
6. **Assessment Tools** — questions ↔ COs; Save; Print.
7. **Students & Marks** — roster and marks (or Excel); Attainment tab; Recalculate.
8. **Closing Report** — review synced figures; Save; Print.

Print uses the browser dialog (A4). Choose **Save as PDF** as the destination.

## Environment variables

**Backend** (`backend/.env` locally, Render dashboard in production):

| Variable | Local | Production |
|----------|--------|------------|
| `SECRET_KEY` | long random string | generate on Render |
| `DEBUG` | `true` | `false` |
| `DATABASE_URL` | Neon URL + `sslmode=require` | same Neon (or Render Postgres) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | `.onrender.com` plus your custom domain |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | exact Vercel URL, `https://….vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | same as CORS | Vercel URL + `https://….onrender.com` |

Do not commit `.env`. `USE_SQLITE` is not used; the app always reads `DATABASE_URL`.

**Frontend** (`frontend/.env` locally, Vercel project env in production):

```
VITE_API_BASE_URL=http://localhost:8000/api
```

Production:

```
VITE_API_BASE_URL=https://<your-backend>.onrender.com/api
```

Vite **inlines this at build time**. Changing it on Vercel requires a **redeploy**. If it is missing, the live UI calls `localhost:8000` and login will fail.

---

## Production (Neon + Render + Vercel)

```
Browser  →  Vercel (React / dist)  →  Render (Django + Gunicorn)  →  Neon Postgres
```

Deploy **database → backend → frontend**, in that order.

### 1. Database (Neon)

1. Create a Neon project and copy the connection string.
2. Use the pooled URL with `sslmode=require`.

### 2. Backend (Render Web Service)

Connect the GitHub repo.

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Runtime | Python 3.11 |
| Build command | `bash build.sh` |
| Start command | `gunicorn obe_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |

Environment:

- `DEBUG` = `false`
- `SECRET_KEY` = generate
- `DATABASE_URL` = Neon URL
- `ALLOWED_HOSTS` = `.onrender.com`
- `CORS_ALLOWED_ORIGINS` = `https://<your-vercel-app>.vercel.app` (add after Vercel exists; preview URLs are also allowed by regex)
- `CSRF_TRUSTED_ORIGINS` = same Vercel origin plus `https://<your-backend>.onrender.com`

`build.sh` runs `pip install`, `collectstatic`, and `migrate`. Confirm `GET https://<backend>.onrender.com/` returns `{"status":"ok"}`.

A Blueprint is in `render.yaml` if you prefer **New → Blueprint**. You still paste `DATABASE_URL` and `CORS_ALLOWED_ORIGINS`.

### 3. Frontend (Vercel)

| Setting | Value |
|---------|--------|
| Root directory | `frontend` |
| Framework | Vite |
| Build | `npm run build` |
| Output | `dist` |

Environment (Production **and** Preview):

- `VITE_API_BASE_URL` = `https://<your-backend>.onrender.com/api`

`vercel.json` rewrites all routes to `index.html` so React Router works.

Then put the real Vercel URL into Render `CORS_ALLOWED_ORIGINS` and redeploy the backend if needed.

### After each `git push` to `main`

- **Vercel** rebuilds `frontend/` (needs `VITE_API_BASE_URL` already set).
- **Render** rebuilds `backend/` and runs migrations.

New Django fields: run `python manage.py makemigrations` **locally**, commit the migration files, then push. Do not change secrets in git; edit them on Render / Vercel and redeploy.

### If production login fails

1. Open the built site, DevTools → Network: API host must be Render, not `localhost`.
2. `CORS_ALLOWED_ORIGINS` must match the Vercel origin exactly (`https://…`, no trailing slash).
3. Neon must allow the Render region (connection string + SSL).
4. `SECRET_KEY` must be set or the backend will not boot.

