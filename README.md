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
obe-part2/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── obe_backend/          # settings, URLs, dashboard
│   ├── users/                # JWT auth, ADMIN | FACULTY
│   ├── courses/              # sessions, NBA catalog, faculty directory, Course, COs, mapping
│   ├── programs/             # Programme PO/PSO catalogues
│   ├── assessments/          # exams, roster, marks
│   ├── attainments/          # CO/PO calculation + historical CO (per faculty)
│   ├── opening_reports/
│   ├── assessment_tools/
│   └── closing_reports/
├── frontend/
│   └── src/
│       ├── api/client.js     # axios + JWT refresh queue
│       ├── context/AuthContext.jsx
│       ├── pages/            # Login, Courses, Lab Courses, CD, OR, AT, Marks, CR, admin
│       └── components/
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

## First-time setup

### 1. Database
PostgreSQL (Neon or local). Point `DATABASE_URL` at a dedicated database.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate              # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # set SECRET_KEY and DATABASE_URL
python manage.py migrate
python manage.py runserver         # http://localhost:8000
```

`SECRET_KEY` is required (no default). Set `DEBUG=true` only for local development.

Optional catalog seed (needs `data/NBA codes-ODD 2026.xlsx` and `data/data.xlsx`):

```bash
python manage.py seed_catalog --year 2026 --semester ODD
```

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env             # default: http://localhost:8000/api
npm run dev                        # http://localhost:5173
```

Open `http://localhost:5173`. If no admin exists, **Create the administrator** on the login page. Add faculty from **Users**.

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

## Environment

**Backend** (`backend/.env`, see `.env.example`):

- `SECRET_KEY` — required in production
- `DEBUG` — `true` locally, `false` in production
- `DATABASE_URL` — Neon PostgreSQL connection string
- `ALLOWED_HOSTS` — e.g. `.onrender.com,localhost,127.0.0.1`
- `CORS_ALLOWED_ORIGINS` — your Vercel URL, e.g. `https://obe-management-system.vercel.app`
- `PYTHON_VERSION` — `3.11.9`

**Frontend** (`frontend/.env`):

```env
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

---

## Production Deployment (Render + Vercel + Neon)

The application is architected for zero-maintenance cloud hosting:

```
[Users / Browsers]
        │
        ├── (UI Requests) ─────────► [Vercel] Vite React Frontend (Edge CDN)
        │                                  │
        │                                  ▼ (API Requests via Axios)
        └── (API Endpoints) ───────► [Render] Django 5 + Gunicorn + WhiteNoise
                                           │
                                           ▼ (PostgreSQL Connection)
                                     [Neon.tech] Serverless PostgreSQL
```

### 1. Backend (Render Web Service)
- **Repo Root Directory**: `backend`
- **Python Version**: `3.11.9` (via `.python-version` or `PYTHON_VERSION` env var)
- **Build Command**: `bash build.sh` (executes `pip install`, `collectstatic`, and `migrate`)
- **Start Command**: `gunicorn obe_backend.wsgi:application`
- **Environment Variables**:
  - `DEBUG`: `false`
  - `SECRET_KEY`: *(strong random string)*
  - `DATABASE_URL`: `postgresql://neondb_owner:...`
  - `ALLOWED_HOSTS`: `.onrender.com,localhost,127.0.0.1`
  - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

### 2. Frontend (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://<your-render-backend>.onrender.com/api`

---

## How Code Changes Get Updated (CI/CD Workflow)

Both **Render** and **Vercel** are connected directly to your GitHub repository (`main` branch). Updates are fully automated:

### 1. The Standard Update Cycle
Whenever you make changes to your code locally:

```bash
# 1. Stage modified files
git add .

# 2. Commit your changes
git commit -m "Describe what you changed or fixed"

# 3. Push to GitHub
git push origin main
```

### 2. What Happens Automatically on `git push`:
1. **Frontend (Vercel)**:
   - Vercel detects changes in the `frontend/` folder.
   - It runs `npm run build`, creates a new deployment, and swaps traffic to the new version seamlessly with **zero downtime**.
   - Your live URL is updated in ~20–30 seconds.

2. **Backend (Render)**:
   - Render detects changes in the `backend/` folder.
   - It pulls the new commit and runs `bash build.sh`:
     - Installs any new dependencies from `requirements.txt`.
     - Collects updated static assets (`collectstatic`).
     - Applies any new database migrations (`migrate`).
   - Restarts Gunicorn workers smoothly without dropping active traffic.

### 3. Special Scenarios:
- **Adding new Database Models/Fields**:
  Always create your migration files locally before pushing:
  ```bash
  cd backend
  python manage.py makemigrations
  git add .
  git commit -m "Add new database migrations"
  git push origin main
  ```
  *(Render will automatically run `python manage.py migrate` during the build!)*

- **Changing Environment Variables**:
  - If you change a variable in `.env` (like adding a new secret or changing CORS):
  - Go to your **Render Dashboard** → **Environment** (or **Vercel Project Settings** → **Environment Variables**).
  - Update the variable there and save. Both platforms will trigger a fast redeploy with the new settings.

