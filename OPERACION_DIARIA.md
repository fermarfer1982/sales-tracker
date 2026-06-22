# Operación diaria

## 1. Validación técnica rápida

Desde la raíz del proyecto:

```bash
cd /var/www/sales-tracker
npm test
```

Esto valida:
- tests de backend
- build de frontend
- smoke API de permisos
- smoke API de agenda

Si tienes `frontend/.env.e2e`, `npm test` la cargará automáticamente para los smoke E2E.

## 2. Reinicio con comprobación

Para reiniciar y validar que backend y frontend responden:

```bash
cd /var/www/sales-tracker
API_HEALTH_URL="http://127.0.0.1:3001/api/health" \
FRONTEND_HEALTH_URL="https://TU_DOMINIO_O_IP/" \
./restart-all.sh
```

Notas:
- `FRONTEND_HEALTH_URL` es opcional, pero conviene usarlo en producción.
- el script acepta certificado autofirmado del frontend por defecto.

## 3. Smoke UI real

Entra en la carpeta `frontend` y exporta variables de entorno. Puedes partir de `.env.e2e.example`.

```bash
cd /var/www/sales-tracker/frontend
cp .env.e2e.example .env.e2e
```

Edita `.env.e2e` con el admin real y luego ejecuta:

```bash
set -a
source .env.e2e
set +a
./run-e2e-ui.sh
```

Alternativa sin fichero:

```bash
cd /var/www/sales-tracker/frontend
E2E_BASE_URL="https://TU_DOMINIO_O_IP" \
E2E_ADMIN_EMAIL="tu_admin@empresa.com" \
E2E_ADMIN_PASSWORD="tu_password" \
./run-e2e-ui.sh
```

## 4. Qué comprueba el smoke UI

- admin puede entrar a usuarios
- manager global puede entrar a dashboard pero no a admin
- sales no puede entrar a dashboard

## 5. Qué comprueba ahora el smoke de agenda

Está incluido dentro de `npm test` y valida por API:

- manager agenda para un sales
- no se permite un duplicado del mismo comercial/cliente/día
- el draft aparece en agenda
- el check-in consume ese draft
- la visita termina completada sobre el mismo registro

## 6. Si algo falla

Comprobaciones rápidas:

```bash
curl -I http://127.0.0.1:3001/api/health
curl -I -k https://TU_DOMINIO_O_IP/
curl -I -k https://TU_DOMINIO_O_IP/login
pm2 list
```

Si falla UI pero la API está bien:
- revisar certificado HTTPS
- revisar nginx
- revisar que `E2E_BASE_URL` apunte al host correcto

Si falla login E2E:
- comprobar que el admin usado está activo
- comprobar usuario y contraseña
