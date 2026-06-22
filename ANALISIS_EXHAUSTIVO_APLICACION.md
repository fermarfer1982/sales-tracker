# Análisis exhaustivo de la aplicación Sales Tracker

Fecha: 2026-02-26

## 1) Resumen ejecutivo

La aplicación actual cubre de extremo a extremo el caso base de operación comercial diaria:
- Autenticación por JWT y control de acceso por roles (`sales`, `manager`, `admin`).
- Registro operativo de actividad (check-in/check-out y registro rápido).
- Gestión de clientes y validación de calidad de dato (CIF/NIF).
- Módulos de control (compliance, dashboard, auditoría, ajustes y BI).

El producto está en una fase funcional sólida para operación interna, pero todavía con margen alto para:
- Automatización operativa (agenda, recordatorios más inteligentes, plantillas).
- Escalabilidad funcional (adjuntos, workflows más complejos, exportación avanzada).
- Gobernanza y observabilidad (métricas de SLA, trazabilidad avanzada, E2E).

## 2) Qué hace hoy la aplicación (inventario funcional real)

### 2.1 Seguridad y acceso
- Login con limitación de intentos (rate-limit específico en `/api/auth/login`).
- Endpoint para recuperar perfil autenticado (`/api/auth/me`) y logout.
- Middleware global de autenticación y autorización por rol.
- Hardening base con Helmet, CORS restringido, rate-limit global y logging con Morgan.

### 2.2 Actividad comercial
- **Flujo de visita**:
  - Check-in: inicio de actividad con geolocalización.
  - Check-out: cierre de actividad con resultado, producto, notas, duración y siguiente acción.
- **Registro rápido**: crea una actividad completa en una sola operación.
- **Listado operativo**:
  - Actividades propias (`/api/activities/my`).
  - Actividades de equipo para manager/admin (`/api/activities/team`).
  - Detalle por actividad y operaciones de actualización/borrado lógico.
- Control por estado (`draft`, `in_progress`, `completed`) y trazas de auditoría por acción.

### 2.3 Geolocalización y reglas de zona
- Captura de coordenadas en frontend y persistencia en backend para check-in/check-out.
- Cálculo de distancia (Haversine) respecto a geolocalización del cliente.
- Evaluación automática de si la visita cae dentro de radio esperado (geofence configurable).
- Restricción por zona para usuarios `sales` (no pueden registrar actividad fuera de su zona).

### 2.4 Clientes y calidad de dato
- Alta, edición, listado paginado y autocompletado/sugerencias.
- Validación real de CIF/NIF español (incluye normalización de taxId).
- Asignación/actualización de localización geográfica del cliente.
- Control de duplicados por `taxId`.

### 2.5 Cumplimiento y dashboard
- Semáforo de cumplimiento (`green`, `yellow`, `red`) por comercial.
- KPIs agregados y vistas por fecha/rango.
- Dashboard para perfiles manager/admin con filtros por comercial y zona.

### 2.6 Administración
- Gestión de usuarios (alta, edición, activación/desactivación, asignación de manager y rol).
- Gestión de catálogos maestros (tipos de actividad, productos, resultados, zonas, segmentos).
- Gestión de ajustes globales (hora de corte, zona horaria, radio geofence, email de alertas).
- Consultas de auditoría para admins.

### 2.7 BI y analítica
- Endpoints dimensionales y fact para integración con Power BI:
  - `fact-activities`
  - `dim-clients`
  - `dim-users`
  - `dim-catalogs`

### 2.8 Automatización
- Job programado (cron) para notificaciones de cumplimiento en días laborables.
- Soporte de fallback cuando no hay configuración SMTP operativa (modo desarrollo).

## 3) Cobertura por módulos frontend (UI actual)

### 3.1 Módulos visibles en navegación
- Hoy
- Registro rápido
- Mis actividades
- Clientes
- Dashboard (manager/admin)
- Admin: Catálogos, Usuarios, Auditoría, Registros, Configuración

### 3.2 Observación de producto
- Existe página de agenda en código (`AgendaPage.jsx`), pero no está conectada actualmente al router principal.
- Esto indica capacidad parcialmente preparada para evolucionar un módulo de planificación comercial.

## 4) Fortalezas actuales

1. **Cobertura funcional transversal** de operación comercial y control de cumplimiento.
2. **Modelo de seguridad razonable** para entorno interno (JWT + roles + rate limiting).
3. **Buen baseline de calidad de dato** (taxId y geolocalización operacional).
4. **Capas separadas backend/frontend** y APIs por dominio.
5. **Testing base existente** en utilidades críticas (taxId, haversine, compliance, acceso por zona).

## 5) Gaps detectados (oportunidades reales de implementación)

