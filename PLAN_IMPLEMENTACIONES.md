# Preparación para nuevas implementaciones

Fecha: 2026-02-26

## Estado actual verificado

- Backend: test suite pasando (`22/22`).
- Frontend: build de producción correcto con Vite.
- Arquitectura separada por capas:
  - Backend Express + controladores/servicios + modelos Mongoose.
  - Frontend React con rutas protegidas por rol.

## Mapa funcional rápido

### Backend (áreas principales)
- `src/controllers/*`: lógica de negocio por dominio (auth, actividades, clientes, compliance, dashboard, administración).
- `src/routes/*`: exposición de endpoints REST por dominio.
- `src/models/*`: esquema de datos principal (users, clients, activities, settings, audit).
- `src/utils/*`: utilidades transversales (NIF/CIF, geofence, auditoría, respuesta estándar).
- `src/jobs/complianceJob.js`: automatización de recordatorios por email.

### Frontend (áreas principales)
- `src/pages/*`: pantallas por flujo de negocio.
- `src/components/*`: layout, guardas de rutas y componentes reutilizables.
- `src/context/*`: autenticación y tema.
- `src/services/*`: cliente API y funciones de acceso a backend.

## Propuesta de hoja de ruta (implementaciones siguientes)

### 1) Productividad comercial (alto impacto)
- Plantillas de actividad por tipo de visita para reducir tiempo de registro.
- Duplicar actividad previa para visitas recurrentes.
- Adjuntos/fotos de visita con metadatos básicos.

### 2) Calidad de dato y gobierno
- Reglas de validación configurables por admin (campos obligatorios por tipo de actividad).
- Alertas tempranas de inconsistencia (ej. check-out sin resultado o sin notas).
- Mejora de auditoría con diff por campo en cambios críticos.

### 3) Reporting y operación
- Exportaciones CSV desde dashboard y auditoría.
- KPIs semanales/mensuales adicionales (tasa de cierre, duración media de visita, cobertura por zona).
- Filtros guardados por usuario.

### 4) UX y rendimiento
- Paginación virtual/infinite list en listados grandes.
- Carga perezosa de páginas administrativas.
- Estados de carga/errores homogéneos en toda la app.

## Preparación técnica recomendada antes de implementar

1. Definir criterios de aceptación por historia (incluyendo rol y permisos).
2. Acordar cambios de modelo de datos y migraciones semilla.
3. Añadir tests de API para casos de regresión del flujo check-in/check-out.
4. Incorporar smoke tests E2E para login + alta actividad + dashboard.

## Riesgos detectados

- Dependencia fuerte de geolocalización para completar flujos operativos.
- Entornos sin SMTP real requieren fallback claramente monitorizable.
- Sin recorrido E2E automatizado completo aún (solo unit/integration ligera y build).
