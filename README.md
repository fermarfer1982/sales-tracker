# Sales Tracker - Plataforma de registro de actividad comercial

## Descripción

Aplicación web interna para que los comerciales registren su actividad diaria (visitas, llamadas, emails, etc.) con calidad de dato alta, sustituyendo un Excel mal rellenado.

**Características principales:**
- Registro estructurado de actividades con geolocalización obligatoria en checkout
- Validación de CIF/NIF español (algoritmo real)
- Flujo check-in / check-out con geofence automático
- Roles: sales, manager, admin
- Dashboard de cumplimiento (verde/amarillo/rojo) por comercial
- Notificaciones automáticas por email (node-cron)
- Endpoints BI listos para Power BI
- Auditoría completa de cambios
- Mobile-first (React + Bootstrap 5)

---

## Arquitectura

```
/backend    Node.js + Express + MongoDB + Mongoose
/frontend   React + Vite + Bootstrap 5
```

**Backend:**
- Express con Helmet, CORS restringido, rate-limit
- Autenticación JWT
- Validación con Joi
- node-cron para job de notificaciones
- nodemailer para emails
- Morgan para logging

**Frontend:**
- React SPA con React Router v6
- Proxy a backend en dev (Vite)
- Bootstrap 5 mobile-first

---

## Requisitos

- Node.js >= 18.x
- MongoDB >= 6.x (local o Atlas)
- npm >= 9.x

---

## Instalación

### Backend

```bash
cd backend
npm install
cp env.example .env   # Editar con tus valores
```

### Frontend

```bash
cd frontend
npm install
```

---

## Variables de entorno (backend)

Copia `backend/env.example` a `backend/.env` y edita:

| Variable | Descripción | Ejemplo |
|---|---|---|
| PORT | Puerto del servidor | 3001 |
| MONGO_URI | URI MongoDB | mongodb://localhost:27017/sales_tracker |
| JWT_SECRET | Secreto JWT (cambia en prod) | supersecretkey |
| JWT_EXPIRES_IN | Duración del token | 8h |
| CORS_ORIGIN | Origen permitido | http://localhost:5173 |
| SMTP_HOST | Host SMTP | smtp.gmail.com |
| SMTP_PORT | Puerto SMTP | 587 |
| SMTP_USER | Usuario SMTP | usuario@empresa.com |
| SMTP_PASS | Contraseña SMTP | password |
| SMTP_SECURE | TLS/SSL | false |
| MAIL_FROM | Remitente emails | no-reply@empresa.local |
| ADMIN_ALERT_EMAIL | Email admin para CC | admin@empresa.local |
| TZ | Zona horaria | Europe/Madrid |
| REPORT_CUTOFF_HOUR | Hora corte notificaciones | 19 |
| REPORT_CUTOFF_MINUTE | Minuto corte notificaciones | 30 |
| GEOFENCE_RADIUS_METERS | Radio geofence en metros | 300 |

---

## Seed (datos demo)

```bash
cd backend
npm run seed
```

### Usuarios demo

| Email | Contraseña | Rol |
|---|---|---|
| admin@empresa.local | Admin123! | admin |
| jefe@empresa.local | Admin123! | manager |
| comercial1@empresa.local | Admin123! | sales |
| comercial2@empresa.local | Admin123! | sales |

---

## Arranque local

### Backend
```bash
cd backend
npm run dev
# Escucha en http://localhost:3001
```

### Frontend
```bash
cd frontend
npm run dev
# Abre http://localhost:5173
```

---

## Tests

```bash
cd backend
npm test
```

Tests incluidos:
- Validador CIF/NIF español
- Cálculo Haversine (distancia geográfica)
- Lógica de cumplimiento (verde/amarillo/rojo)

---

## Geolocalización en desarrollo

- En `localhost` el navegador permite geolocalización sin HTTPS
- En producción **es obligatorio HTTPS** para que `navigator.geolocation` funcione
- Si el navegador deniega la ubicación, el checkout queda bloqueado con mensaje claro

---

## API endpoints principales

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/clients?search=&page=&limit=
POST   /api/clients
GET    /api/clients/suggest?name=&taxId=
POST   /api/clients/:id (actualizar)

POST   /api/activities/checkin
POST   /api/activities/:id/checkout
POST   /api/activities/quick
GET    /api/activities/my?from=&to=
GET    /api/activities/team?from=&to=&userId=

GET    /api/compliance/today
GET    /api/compliance/range?from=&to=
GET    /api/compliance/kpis?from=&to=&scope=

GET    /api/dashboard/kpis
GET    /api/dashboard/commercial-status?date=
GET    /api/dashboard/missing?date=

GET    /api/bi/fact-activities
GET    /api/bi/dim-clients
GET    /api/bi/dim-users
GET    /api/bi/dim-catalogs

GET    /api/audit?entity=&from=&to=
GET    /api/settings
PUT    /api/settings
```

---

## Despliegue on-premise

### Linux (PM2 + Nginx)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Build frontend
cd frontend && npm run build

# Iniciar backend con PM2
cd backend
cp env.example .env && nano .env
pm2 start src/server.js --name sales-tracker-api
pm2 save
pm2 startup

# Servir frontend compilado con Nginx
# Copia dist/ a /var/www/sales-tracker/
# Configura nginx: proxy_pass http://localhost:3001 para /api/
```

Ejemplo configuración Nginx:
```nginx
server {
    listen 80;
    server_name tudominio.local;

    root /var/www/sales-tracker;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Windows (IIS + iisnode o Node directo)

```powershell
# Instalar PM2 en Windows
npm install -g pm2
pm2 start backend\src\server.js --name sales-tracker-api
pm2 save

# IIS: crear Application Pool sin managed code
# Configurar URL Rewrite para proxiar /api/* a localhost:3001
# Servir frontend compilado en IIS como sitio estático
```

---

## Troubleshooting

| Problema | Solución |
|---|---|
| GPS denegado en producción | Asegura HTTPS. El navegador bloquea geolocalización en HTTP salvo localhost |
| MongoDB connection refused | Verifica MONGO_URI y que mongod esté corriendo |
| Emails no se envían | Configura SMTP_HOST/USER/PASS correctamente; en dev los emails se simulan en consola si no hay SMTP |
| CIF/NIF inválido | El sistema valida algoritmo real español; usa el seed para ver ejemplos válidos |
| Token expirado | La sesión expira en JWT_EXPIRES_IN (default 8h); el frontend redirige a /login automáticamente |

---

## Power BI

Conecta Power BI a los endpoints BI con autenticación Bearer:
- `GET /api/bi/fact-activities` → Tabla de hechos
- `GET /api/bi/dim-clients` → Dimensión clientes
- `GET /api/bi/dim-users` → Dimensión usuarios/comerciales
- `GET /api/bi/dim-catalogs` → Dimensiones catálogos

Usa el conector Web de Power BI con header `Authorization: Bearer <token>`.
