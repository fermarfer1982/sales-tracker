# Revisión funcional de Sales Tracker

Fecha: 2026-02-26

## Verificaciones ejecutadas

- Backend tests unitarios/integración ligera (`npm test`): **25/25 tests OK**.
- Frontend build de producción (`npm run build`): **build OK**.

## Qué hace la aplicación

### 1) Autenticación y seguridad
- Login con JWT (`/api/auth/login`), logout (`/api/auth/logout`) y consulta de sesión actual (`/api/auth/me`).
- Middleware de autenticación por token Bearer y autorización por roles (`sales`, `manager`, `admin`).
- Hardening de API con Helmet, CORS restringido y rate limiting global + limitador específico en login.

### 2) Registro de actividad comercial
- Flujo completo de **check-in** y **check-out** con geolocalización capturada desde frontend.
- Registro rápido de actividades (`/api/activities/quick`).
- Consulta de actividades propias (`/api/activities/my`), agenda (`/api/activities/agenda`) y actividades de equipo (`/api/activities/team`, manager/admin).
- Edición y borrado lógico de actividades (`PUT/DELETE /api/activities/:id`).

### 3) Geolocalización y geofence
- En checkout y registro rápido se calcula distancia al cliente (Haversine) y si está dentro del radio esperado.
- Radio de geofence configurable desde ajustes (`geofenceRadiusMeters`).

### 4) Clientes y calidad de dato
- Alta/edición de clientes con validación de NIF/CIF español.
- Endpoint de sugerencias/autocompletado (`/api/clients/suggest`) y asignación de ubicación del cliente (`PATCH /api/clients/:id/set-location`).

### 5) Cumplimiento diario y dashboard
- Módulo de compliance (`/api/compliance/today`, `/range`, `/kpis`) con semáforo:
  - Verde: al menos una actividad completada.
  - Amarillo: hay actividad pero incompleta.
  - Rojo: sin actividad.
- Dashboard para manager/admin con KPI, faltantes y estado diario por comercial.

### 6) Administración
- Gestión de usuarios (crear, editar, activar/desactivar, rol, manager).
- Gestión de catálogos maestros (tipos de actividad, productos, resultados, zonas).
- Configuración de sistema (hora de corte, timezone, geofence, email de alertas).
- Auditoría de cambios consultable por admins.

### 7) BI y analítica
- Endpoints listos para Power BI:
  - `fact-activities`
  - `dim-clients`
  - `dim-users`
  - `dim-catalogs`

### 8) Frontend (pantallas y flujo)
- Login y protección por roles en rutas.
- Operativa comercial diaria: “Hoy”, “Registro rápido”, “Mis actividades”, “Clientes”.
- Operativa manager/admin: dashboard.
- Operativa admin: catálogos, usuarios, auditoría, ajustes y consulta de registros.

## Validación realizada y límites
- Se validó código/rutas y comportamiento esperado mediante pruebas automatizadas y compilación del frontend.
- No se levantó backend conectado a MongoDB porque no existe `backend/.env` en este entorno; por tanto, no se ejecutó recorrido E2E completo con datos reales.
