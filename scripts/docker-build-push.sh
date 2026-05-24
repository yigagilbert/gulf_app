#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-latest}"
DOCKER_USER="${DOCKER_USER:-yigagilbert}"
FRONTEND_API_BASE_URL="${FRONTEND_API_BASE_URL:-https://api.gulfconsultantsug.com/api}"

BACKEND_IMAGE="${DOCKER_USER}/gulf-consultant-backend:${TAG}"
FRONTEND_IMAGE="${DOCKER_USER}/gulf-consultant-frontend:${TAG}"

echo "Building backend image: ${BACKEND_IMAGE}"
docker build -f Dockerfile.backend -t "${BACKEND_IMAGE}" .

echo "Building frontend image: ${FRONTEND_IMAGE}"
docker build \
  -f frontend/Dockerfile \
  --build-arg REACT_APP_API_BASE_URL="${FRONTEND_API_BASE_URL}" \
  -t "${FRONTEND_IMAGE}" \
  ./frontend

echo "Pushing backend image"
docker push "${BACKEND_IMAGE}"

echo "Pushing frontend image"
docker push "${FRONTEND_IMAGE}"

echo "Done."
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"
