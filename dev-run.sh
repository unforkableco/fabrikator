#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DB_CONTAINER="fabrikator-db"
DB_VOLUME="fabrikator_pgdata"
DB_IMAGE="postgres:15-alpine"
DB_PORT="5432"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="fabrikator"

# Redis (for job queues)
REDIS_CONTAINER="fabrikator-redis"
REDIS_IMAGE="redis:7-alpine"
REDIS_PORT="6379"

BE_PID=""
FE_PID=""
WK_PID=""

log() { echo -e "[dev-run] $*"; }

detect_frontend_dir() {
  if [[ -f "$ROOT_DIR/frontend/package.json" ]]; then
    FRONTEND_DIR="$ROOT_DIR/frontend"
    log "Frontend detected at $FRONTEND_DIR"
  elif [[ -f "$ROOT_DIR/package.json" ]]; then
    FRONTEND_DIR="$ROOT_DIR"
    log "Frontend detected at repo root ($FRONTEND_DIR)"
  else
    log "ERROR: Could not find frontend package.json in $ROOT_DIR or $ROOT_DIR/frontend"
    exit 1
  fi
}

start_db() {
  if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log "Database container already running: ${DB_CONTAINER}"
    return
  fi
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log "Creating DB volume (${DB_VOLUME}) if missing..."
    docker volume inspect "${DB_VOLUME}" >/dev/null 2>&1 || docker volume create "${DB_VOLUME}" >/dev/null
    log "Starting Postgres container ${DB_CONTAINER}..."
    docker run -d --name "${DB_CONTAINER}" \
      -e POSTGRES_USER="${DB_USER}" \
      -e POSTGRES_PASSWORD="${DB_PASS}" \
      -e POSTGRES_DB="${DB_NAME}" \
      -p ${DB_PORT}:5432 \
      -v ${DB_VOLUME}:/var/lib/postgresql/data \
      "${DB_IMAGE}" >/dev/null
  else
    log "Starting existing DB container ${DB_CONTAINER}..."
    docker start "${DB_CONTAINER}" >/dev/null
  fi
}

start_redis() {
  if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    log "Redis container already running: ${REDIS_CONTAINER}"
    return
  fi
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    log "Starting Redis container ${REDIS_CONTAINER}..."
    docker run -d --name "${REDIS_CONTAINER}" \
      -p ${REDIS_PORT}:6379 \
      ${REDIS_IMAGE} >/dev/null
  else
    log "Starting existing Redis container ${REDIS_CONTAINER}..."
    docker start "${REDIS_CONTAINER}" >/dev/null
  fi
}

stop_redis() {
  if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    log "Stopping Redis container ${REDIS_CONTAINER}..."
    docker stop "${REDIS_CONTAINER}" >/dev/null || true
  fi
}

stop_db() {
  if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log "Stopping DB container ${DB_CONTAINER}..."
    docker stop "${DB_CONTAINER}" >/dev/null || true
  fi
}

prep_backend() {
  pushd "$BACKEND_DIR" >/dev/null
  if [[ ! -f .env ]]; then
    log "Creating backend/.env"
    cp -n env.example .env 2>/dev/null || true
  fi
  # Ensure DATABASE_URL points to local docker db if undefined
  if ! grep -q '^DATABASE_URL=' .env; then
    echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}?schema=public" >> .env
  fi
  log "Installing backend deps..."
  # Try clean install; if lockfile is out of sync, fall back to npm install to update it
  npm ci || npm install --no-audit --no-fund
  log "Prisma sync..."
  npx prisma db push
  npx prisma generate
  popd >/dev/null
}

prep_frontend() {
  detect_frontend_dir
  pushd "$FRONTEND_DIR" >/dev/null
  if [[ -f .env.example && ! -f .env ]]; then
    log "Creating frontend/.env"
    cp -n .env.example .env || true
  fi
  # Ensure API URL
  if [[ -f .env ]] && ! grep -q '^REACT_APP_API_URL=' .env; then
    echo "REACT_APP_API_URL=http://localhost:3001/api" >> .env
  fi
  log "Installing frontend deps..."
  npm ci
  popd >/dev/null
}

start_backend() {
  pushd "$BACKEND_DIR" >/dev/null
  log "Starting backend (nodemon)..."
  npm run dev &
  BE_PID=$!
  popd >/dev/null
}

start_frontend() {
  detect_frontend_dir
  pushd "$FRONTEND_DIR" >/dev/null
  log "Starting frontend (npm start)..."
  npm start &
  FE_PID=$!
  popd >/dev/null
}

start_workers() {
  pushd "$BACKEND_DIR" >/dev/null
  log "Starting workers (BullMQ)..."
  npm run worker &
  WK_PID=$!
  popd >/dev/null
}

shutdown() {
  log "Shutting down..."
  if [[ -n "$FE_PID" ]] && ps -p "$FE_PID" >/dev/null 2>&1; then
    log "Stopping frontend (PID $FE_PID)"
    kill "$FE_PID" 2>/dev/null || true
    wait "$FE_PID" 2>/dev/null || true
  fi
  if [[ -n "$BE_PID" ]] && ps -p "$BE_PID" >/dev/null 2>&1; then
    log "Stopping backend (PID $BE_PID)"
    kill "$BE_PID" 2>/dev/null || true
    wait "$BE_PID" 2>/dev/null || true
  fi
  if [[ -n "$WK_PID" ]] && ps -p "$WK_PID" >/dev/null 2>&1; then
    log "Stopping workers (PID $WK_PID)"
    kill "$WK_PID" 2>/dev/null || true
    wait "$WK_PID" 2>/dev/null || true
  fi
  stop_db
  stop_redis
  log "Done."
}

trap shutdown INT TERM EXIT

log "Starting database..."
start_db

log "Starting Redis..."
start_redis

log "Preparing backend..."
prep_backend

log "Preparing frontend..."
prep_frontend

log "Launching services..."
start_backend
start_workers
start_frontend

log "All services started. Backend: http://localhost:3001  Frontend: http://localhost:3000"

# Wait on child processes
wait


