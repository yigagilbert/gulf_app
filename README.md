# Gulf Consultant

Gulf Consultant is a full-stack client intake and job placement platform built for managing candidate onboarding, document collection, job opportunities, and internal admin workflows.

The repository includes:

- A `FastAPI` backend for authentication, profiles, jobs, document handling, and admin operations
- A `React` frontend for client and admin dashboards
- Local file storage support for uploaded documents, with optional Cloudflare R2 configuration
- A simple local development path using SQLite, with PostgreSQL support through `DATABASE_URL`

## Tech Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT-based authentication
- SQLite by default for local development
- PostgreSQL when `DATABASE_URL` is configured

### Frontend

- React
- React Router
- Tailwind CSS
- Lucide React

## Project Structure

```text
.
├── app/                  # Backend application code
│   ├── routes/           # API route modules
│   ├── database.py       # SQLAlchemy engine and session setup
│   ├── models.py         # Database models
│   ├── schemas.py        # Request/response schemas
│   └── storage.py        # Local/R2 storage helpers
├── frontend/             # React application
│   ├── public/
│   └── src/
├── uploads/              # Local uploaded files in development
├── main.py               # FastAPI entry point
├── requirements.txt      # Python dependencies
└── .env.example          # Backend environment template
```

## What the App Supports

- User registration and login
- Client profile management
- Document upload and review workflows
- Job listing and admin job management
- Admin dashboards for client operations and tracking
- Local file serving for uploaded assets in development

## Local Development Setup

### 1. Backend setup

Create and activate a virtual environment, then install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create your backend environment file from the example:

```bash
cp .env.example .env
```

At minimum, review and update these values in `.env`:

```env
SECRET_KEY=replace-this-with-a-strong-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-me
```

Database behavior:

- If `DATABASE_URL` is not set, the app uses a local SQLite database at `jobplacement.db`
- If `DATABASE_URL` is set, the backend connects to that database instead
- Tables are created automatically on startup

Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Create a frontend environment file:

```bash
cp .env.example .env
```

Start the frontend:

```bash
npm start
```

## Local URLs

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

## Environment Variables

### Backend

Common backend settings:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | Optional database connection string. Falls back to SQLite when omitted. |
| `ENVIRONMENT` | Recommended | Use `production` in deployed environments to enable stricter startup validation. |
| `SECRET_KEY` | Yes | JWT signing secret. |
| `ALGORITHM` | Yes | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Yes | Access token lifetime. |
| `STORAGE_PROVIDER` | Recommended | Use `local` for development or `r2` for Cloudflare R2 in deployment. |
| `UPLOAD_DIR` | Recommended | Local upload directory when using local storage. |
| `DEFAULT_ADMIN_EMAIL` | Optional | Creates a default admin on startup when paired with a password. |
| `DEFAULT_ADMIN_PASSWORD` | Optional | Password for the startup-created admin user. |

Optional Cloudflare R2 settings:

| Variable | Purpose |
| --- | --- |
| `CLOUDFLARE_R2_BUCKET` | Target bucket name |
| `CLOUDFLARE_R2_PREFIX` | Object key prefix |
| `CLOUDFLARE_R2_ENDPOINT_URL` | R2 endpoint URL |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Secret key |
| `CLOUDFLARE_R2_PUBLIC_BASE_URL` | Public asset base URL |

For Docker deployment, keep the R2 variables in the backend env file used by the API container, not in the image-tag env file for compose.

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `REACT_APP_API_BASE_URL` | Yes | Base URL for the backend API, for example `http://localhost:8000/api`. |

## Deployment Notes

- Set a production `DATABASE_URL` if you do not want SQLite
- Use a strong `SECRET_KEY`
- Do not commit live `.env` files or uploaded documents
- If you use cloud object storage, configure the R2 variables before deploy
- Review allowed CORS origins in [main.py](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/main.py) for your production frontend domains

## Docker Deployment

This repo includes production Docker packaging for:

- Backend image: `yigagilbert/gulf-consultant-backend`
- Frontend image: `yigagilbert/gulf-consultant-frontend`

Key files:

- [Dockerfile.backend](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/Dockerfile.backend)
- [frontend/Dockerfile](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/frontend/Dockerfile)
- [docker-compose.vm.yml](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/docker-compose.vm.yml)
- [.env.backend.example](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/.env.backend.example)
- [.env.vm.example](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/.env.vm.example)
- [DEPLOYMENT.md](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/DEPLOYMENT.md)

Build and push both images:

```bash
./scripts/docker-build-push.sh latest
```

The frontend production build targets:

```text
https://api.gulfconsultantsug.com/api
```

In the recommended VM setup, neither frontend nor backend ports are published on the host. Both containers stay on a shared Docker proxy network and are reached through NGINX Proxy Manager by container name.

For the full VM + NGINX Proxy Manager setup, use [DEPLOYMENT.md](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/DEPLOYMENT.md).

## Notes for Contributors

- `.gitignore` is configured to exclude local secrets, virtual environments, uploads, frontend build output, and local databases
- `.env.example` should stay committed as the source-of-truth template
- If a sensitive file was committed before the ignore rules were added, it must be removed from Git tracking separately
