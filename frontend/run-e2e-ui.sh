#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export E2E_BASE_URL="${E2E_BASE_URL:-https://TU_DOMINIO_O_IP}"
export E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-}"
export E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-}"

if [ -z "$E2E_ADMIN_EMAIL" ] || [ -z "$E2E_ADMIN_PASSWORD" ]; then
  echo "ERROR: define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD antes de ejecutar este script."
  echo
  echo "Ejemplo:"
  echo "E2E_ADMIN_EMAIL='tu_admin@empresa.com' E2E_ADMIN_PASSWORD='tu_clave' ./run-e2e-ui.sh"
  exit 1
fi

cd "$ROOT_DIR"
npm run test:e2e:ui
