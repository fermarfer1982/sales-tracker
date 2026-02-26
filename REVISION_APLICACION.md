# Revisión funcional de Sales Tracker

Fecha: 2026-02-26

## Verificaciones ejecutadas

- Backend tests unitarios/integración ligera (`npm test`): **22/22 tests OK**.
- Frontend build de producción (`npm run build`): **build OK**.

## Qué hace la aplicación

### 1) Autenticación y seguridad
- Login con JWT (`/api/auth/login`) y obtención del usuario actual (`/api/auth/me`).
- Middleware de autenticación por token Bearer y autorización por roles (`sales`, `manager`, `admin`).
- Hardening de API con Helmet, CORS restringido y rate limiting global + limitador específico en login.

### 2) Registro de actividad comercial
- Flujo completo de **check-in** y **check-out** con geolocalización capturada desde frontend.
- Registro rápido de actividades (sin esperar al flujo completo de visita).
- Gestión de actividades propias y de equipo (para manager/admin), incluyendo edición y borrado lógico.

### 3) Geolocalización y geofence
- En checkout y registro rápido se calcula distancia al cliente (Haversine) y si está dentro del radio esperado.
- Radio de geofence configurable desde ajustes (`geofenceRadiusMeters`).

### 4) Clientes y calidad de dato
- Alta/edición de clientes con validación de NIF/CIF español.
- Endpoint de sugerencias/autocompletado y asignación de ubicación del cliente.

### 5) Cumplimiento diario y dashboard
- Módulo de compliance (hoy/rango/KPIs) con semáforo:
  - Verde: al menos una actividad completada.
  - Amarillo: hay actividad pero incompleta.
  - Rojo: sin actividad.
- Dashboard para manager/admin con KPI, faltantes y estado de comerciales.

### 6) Administración
- Gestión de usuarios (crear, editar, activar/desactivar, rol, manager).
- Gestión de catálogos maestros (tipos de actividad, productos, resultados, zonas).
- Configuración de sistema (hora de corte, timezone, geofence, email de alertas).
- Auditoría de cambios consultable por admins.

### 7) BI y analítica
- Endpoints listos para Power BI:
  - fact-activities
  - dim-clients
  - dim-users
  - dim-catalogs

### 8) Notificaciones automáticas
- Job programado con cron en días laborables para enviar recordatorios por email cuando el estado no es verde.
- Si no hay SMTP, el envío se simula en consola (útil en desarrollo).

## Validación realizada y límites
- Se validó código, rutas, controladores y pruebas automatizadas.
- No se levantó la app completa conectada a MongoDB en esta revisión; por tanto, no se ejecutó un recorrido E2E de UI con datos reales.
