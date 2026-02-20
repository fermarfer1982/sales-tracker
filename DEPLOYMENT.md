# Guía de despliegue en producción (on-premise)
## Para principiantes — paso a paso

---

## Índice

1. [¿Qué necesitas?](#1-qué-necesitas)
2. [Preparar el servidor](#2-preparar-el-servidor)
3. [Instalar Node.js](#3-instalar-nodejs)
4. [Instalar MongoDB](#4-instalar-mongodb)
5. [Subir el código al servidor](#5-subir-el-código-al-servidor)
6. [Configurar el backend](#6-configurar-el-backend)
7. [Compilar el frontend](#7-compilar-el-frontend)
8. [Instalar y configurar PM2](#8-instalar-y-configurar-pm2)
9. [Instalar y configurar Nginx](#9-instalar-y-configurar-nginx)
10. [Configurar HTTPS (SSL)](#10-configurar-https-ssl)
11. [Cargar datos iniciales (seed)](#11-cargar-datos-iniciales-seed)
12. [Verificar que todo funciona](#12-verificar-que-todo-funciona)
13. [Mantenimiento básico](#13-mantenimiento-básico)
14. [Solución de problemas comunes](#14-solución-de-problemas-comunes)

---

## 1. ¿Qué necesitas?

### Servidor recomendado

Un servidor Linux (Ubuntu 22.04 LTS es la opción más sencilla). Puede ser:
- Un ordenador viejo en la oficina con Ubuntu instalado
- Una máquina virtual (VirtualBox, VMware, Hyper-V)
- Un NAS con soporte Docker (alternativa, no se cubre aquí)

### Requisitos mínimos del servidor

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB | 50 GB |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |

### Herramientas en tu PC (para conectarte al servidor)

- **Windows**: instala [PuTTY](https://www.putty.org/) o usa PowerShell con SSH
- **Mac/Linux**: ya tiene SSH instalado
- **Opcional**: [WinSCP](https://winscp.net/) para transferir archivos fácilmente

### Red

- El servidor debe tener IP fija en la red local (ej: `192.168.1.100`)
- Los comerciales accederán a esa IP desde la misma red o VPN
- Para GPS en producción **NECESITAS HTTPS** (ver paso 10)

---

## 2. Preparar el servidor

### 2.1 Conectarse al servidor

Desde tu PC con Windows, abre PowerShell y escribe:

```powershell
ssh usuario@192.168.1.100
```

> Sustituye `usuario` por el nombre de usuario del servidor y `192.168.1.100` por la IP real.
> La primera vez te pedirá confirmar la huella digital. Escribe `yes` y pulsa Enter.

### 2.2 Actualizar el sistema

Una vez conectado, ejecuta estos comandos uno a uno:

```bash
sudo apt update
```
> Te pedirá tu contraseña. Escríbela (no se ve mientras escribes, es normal) y pulsa Enter.

```bash
sudo apt upgrade -y
```
> Este comando puede tardar varios minutos. Espera a que termine.

```bash
sudo apt install -y curl wget git build-essential
```

### 2.3 Configurar el firewall básico

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```
> Cuando pregunte `"Proceed with operation (y|n)?"` escribe `y` y pulsa Enter.

Comprueba que está activo:
```bash
sudo ufw status
```
Deberías ver:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## 3. Instalar Node.js

Usaremos la versión 20 LTS (la más estable).

### 3.1 Instalar NVM (gestor de versiones de Node)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Aplica los cambios en la sesión actual:
```bash
source ~/.bashrc
```

Verifica que NVM está instalado:
```bash
nvm --version
```
Deberías ver algo como `0.39.7`.

### 3.2 Instalar Node.js 20

```bash
nvm install 20
nvm use 20
nvm alias default 20
```

Verifica la instalación:
```bash
node --version
npm --version
```
Deberías ver `v20.x.x` y `10.x.x` respectivamente.

---

## 4. Instalar MongoDB

### 4.1 Importar la clave y el repositorio oficial

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### 4.2 Instalar MongoDB

```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 4.3 Iniciar MongoDB y habilitarlo al arranque

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

Verifica que está corriendo:
```bash
sudo systemctl status mongod
```
Deberías ver `Active: active (running)`.

### 4.4 Proteger MongoDB con contraseña

Por defecto MongoDB no tiene contraseña. En una red interna puede ser aceptable, pero es mejor protegerlo:

```bash
mongosh
```

Una vez dentro del shell de MongoDB:
```javascript
use admin
db.createUser({
  user: "salestracker",
  pwd: "TuPasswordSeguro123!",
  roles: [{ role: "readWrite", db: "sales_tracker" }]
})
exit
```

Habilita la autenticación:
```bash
sudo nano /etc/mongod.conf
```

Busca la sección `#security:` y cámbiala a:
```yaml
security:
  authorization: enabled
```

> En nano: usa las flechas para moverte, edita el texto, luego `Ctrl+O` para guardar y `Ctrl+X` para salir.

Reinicia MongoDB:
```bash
sudo systemctl restart mongod
```

> Si usas contraseña en MongoDB, tu `MONGO_URI` será:
> `mongodb://salestracker:TuPasswordSeguro123!@localhost:27017/sales_tracker`

---

## 5. Subir el código al servidor

Tienes dos opciones:

### Opción A: Clonar desde GitHub (recomendado)

Si has subido el código a GitHub:
```bash
cd /var/www
sudo mkdir sales-tracker
sudo chown $USER:$USER sales-tracker
cd sales-tracker
git clone https://github.com/TU_USUARIO/TU_REPO.git .
```

### Opción B: Subir con SCP desde tu PC Windows

Desde PowerShell en tu PC:
```powershell
scp -r "C:\Users\fernando.martinez\Documents\verdent-projects\new-project\*" usuario@192.168.1.100:/var/www/sales-tracker/
```

> Esto copia todos los archivos. Puede tardar un minuto.

### Verificar que el código llegó

```bash
ls /var/www/sales-tracker/
```
Deberías ver: `backend/  frontend/  README.md  .gitignore  ecosystem.config.js`

---

## 6. Configurar el backend

### 6.1 Instalar dependencias

```bash
cd /var/www/sales-tracker/backend
npm install
```

Espera a que termine. Verás mensajes sobre paquetes instalados.

### 6.2 Crear el archivo de configuración

```bash
cp env.example .env
nano .env
```

Edita cada línea con tus valores reales:

```env
PORT=3001
MONGO_URI=mongodb://salestracker:TuPasswordSeguro123!@localhost:27017/sales_tracker
JWT_SECRET=EscribeAquiUnaClaveLargaYAleatoria_Ejemplo_xK9pL2mN8qR5sT3vW7yA
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://tudominio.local
SMTP_HOST=smtp.tuempresa.com
SMTP_PORT=587
SMTP_USER=no-reply@tuempresa.com
SMTP_PASS=contraseña_smtp
SMTP_SECURE=false
MAIL_FROM="Sales Tracker <no-reply@tuempresa.com>"
ADMIN_ALERT_EMAIL=admin@tuempresa.com
TZ=Europe/Madrid
REPORT_CUTOFF_HOUR=19
REPORT_CUTOFF_MINUTE=30
GEOFENCE_RADIUS_METERS=300
NODE_ENV=production
APP_URL=https://tudominio.local
```

> **IMPORTANTE**: El `JWT_SECRET` debe ser una cadena larga y aleatoria. Nunca uses el ejemplo tal cual.
> Puedes generar uno con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Guarda: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 6.3 Verificar que el backend arranca

Prueba que funciona antes de configurar PM2:
```bash
node src/server.js
```

Deberías ver:
```
[MongoDB] Conectado: mongodb://localhost:27017/sales_tracker
[Server] Escuchando en puerto 3001 (production)
```

Pulsa `Ctrl+C` para detenerlo (lo arrancaremos con PM2 en el siguiente paso).

---

## 7. Compilar el frontend

### 7.1 Crear el archivo de configuración de producción

El frontend necesita saber la URL del backend. En producción, como Nginx hará de proxy, no necesitas cambiar nada si la URL es la misma.

Crea el archivo de variables de entorno para producción:
```bash
cd /var/www/sales-tracker/frontend
nano .env.production
```

Escribe:
```env
VITE_API_URL=/api
```

Guarda: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 7.2 Instalar dependencias del frontend

```bash
npm install
```

### 7.3 Compilar para producción

```bash
npm run build
```

Esto crea la carpeta `dist/` con el frontend listo para servir.

Verifica que se creó:
```bash
ls dist/
```
Deberías ver: `index.html  assets/`

---

## 8. Instalar y configurar PM2

PM2 es el gestor de procesos que mantiene el backend corriendo aunque cierres la sesión SSH o el servidor se reinicie.

### 8.1 Instalar PM2 globalmente

```bash
npm install -g pm2
```

### 8.2 Iniciar el backend con PM2

```bash
cd /var/www/sales-tracker
pm2 start ecosystem.config.js
```

Verifica que está corriendo:
```bash
pm2 status
```

Deberías ver algo como:
```
┌─────┬──────────────────────┬─────────────┬──────┬───────────┬──────────┐
│ id  │ name                 │ namespace   │ mode │ status    │ uptime   │
├─────┼──────────────────────┼─────────────┼──────┼───────────┼──────────┤
│ 0   │ sales-tracker-api    │ default     │ fork │ online    │ 0s       │
└─────┴──────────────────────┴─────────────┴──────┴───────────┴──────────┘
```

### 8.3 Ver los logs del backend

```bash
pm2 logs sales-tracker-api
```

Pulsa `Ctrl+C` para salir de los logs (el proceso sigue corriendo).

### 8.4 Hacer que PM2 arranque automáticamente con el servidor

```bash
pm2 startup
```

Esto te dará un comando para copiar y pegar. Ejecútalo. Luego:
```bash
pm2 save
```

> Ahora PM2 arrancará solo cuando el servidor se reinicie.

---

## 9. Instalar y configurar Nginx

Nginx actuará como proxy inverso: recibirá las peticiones del navegador y las redirigirá al backend (Node.js) o servirá el frontend directamente.

### 9.1 Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Verifica que funciona:
```bash
sudo systemctl status nginx
```
Deberías ver `Active: active (running)`.

### 9.2 Crear la configuración del sitio

```bash
sudo nano /etc/nginx/sites-available/sales-tracker
```

Pega esta configuración (sin HTTPS de momento, lo añadimos en el paso 10):

```nginx
server {
    listen 80;
    server_name 192.168.1.100;  # Cambia por tu IP o dominio local

    # Servir el frontend compilado
    root /var/www/sales-tracker/frontend/dist;
    index index.html;

    # Proxy del backend (todas las rutas /api/* van a Node.js)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router: todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Guarda: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 9.3 Activar el sitio y reiniciar Nginx

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/sales-tracker /etc/nginx/sites-enabled/

# Desactivar el sitio por defecto de Nginx
sudo rm /etc/nginx/sites-enabled/default

# Verificar que la configuración es correcta
sudo nginx -t
```

Deberías ver:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Si hay errores, revisa el archivo de configuración.

```bash
# Reiniciar Nginx
sudo systemctl restart nginx
```

### 9.4 Probar el acceso

Desde tu PC, abre el navegador y ve a: `http://192.168.1.100`

Deberías ver la pantalla de login de Sales Tracker.

> Si no funciona, revisa que el firewall permite el puerto 80: `sudo ufw status`

---

## 10. Configurar HTTPS (SSL)

**Este paso es obligatorio para que la geolocalización funcione en los móviles.**

Los navegadores modernos bloquean el acceso al GPS en páginas HTTP (solo lo permiten en HTTPS o localhost).

### Opción A: Certificado autofirmado (red interna, sin dominio público)

Esta opción funciona para uso interno. El navegador mostrará una advertencia la primera vez, pero funciona.

#### 10.1 Generar el certificado

```bash
sudo mkdir /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/sales-tracker.key \
    -out /etc/nginx/ssl/sales-tracker.crt \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=MiEmpresa/CN=192.168.1.100"
```

> Cambia `192.168.1.100` por tu IP real.
> `-days 3650` = válido 10 años.

#### 10.2 Actualizar la configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/sales-tracker
```

Reemplaza todo el contenido con:

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name 192.168.1.100;
    return 301 https://$host$request_uri;
}

# Servidor HTTPS principal
server {
    listen 443 ssl;
    server_name 192.168.1.100;

    ssl_certificate /etc/nginx/ssl/sales-tracker.crt;
    ssl_certificate_key /etc/nginx/ssl/sales-tracker.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/sales-tracker/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Guarda, verifica y reinicia:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

Actualiza el `.env` del backend con la nueva URL HTTPS:
```bash
nano /var/www/sales-tracker/backend/.env
```
Cambia:
```
CORS_ORIGIN=https://192.168.1.100
APP_URL=https://192.168.1.100
```

Reinicia el backend:
```bash
pm2 restart sales-tracker-api
```

#### 10.3 Aceptar el certificado en los dispositivos

La primera vez que un comercial abra la app en su móvil:
1. Verá un aviso de "Conexión no segura" o "Advertencia de privacidad"
2. Debe pulsar **"Avanzado"** o **"Más información"**
3. Luego **"Continuar de todos modos"** o **"Aceptar el riesgo"**
4. A partir de ahí el GPS funcionará correctamente

> Para evitar esta advertencia, puedes importar el certificado `.crt` en los dispositivos Android/iOS como certificado de confianza. Pide ayuda a IT si no sabes cómo hacerlo.

---

### Opción B: Certificado Let's Encrypt (si tienes dominio público)

Si la app está accesible desde internet con un dominio real (ej: `sales.tuempresa.com`):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sales.tuempresa.com
```

Sigue las instrucciones. Certbot configura el HTTPS automáticamente y renueva el certificado solo.

---

## 11. Cargar datos iniciales (seed)

Esto crea los usuarios demo, catálogos y clientes de prueba:

```bash
cd /var/www/sales-tracker/backend
npm run seed
```

Deberías ver:
```
[Seed] Conectado a MongoDB
[Seed] Colecciones limpiadas
[Seed] Catálogos creados
[Seed] Configuración por defecto creada
[Seed] Usuarios creados
[Seed] Clientes creados
[Seed] Actividades demo creadas

[Seed] COMPLETADO ✓
----------------------------
Usuarios demo:
  admin@empresa.local      / Admin123!  (admin)
  jefe@empresa.local       / Admin123!  (manager)
  comercial1@empresa.local / Admin123!  (sales)
  comercial2@empresa.local / Admin123!  (sales)
----------------------------
```

> **¡IMPORTANTE!** En producción real, después de probar, **cambia las contraseñas** de los usuarios demo desde la interfaz de admin o vuelve a crear usuarios con contraseñas seguras.

---

## 12. Verificar que todo funciona

### 12.1 Comprobaciones básicas

Desde el servidor:
```bash
# Backend responde
curl http://localhost:3001/api/health

# Nginx responde
curl -k https://192.168.1.100/api/health
```

Deberías ver: `{"status":"ok","ts":"2026-..."}`

### 12.2 Estado de los servicios

```bash
# Estado de PM2 (backend)
pm2 status

# Estado de Nginx
sudo systemctl status nginx

# Estado de MongoDB
sudo systemctl status mongod
```

Los tres deben aparecer como `running` / `active`.

### 12.3 Prueba completa desde el navegador

1. Abre `https://192.168.1.100` en Chrome o Firefox
2. Acepta el certificado si es autofirmado
3. Inicia sesión con `admin@empresa.local` / `Admin123!`
4. Navega por el menú: Clientes, Dashboard, Admin → Catálogos
5. Abre en el **móvil** desde la misma red WiFi
6. Inicia sesión como `comercial1@empresa.local` / `Admin123!`
7. Pulsa "Iniciar visita" — el navegador te pedirá permiso para usar el GPS. **Acepta**.
8. Selecciona cliente y tipo. Pulsa el botón verde.
9. Deberías ver el GPS capturado y poder finalizar la visita.

---

## 13. Mantenimiento básico

### Ver logs del backend en tiempo real

```bash
pm2 logs sales-tracker-api --lines 100
```

### Reiniciar el backend (tras cambios en el .env o código)

```bash
cd /var/www/sales-tracker/backend
pm2 restart sales-tracker-api
```

### Actualizar el código desde GitHub

```bash
cd /var/www/sales-tracker
git pull origin main

# Backend: reinstalar dependencias si cambiaron
cd backend
npm install
pm2 restart sales-tracker-api

# Frontend: recompilar si cambiaron páginas
cd ../frontend
npm install
npm run build
```

> No necesitas reiniciar Nginx al recompilar el frontend.

### Hacer copia de seguridad de la base de datos

```bash
mongodump --uri="mongodb://salestracker:TuPasswordSeguro123!@localhost:27017/sales_tracker" --out=/backup/sales-tracker-$(date +%Y%m%d)
```

Automatiza con cron para que se ejecute cada noche:
```bash
crontab -e
```
Añade al final:
```
0 2 * * * mongodump --uri="mongodb://salestracker:TuPasswordSeguro123!@localhost:27017/sales_tracker" --out=/backup/sales-tracker-$(date +\%Y\%m\%d) && find /backup -name "sales-tracker-*" -mtime +30 -exec rm -rf {} \;
```
> Esto hace backup a las 2:00 AM cada día y elimina backups de más de 30 días.

### Monitorizar el servidor

```bash
# Ver uso de CPU, RAM y procesos PM2 en tiempo real
pm2 monit

# Ver espacio en disco
df -h

# Ver uso de RAM
free -h
```

---

## 14. Solución de problemas comunes

### "502 Bad Gateway" en el navegador

El backend no está corriendo.

```bash
pm2 status
pm2 logs sales-tracker-api --lines 50
```

Busca errores en los logs. Causas frecuentes:
- MongoDB no está corriendo: `sudo systemctl start mongod`
- Error en el `.env` (URI de Mongo mal escrita, puerto ocupado)
- Reinicia con: `pm2 restart sales-tracker-api`

---

### "GPS denegado" o el botón de visita no funciona

Causas:
1. **No tienes HTTPS**: el GPS solo funciona en HTTPS (o localhost). Revisa el paso 10.
2. **El usuario negó el permiso**: en el móvil, ve a Ajustes del navegador → Permisos del sitio → Ubicación → Permite para tu dominio.
3. **GPS del móvil desactivado**: activa la ubicación en los ajustes del teléfono.

---

### La app no carga, solo sale pantalla en blanco

```bash
# Verifica que el build existe
ls /var/www/sales-tracker/frontend/dist/

# Si está vacío, recompila
cd /var/www/sales-tracker/frontend
npm run build

# Verifica los permisos de la carpeta
sudo chown -R www-data:www-data /var/www/sales-tracker/frontend/dist
```

---

### "CIF/NIF inválido" al crear un cliente

El sistema valida el algoritmo real español. Usa el seed para ver ejemplos válidos:
- `B12345674` (CIF empresa)
- `12345678Z` (NIF persona física)
- `F28765432` (CIF cooperativa)

---

### No llegan los emails de notificación

1. Verifica la configuración SMTP en el `.env`
2. Comprueba los logs: `pm2 logs sales-tracker-api | grep Email`
3. Si no hay SMTP configurado, los emails se simulan solo en consola (no se envían)
4. Prueba con Gmail: usa `smtp.gmail.com`, puerto `587`, y una contraseña de aplicación (no tu contraseña normal)

---

### "No se puede conectar a MongoDB"

```bash
# Verifica que MongoDB está corriendo
sudo systemctl status mongod

# Si no está corriendo
sudo systemctl start mongod

# Revisa el log de MongoDB
sudo journalctl -u mongod --lines 50
```

---

### El servidor se quedó sin espacio en disco

```bash
# Ver cuánto ocupa cada carpeta
du -sh /var/www/sales-tracker/*
du -sh /backup/*

# Limpiar logs de PM2
pm2 flush

# Eliminar backups antiguos
find /backup -name "sales-tracker-*" -mtime +7 -exec rm -rf {} \;
```

---

## Resumen rápido de comandos útiles

| Tarea | Comando |
|-------|---------|
| Ver estado del backend | `pm2 status` |
| Ver logs en tiempo real | `pm2 logs sales-tracker-api` |
| Reiniciar backend | `pm2 restart sales-tracker-api` |
| Parar backend | `pm2 stop sales-tracker-api` |
| Reiniciar Nginx | `sudo systemctl restart nginx` |
| Ver logs de Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Reiniciar MongoDB | `sudo systemctl restart mongod` |
| Hacer backup | `mongodump --uri="..." --out=/backup/hoy` |
| Actualizar código | `git pull && npm install && pm2 restart ...` |
| Recompilar frontend | `cd frontend && npm run build` |

---

*Guía generada para Sales Tracker v1.0 — Última actualización: Febrero 2026*
