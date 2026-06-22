# CI checklist

## Comando único local

Desde la raíz del proyecto:

```bash
cd /var/www/sales-tracker
npm test
```

Esto ejecuta:
- tests de backend
- build de frontend
- smoke API con Playwright
- smoke API específico de agenda

Si existe `frontend/.env.e2e`, el comando carga esas variables automáticamente antes de lanzar los smoke E2E.

## Pipeline GitHub Actions

Archivo:

- `.github/workflows/ci.yml`

La pipeline corre en:
- `push` a `main`
- `pull_request`

## Alcance actual del CI

- Valida lógica de backend con Jest.
- Valida que el frontend compile.
- Valida permisos base y accesos críticos con Playwright API smoke.
- Valida agenda: asignación, no duplicados y consumo del draft al hacer check-in.

## Limitación actual

La suite UI de Playwright no entra aún en CI porque depende de librerías de sistema para Chromium en el host de ejecución local. La suite ya está preparada para ejecutarse en el servidor con HTTPS autofirmado usando:

```bash
cd /var/www/sales-tracker/frontend
E2E_BASE_URL="https://TU_DOMINIO_O_IP" \
E2E_ADMIN_EMAIL="tu_admin@empresa.com" \
E2E_ADMIN_PASSWORD="tu_password" \
./run-e2e-ui.sh
```

## Recomendación de uso

Antes de reiniciar o desplegar:

```bash
cd /var/www/sales-tracker
npm test
FRONTEND_HEALTH_URL="https://TU_DOMINIO_O_IP/" ./restart-all.sh
```

## Qué valida ahora `restart-all.sh`

- compila frontend
- reinicia el backend en PM2
- guarda el estado de PM2
- espera a que la API responda en `API_HEALTH_URL`
- opcionalmente comprueba el frontend publicado en `FRONTEND_HEALTH_URL`

Ejemplo completo:

```bash
cd /var/www/sales-tracker
API_HEALTH_URL="http://127.0.0.1:3001/api/health" \
FRONTEND_HEALTH_URL="https://TU_DOMINIO_O_IP/" \
./restart-all.sh
```
