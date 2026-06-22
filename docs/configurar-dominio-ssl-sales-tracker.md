# Configurar dominio y SSL válido para Sales Tracker

## Objetivo

Evitar el aviso del navegador `La conexión no es privada` al entrar en Sales Tracker.

La solución correcta es dejar de entrar por IP (`https://TU_DOMINIO_O_IP`) y entrar por un nombre DNS con certificado válido, por ejemplo:

```text
https://sales-tracker.empresa.com
```

## Parte que tienes que hacer tú

### 1. Nombre de acceso elegido

Nombre elegido:

```text
sales-tracker.empresa.local
```

### 2. Crear el registro DNS

El registro debe apuntar a la IP del servidor:

```text
sales-tracker.empresa.local  A  IP_DEL_SERVIDOR
```

Si el DNS es interno, se crea en el servidor DNS de la empresa.

Si el DNS es público, se crea donde tengáis gestionado el dominio.

### 3. Confirmar que resuelve

Desde un PC de la red, ejecuta:

```powershell
nslookup sales-tracker.empresa.local
```

Debe devolver:

```text
IP_DEL_SERVIDOR
```

### 4. Decidir tipo de certificado

Opción para este caso:

Usar la CA interna de Windows Server 2019 / Active Directory Certificate Services.

La CSR ya está generada en el servidor Linux:

```text
/var/www/sales-tracker/certs/sales-tracker.empresa.local.csr
```

La clave privada queda en el servidor y no debe copiarse fuera:

```text
/var/www/sales-tracker/certs/sales-tracker.empresa.local.key
```

La CSR incluye:

```text
DNS:sales-tracker.empresa.local
IP:IP_DEL_SERVIDOR
```

## Firmar la CSR en Windows Server 2019

En el controlador de dominio o servidor con CA:

1. Copia el fichero CSR al servidor Windows:

```text
/var/www/sales-tracker/certs/sales-tracker.empresa.local.csr
```

2. Abre `Certification Authority`.
3. Clic derecho sobre la CA.
4. `All Tasks`.
5. `Submit new request...`.
6. Selecciona `sales-tracker.empresa.local.csr`.
7. Si queda pendiente, ve a `Pending Requests`, clic derecho y `Issue`.
8. Ve a `Issued Certificates`.
9. Abre el certificado emitido.
10. Exporta en formato `Base-64 encoded X.509 (.CER)`.

Nombra el certificado exportado como:

```text
sales-tracker.empresa.local.cer
```

Después copia ese `.cer` al servidor Linux en:

```text
/var/www/sales-tracker/certs/sales-tracker.empresa.local.cer
```

## Parte que hago yo en el servidor

Cuando esté el `.cer` en el servidor, haré:

1. Copiar certificado y clave a `/etc/nginx/ssl`.
2. Cambiar Nginx para usar `sales-tracker.empresa.local`.
3. Instalar el certificado emitido por la CA interna.
4. Actualizar variables de entorno si hace falta.
5. Probar `nginx -t`.
6. Recargar Nginx.
7. Verificar acceso por HTTPS.

## Configuración Nginx objetivo

Ejemplo para dominio:

```nginx
server {
    listen 80;
    server_name sales-tracker.empresa.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name sales-tracker.empresa.local;

    ssl_certificate     /etc/nginx/ssl/sales-tracker.empresa.local.crt;
    ssl_certificate_key /etc/nginx/ssl/sales-tracker.empresa.local.key;

    root /var/www/sales-tracker/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Comprobaciones finales

Desde un PC:

```text
https://sales-tracker.empresa.local
```

Debe abrir sin aviso de seguridad.

Desde servidor:

```bash
curl -I https://sales-tracker.empresa.local
curl -I https://sales-tracker.empresa.local/api/health
```

Debe responder `200` o redirección esperada sin error de certificado.
