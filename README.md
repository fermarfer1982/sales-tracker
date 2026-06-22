# Sales Tracker

Aplicación web para registrar, consultar y explotar la actividad comercial con datos estructurados: clientes, visitas, seguimientos, ventas, agenda, oportunidades, productos y trazabilidad comercial.

El objetivo del proyecto es capturar el mínimo dato útil durante el trabajo comercial diario, evitando depender de hojas Excel dispersas y permitiendo después análisis en cuadros de mando, Power BI o sistemas corporativos de IA.

## Funcionalidades

- Gestión de clientes directos e indirectos, con validación flexible de CIF/NIF para clientes extranjeros o indirectos.
- Fichas de cliente con datos comerciales, representante asignado y múltiples geolocalizaciones/fincas editables.
- Registro rápido de actividad sin geolocalización obligatoria.
- Inicio y cierre de visitas con check-in/check-out, GPS y control de geofence.
- Agenda y seguimientos con edición, borrado, cambios de fecha y marcado de completado.
- Mis actividades para que cada comercial consulte sus propios registros y seguimientos completados.
- Venta cerrada con uno o varios productos, unidad comercial (`SE`, `PI`, `GR`), cantidad, precio y trazabilidad de cliente directo.
- Generación de pedido cuando procede, con envío por email según la configuración del comercial.
- Catálogos administrables de productos, tipos, variedades y datos maestros.
- Buscadores en clientes, productos, ventas, visitas y registro rápido.
- Gestión de usuarios por administradores, con roles, estado, representante, manager y correos de pedido.
- Control de permisos por rol: comercial, manager y administrador.
- Endpoints de BI para extracción de datos hacia Power BI u otras herramientas.
- Tests unitarios y e2e API/UI con Playwright.

## Arquitectura

```text
backend/   API Node.js + Express + MongoDB + Mongoose
frontend/  React + Vite + Bootstrap
docs/      Manuales, presentación ejecutiva y material BI
scripts/   Scripts operativos y plantillas
```

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.
- MongoDB 6 o superior.
- Navegador moderno.
- HTTPS en producción si se usa geolocalización.

## Instalación Local

Instala dependencias del backend:

```bash
cd backend
npm install
cp env.example .env
```

Edita `backend/.env` con tus valores reales.

Instala dependencias del frontend:

```bash
cd frontend
npm install
```

Arranca backend:

```bash
cd backend
npm run dev
```

Arranca frontend:

```bash
cd frontend
npm run dev
```

Por defecto:

- API: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Variables de Entorno

El backend usa `backend/.env`, que no debe subirse a Git.

Variables principales:

| Variable | Uso |
|---|---|
| `PORT` | Puerto del backend |
| `MONGO_URI` | Conexión a MongoDB |
| `JWT_SECRET` | Secreto de firma JWT |
| `JWT_EXPIRES_IN` | Duración de sesión |
| `CORS_ORIGIN` | Origen permitido del frontend |
| `SMTP_HOST` | Servidor SMTP |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_SECURE` | TLS/SSL |
| `MAIL_FROM` | Remitente de emails |
| `ADMIN_ALERT_EMAIL` | Email de alertas |
| `TZ` | Zona horaria |
| `GEOFENCE_RADIUS_METERS` | Radio de geofence |

Usa `backend/env.example` como plantilla.

## Datos Demo

Para cargar datos iniciales de ejemplo:

```bash
cd backend
npm run seed
```

Usuarios demo incluidos por el seed:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@empresa.local` | `Admin123!` | admin |
| `jefe@empresa.local` | `Admin123!` | manager |
| `comercial1@empresa.local` | `Admin123!` | sales |
| `comercial2@empresa.local` | `Admin123!` | sales |

## Tests

Backend:

```bash
cd backend
npm test
```

Frontend build:

```bash
cd frontend
npm run build
```

E2E API:

```bash
cd frontend
npm run test:e2e
```

E2E UI:

```bash
cd frontend
npx playwright install chromium
E2E_BASE_URL="https://TU_DOMINIO_O_IP" \
E2E_ADMIN_EMAIL="admin@empresa.local" \
E2E_ADMIN_PASSWORD="CAMBIA_ESTA_CLAVE" \
npm run test:e2e:ui
```

También existe un script raíz:

```bash
npm test
```

## Despliegue

El despliegue recomendado es:

- Backend con PM2.
- Frontend compilado con Vite y servido por Nginx.
- MongoDB local o gestionado.
- HTTPS con certificado válido en producción.

Flujo básico:

```bash
cd frontend
npm run build

cd ..
pm2 start ecosystem.config.js
pm2 save
```

Consulta `DEPLOYMENT.md` para una guía completa y `scripts/nginx-sales-tracker-domain.template` para una plantilla de Nginx.

## Documentación

- `MANUAL_USUARIO.md`: manual general de usuario.
- `docs/manual-comerciales-sales-tracker.md`: manual específico para comerciales.
- `docs/presentacion-sales-tracker-jefe.md`: presentación ejecutiva.
- `docs/DICCIONARIO_DATOS_BI.md`: diccionario de datos para BI.
- `MATRIZ_PERMISOS_Y_REGRESION.md`: matriz de permisos y pruebas de regresión.
- `OPERACION_DIARIA.md`: operación y validaciones habituales.
- `CI_CHECKLIST.md`: checklist de pruebas.

## Seguridad y Privacidad

Este repositorio está preparado para publicarse sin datos reales.

No se incluyen:

- Ficheros `.env`.
- Certificados, claves privadas ni CSR.
- CSV/Excel reales de importación.
- `node_modules`, builds o resultados de pruebas.
- Datos personales o credenciales reales.

Antes de publicar cambios, conviene ejecutar una revisión similar:

```bash
rg -n -i "(private key|begin .*private|jwt_secret|smtp_pass|mongodb://.*:.*@|\\.local|192\\.168|password)" .
```

Los ficheros locales sensibles deben mantenerse fuera de Git mediante `.gitignore`.

## Importación de Productos

El script `importar/import-products.js` permite importar productos desde un CSV local no versionado. El archivo real de datos debe mantenerse fuera del repositorio.

Ejemplo de uso:

```bash
node importar/import-products.js
```

## Power BI

La API incluye endpoints preparados para explotación BI:

```text
GET /api/bi/fact-activities
GET /api/bi/dim-clients
GET /api/bi/dim-users
GET /api/bi/dim-catalogs
```

El consumo debe hacerse con autenticación Bearer usando un usuario autorizado.

## Estado Del Proyecto

Proyecto funcional en evolución, orientado a uso interno comercial y despliegue on-premise. La prioridad técnica es mantener bajo el esfuerzo de captura de datos para el comercial y alta la calidad del dato para dirección, managers, administración y BI.
