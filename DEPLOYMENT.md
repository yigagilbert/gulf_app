# Docker Deployment Guide

This project is packaged as two images:

- `yigagilbert/gulf-consultant-backend`
- `yigagilbert/gulf-consultant-frontend`

The frontend is a separate production image. It is a static React build served by NGINX inside the container, and it should point to:

```text
https://api.gulfconsultantsug.com/api
```

Recommended production routing with NGINX Proxy Manager:

- `gulfconsultantsug.com` -> frontend container on port `3000`
- `www.gulfconsultantsug.com` -> frontend container on port `3000`
- `api.gulfconsultantsug.com` -> backend container on port `8000`

## 1. Build and Push From Your Local Machine

Log in to Docker Hub first:

```bash
docker login
```

Build and push both images:

```bash
./scripts/docker-build-push.sh latest
```

Build and push a versioned release:

```bash
./scripts/docker-build-push.sh v1
```

The frontend build uses this API base URL by default:

```text
https://api.gulfconsultantsug.com/api
```

If you want a different API URL while building:

```bash
FRONTEND_API_BASE_URL=https://api.gulfconsultantsug.com/api ./scripts/docker-build-push.sh v1
```

## 2. Prepare the VM

Copy these files to the server:

- [docker-compose.vm.yml](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/docker-compose.vm.yml)
- [.env.backend.example](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/.env.backend.example)
- [.env.vm.example](/Users/sunbird/Documents/Workshop/Gulf/gulf_consultant/.env.vm.example)

On the VM:

```bash
cp .env.backend.example .env.backend
cp .env.vm.example .env.vm
```

Create the shared Docker network used by NGINX Proxy Manager and the app containers if it does not already exist:

```bash
docker network create proxy
```

If your NGINX Proxy Manager stack already uses another network name, set that name in `.env.vm`:

```env
PROXY_NETWORK=your-existing-proxy-network
```

Update `.env.backend` with real values:

```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
ENVIRONMENT=production
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-this-temporary-admin-password
CORS_ORIGINS=https://gulfconsultantsug.com,https://www.gulfconsultantsug.com
STORAGE_PROVIDER=local
UPLOAD_DIR=/app/uploads
```

If you want Cloudflare R2 for private file storage, put the R2 values in `.env.backend` as well:

```env
STORAGE_PROVIDER=r2
CLOUDFLARE_R2_BUCKET=gulfconsultant
CLOUDFLARE_R2_PREFIX=gulfconsultant
CLOUDFLARE_R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://pub-<id>.r2.dev
```

Important:

- Put your production database URL in `.env.backend`
- If you want versioned images instead of `latest`, update `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `.env.vm`
- Keep Cloudflare R2 secrets in `.env.backend`, not `.env.vm`

## 3. Pull and Start on the VM

```bash
docker compose --env-file .env.vm -f docker-compose.vm.yml pull
docker compose --env-file .env.vm -f docker-compose.vm.yml up -d
```

To update later:

```bash
docker compose --env-file .env.vm -f docker-compose.vm.yml pull
docker compose --env-file .env.vm -f docker-compose.vm.yml up -d
```

## 4. NGINX Proxy Manager Setup

This setup does not publish backend or frontend ports to the VM.
Both containers stay private inside Docker and are only reachable through the shared proxy network.

Create 3 proxy hosts:

### Frontend

- Domain: `gulfconsultantsug.com`
- Forward Hostname/IP: `gulf-frontend`
- Forward Port: `80`

### Frontend WWW

- Domain: `www.gulfconsultantsug.com`
- Forward Hostname/IP: `gulf-frontend`
- Forward Port: `80`

### Backend API

- Domain: `api.gulfconsultantsug.com`
- Forward Hostname/IP: `gulf-backend`
- Forward Port: `8000`

Enable SSL for all three domains in NGINX Proxy Manager.

Important:

- NGINX Proxy Manager must be attached to the same Docker network as these containers
- You should not use host port publishing for the app containers in this setup

## 5. Useful Checks

Backend health:

```bash
curl https://api.gulfconsultantsug.com/api/health
```

Container status:

```bash
docker compose --env-file .env.vm -f docker-compose.vm.yml ps
```

Backend logs:

```bash
docker compose --env-file .env.vm -f docker-compose.vm.yml logs -f backend
```

Frontend logs:

```bash
docker compose --env-file .env.vm -f docker-compose.vm.yml logs -f frontend
```

## Notes

- Uploaded files are stored in the `backend_uploads` Docker volume
- If `STORAGE_PROVIDER=cloudflare_r2`, uploaded files go to your R2 bucket instead of the local Docker volume
- The VM no longer needs a local PostgreSQL container when using a managed database like Neon
- The backend seeds the default super admin on startup if the configured email does not exist yet
- The frontend is a static build served by NGINX inside the container
- The frontend image contains only public build-time configuration such as `REACT_APP_API_BASE_URL`, never backend secrets