### 5.1 Producto/negocio
- Falta formalizar **agenda comercial** como módulo visible principal.
- No existe gestión de **objetivos/cuotas** por comercial y periodo.
- No hay **pipeline comercial** (oportunidades/estados de venta) conectado a actividades.
- Falta trazabilidad de **acciones posteriores** (siguiente acción como workflow y recordatorio).

### 5.2 Operación
- No hay exportación directa a CSV/Excel en pantallas operativas.
- No hay sistema de notificaciones in-app (solo email/cron).
- No hay adjuntos/evidencias de visita (fotos, documentos).

### 5.3 Calidad/arquitectura
- Falta suite E2E automatizada de punta a punta (login → check-in/out → dashboard).
- Falta observabilidad operacional (métricas técnicas y de negocio más explícitas).
- Falta estrategia de versionado de API y contract testing.

## 6) Módulos recomendados para implementar (priorizados)

## Fase 1 — Alto impacto / baja fricción (4–6 semanas)

### M1. Agenda comercial operativa (activar y completar)
**Objetivo**: convertir siguiente acción en una cola de trabajo diaria.
- Listado de tareas por fecha/prioridad/estado.
- Replanificación rápida desde actividad.
- Cierre de tarea vinculada a nueva actividad.

**Valor**: incrementa adopción diaria y reduce fugas de seguimiento.

### M2. Exportación operativa (CSV)
**Objetivo**: exportar actividades, auditoría y dashboard filtrado.
- Botón export en módulos clave.
- Respeto de filtros activos.
- Trazabilidad de exportaciones en auditoría.

**Valor**: reduce fricción con reporting ad-hoc de managers.

### M3. Reglas dinámicas de validación por tipo de actividad
**Objetivo**: elevar calidad de dato con reglas administrables.
- Campos obligatorios por tipo de visita.
- Reglas condicionales (si outcome=X, exigir notes y nextActionDate).
- Mensajería de validación homogénea frontend/backend.

**Valor**: mejora consistencia y utilidad analítica.

## Fase 2 — Escalado de operación comercial (6–10 semanas)

### M4. Objetivos y cumplimiento avanzado
- Definición de objetivos por comercial/zona/periodo.
- KPIs de avance (% objetivo, tendencia semanal, desviación).
- Alertas preventivas antes de cierre de periodo.

### M5. Adjuntos de actividad
- Carga de imagen/documento por actividad.
- Metadatos y permisos por rol.
- Retención configurable.

### M6. Notificaciones in-app + centro de alertas
- Alertas de tareas vencidas, actividades incompletas y riesgo de incumplimiento.
- Estado leído/no leído y deep-link al registro correspondiente.

## Fase 3 — Inteligencia comercial y gobierno (10–16 semanas)

### M7. Módulo de oportunidades (pipeline)
- Entidad de oportunidad conectada a cliente + actividades.
- Etapas, probabilidad, importe estimado, fecha prevista de cierre.
- KPIs de conversión por comercial/zona/segmento.

### M8. Data quality cockpit
- Reglas de calidad monitorizadas (sin geolocalización, sin outcome, etc.).
- Score de calidad por comercial/equipo.
- Plan de corrección y seguimiento.

### M9. Observabilidad y SLA
- Telemetría técnica (latencia endpoints críticos, errores por módulo).
- SLA operativo (tiempo medio check-in→check-out, cobertura diaria).
- Tablero técnico para soporte.

## 7) Plan técnico recomendado para las siguientes 2 iteraciones

### Iteración A
- Activar ruta/pantalla de Agenda dentro del menú principal.
- Definir contrato API de tareas (list/create/update/complete).
- Añadir export CSV para `admin/records` y `dashboard`.
- Tests API de regresión para actividad y agenda.

### Iteración B
- Añadir motor de reglas de validación configurable.
- Exponer reglas en settings/admin con versionado.
- Añadir notificaciones in-app básicas (badge + listado simple).
- Incluir smoke E2E mínimo en CI para flujo de mayor riesgo.

## 8) Riesgos y mitigación

- **Dependencia geolocalización**: diseñar modo degradado controlado para escenarios de baja señal.
- **Crecimiento de complejidad por rol**: definir matriz RBAC explícita por endpoint y pantalla.
- **Deuda de pruebas E2E**: introducir suite mínima antes de ampliar más dominios.
- **BI sin gobernanza semántica**: versionar definiciones KPI y diccionario de datos.

## 9) Conclusión

La aplicación ya es funcional para el núcleo operativo y administrativo de un equipo comercial. El siguiente salto de valor está en convertirla de “registro de actividad” a “sistema de ejecución comercial” mediante agenda, objetivos, validación dinámica y notificación proactiva, sin comprometer estabilidad ni calidad del dato.
