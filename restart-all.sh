#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="${APP_NAME:-sales-tracker-api}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3001/api/health}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-}"
FRONTEND_CURL_INSECURE="${FRONTEND_CURL_INSECURE:-1}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-20}"

cd "$ROOT_DIR"

echo "[1/5] Compilando frontend..."
npm run build --prefix frontend

echo "[2/5] Reiniciando backend con PM2..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start ecosystem.config.js --only "$APP_NAME"
fi

echo "[3/5] Guardando estado de PM2..."
pm2 save

echo "[4/5] Verificando salud de la API..."
api_ok=0
for _ in $(seq 1 "$MAX_WAIT_SECONDS"); do
  if curl -fsS "$API_HEALTH_URL" >/dev/null; then
    api_ok=1
    break
  fi
  sleep 1
done

if [ "$api_ok" -ne 1 ]; then
  echo "ERROR: la API no responde en $API_HEALTH_URL"
  exit 1
fi

echo "[5/5] Verificando frontend publicado..."
if [ -n "$FRONTEND_HEALTH_URL" ]; then
  curl_args=(-fsS)
  if [ "$FRONTEND_CURL_INSECURE" = "1" ]; then
    curl_args+=(-k)
  fi

  frontend_ok=0
  for _ in $(seq 1 "$MAX_WAIT_SECONDS"); do
    if curl "${curl_args[@]}" "$FRONTEND_HEALTH_URL" >/dev/null; then
      frontend_ok=1
      break
    fi
    sleep 1
  done

  if [ "$frontend_ok" -ne 1 ]; then
    echo "ERROR: el frontend no responde en $FRONTEND_HEALTH_URL"
    exit 1
  fi
else
  echo "Frontend HTTP no verificado. Define FRONTEND_HEALTH_URL para validarlo tambien."
fi

echo "Aplicacion actualizada y verificada."
