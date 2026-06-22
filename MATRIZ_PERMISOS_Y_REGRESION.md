# Matriz de permisos y checklist de regresión

Fecha de referencia: 2026-04-15

## 1. Roles y alcance

### sales
- Ve solo sus propias actividades.
- Puede registrar visitas, registro rápido, consultar su agenda y sus clientes accesibles por zona.
- No puede acceder a dashboard, usuarios, auditoría, configuración, catálogos admin ni BI.

### manager
- Ve solo su equipo por defecto.
- Puede acceder a dashboard, agenda comercial, compliance, registros y BI dentro del alcance de su equipo.
- No puede acceder a administración de usuarios, configuración, auditoría ni catálogos admin.

### manager con `canViewAllSales = true`
- Sigue siendo `manager`, no `admin`.
- Ve toda la red comercial en dashboard, compliance, agenda, registros y opciones comerciales.
- No puede gestionar usuarios completos, configuración, auditoría ni catálogos admin.

### admin
- Acceso total.
- Puede gestionar usuarios, configuración, auditoría, catálogos, dashboard, BI y registros globales.

## 2. Pantallas por rol

### Sales
- Permitidas:
  - `Hoy`
  - `Registro rápido`
  - `Mis actividades`
  - `Agenda`
  - `Clientes`
- No permitidas:
  - `Dashboard`
  - `Admin > Usuarios`
  - `Admin > Configuración`
  - `Admin > Auditoría`
  - `Admin > Catálogos`
  - `Admin > Registros`

### Manager
- Permitidas:
  - Todas las de `sales`
  - `Dashboard`
- No permitidas:
  - Todo el menú `Admin`

### Admin
- Permitidas:
  - Todas las anteriores
  - Todo el menú `Admin`

## 3. Endpoints sensibles

### Solo autenticado
- `/api/activities/checkin`
- `/api/activities/quick`
- `/api/activities/my`
- `/api/activities/agenda`
- `/api/activities/calendar`
- `/api/activities/:id`
- `/api/clients/*`
- `/api/compliance/*`

### Manager o admin
- `/api/dashboard/*`
- `/api/activities/team`
- `/api/bi/*`
- `/api/users/options`

### Solo admin
- `/api/users/*` salvo `/api/users/options`
- `/api/settings/*`
- `/api/audit/*`
- `POST/PUT` en `/api/catalogs/*`

## 4. Reglas funcionales clave

### Actividades
- `sales` solo puede operar sobre sus propias actividades.
- `manager` normal solo ve actividades de comerciales con `managerUserId = su id`.
- `manager` global ve actividades de todos los comerciales.
- `admin` ve todo.

### Clientes
- `sales` queda restringido por zona.
- `manager` y `manager` global no están restringidos por zona como `sales`; su alcance operativo viene por vistas y filtros comerciales.
- `admin` ve todo.

### Usuarios
- Solo `admin` puede crear, editar, activar, desactivar o borrar usuarios.
- El flag `canViewAllSales` solo tiene efecto para usuarios con rol `manager`.
- `manager` no puede usar `/api/users` completo; usa `/api/users/options`.

## 5. Checklist de regresión

### Login y sesión
- `admin` puede iniciar sesión.
- `manager` puede iniciar sesión.
- `sales` puede iniciar sesión.
- Un usuario desactivado no puede iniciar sesión.

### Navegación por rol
- `sales` no ve enlace a `Dashboard`.
- `sales` no ve menú `Admin`.
- `manager` ve `Dashboard`.
- `manager` no ve menú `Admin`.
- `admin` ve `Dashboard` y menú `Admin`.

### Permisos backend
- `sales` recibe `403` al llamar `/api/dashboard/kpis`.
- `sales` recibe `403` al llamar `/api/users/options`.
- `manager` recibe `403` al llamar `/api/users`.
- `manager` recibe `200` al llamar `/api/users/options`.
- `admin` recibe `200` al llamar `/api/users`.

### Alcance comercial
- `manager` normal solo ve comerciales de su equipo en dashboard, agenda y registros.
- `manager` con `canViewAllSales` ve toda la red comercial en dashboard, agenda y registros.
- `admin` sigue viendo todo.

### Usuarios
- `admin` puede activar/desactivar usuarios.
- `admin` puede marcar `Ver toda la red comercial` en un `manager`.
- El cambio de `canViewAllSales` persiste tras refrescar.
- No se puede borrar un usuario con dependencias.
- No se puede borrar el propio usuario autenticado.

### Operativa diaria
- `sales` puede hacer check-in.
- `sales` puede hacer check-out.
- `sales` puede ver su resumen en `Actividades de hoy`.
- `manager` puede abrir dashboard y registros.
- `admin` puede abrir usuarios, registros y configuración.

## 6. Smoke tests disponibles

### Backend/Jest
- `backend/tests/authMiddleware.test.js`
- `backend/tests/salesScope.test.js`

### Playwright API smoke
- `frontend/tests/e2e/api-smoke.spec.js`

Comando:
```bash
cd /var/www/sales-tracker/frontend
npm run test:e2e
```

### Playwright UI smoke
- `frontend/tests/e2e/auth.spec.js`

Comando:
```bash
cd /var/www/sales-tracker/frontend
npm run test:e2e:ui
```

Nota:
- En este servidor, la suite UI requiere instalar librerías del sistema para Chromium.

## 7. Cuando tocar este documento

Actualizar esta matriz cuando cambie cualquiera de estos puntos:
- nuevo rol
- nuevo endpoint protegido
- nueva pantalla visible por rol
- cambio en `canViewAllSales`
- cambios en dashboard, BI, agenda o usuarios
