# Manual de usuario

## 1. Objetivo de la aplicación

Sales Tracker es una aplicación para registrar actividad comercial, planificar visitas, gestionar clientes y supervisar cumplimiento operativo por comercial, manager y administración.

La aplicación está pensada para tres perfiles:

- `sales`: registra visitas, actividad rápida, consulta su agenda y sus clientes.
- `manager`: ve la actividad del equipo comercial, consulta dashboard y puede planificar visitas para comerciales.
- `admin`: administra usuarios, catálogos, configuración, auditoría, registros y supervisión completa.

## 2. Acceso

### Iniciar sesión

1. Accede a la URL de la aplicación.
2. Introduce tu email y contraseña.
3. Pulsa `Entrar`.

### Cerrar sesión

Pulsa `Salir` en la esquina superior derecha.

### Selector de tema

En la barra superior puedes cambiar entre modo `Claro` y `Oscuro`.

## 3. Navegación principal

La barra superior puede mostrar estas opciones según el rol:

- `Hoy`
- `Registro rápido`
- `Mis actividades`
- `Agenda`
- `Clientes`
- `Dashboard`
- `Admin`

## 4. Pantalla `Hoy`

Esta pantalla está orientada al trabajo diario del comercial.

### Qué muestra

- resumen de actividad del día
- actividad actualmente en curso
- seguimientos pendientes para hoy
- accesos rápidos a:
  - `Iniciar visita`
  - `Registro rápido`

### Iniciar una visita

1. Pulsa `Iniciar visita`.
2. Selecciona el cliente.
3. Selecciona el tipo de actividad.
4. Autoriza la geolocalización si el navegador la solicita.
5. Pulsa `Iniciar visita`.

Si existía una visita planificada para ese mismo día, cliente y tipo, la aplicación reutiliza esa visita en lugar de crear otra diferente.

Si el cliente todavía no existe, puedes escribir su nombre y usar `Crear cliente nuevo` sin salir del flujo.

### Finalizar una visita

Con una visita en curso:

1. Selecciona producto.
2. Selecciona resultado.
3. Escribe notas con al menos 10 caracteres.
4. Opcionalmente indica próxima acción y notas.
5. Pulsa `Finalizar visita`.

## 5. Pantalla `Registro rápido`

Sirve para registrar llamadas, correos o actividad comercial sin flujo de check-in/check-out completo.

### Datos necesarios

- fecha
- cliente
- tipo de actividad
- producto
- resultado
- notas
- duración en minutos

### Datos opcionales

- próxima acción
- notas de próxima acción

### Reglas

- las notas deben tener al menos 10 caracteres
- la duración debe ser mayor que 0
- el sistema intenta capturar geolocalización si está disponible
- si el cliente no existe, puedes darlo de alta al momento con `Crear cliente nuevo` y quedará ya seleccionado

## 6. Pantalla `Mis actividades`

Permite consultar el histórico personal de actividad.

### Qué puedes hacer

- filtrar por rango de fechas
- paginar resultados
- ver estado de cada actividad:
  - `Borrador`
  - `En progreso`
  - `Completada`

## 7. Pantalla `Agenda`

La agenda se usa para planificar futuras visitas y controlar alertas operativas.

### Qué muestra

- filtros de agenda
- panel de `Acciones y alertas`
- botón `Nueva visita`
- listado agrupado por día en `Visitas planificadas`

### Filtros de agenda

Permiten:

- elegir rango `Desde` / `Hasta`
- seleccionar `Ver agenda de` un comercial concreto si eres manager o admin
- filtrar por tipo de alerta:
  - `Todas`
  - `Vencidos`
  - `Seguimientos`
  - `En curso`
  - `Agendados`

### Alertas de agenda

La agenda distingue:

- `Vencidos`: seguimientos cuya fecha ya pasó
- `Seguimientos`: seguimientos pendientes dentro del rango
- `En curso`: actividades abiertas
- `Agendados`: visitas futuras todavía en borrador

### Crear una visita planificada

1. Pulsa `Nueva visita`.
2. Selecciona cliente.
3. Selecciona tipo.
4. Selecciona fecha.
5. Escribe notas si lo necesitas.
6. Si eres `manager` o `admin`, selecciona `Asignar visita a`.
7. Pulsa `Agendar visita`.

Si el cliente no existe todavía, puedes crearlo desde el propio buscador de cliente y continuar con la visita planificada sin cambiar de pantalla.

### Reglas importantes de agenda

- el campo `Ver agenda de` solo filtra visualización
- el campo `Asignar visita a` define quién será el propietario real de la visita
- un manager o admin no puede agendar “para sí mismo” por omisión
- no se permite duplicar una visita para el mismo comercial, cliente y día

### Editar o borrar una visita planificada

Solo las visitas en estado `Borrador` pueden editarse o eliminarse desde la agenda.

1. Localiza la visita en `Visitas planificadas`.
2. Pulsa `Editar` o `Borrar`.

## 8. Pantalla `Clientes`

Permite consultar, filtrar, exportar e importar clientes.

### Qué puedes hacer

- buscar por nombre, CIF/NIF o ciudad
- filtrar por zona, segmento y GPS
- exportar el listado a CSV
- crear un nuevo cliente
- importar clientes por CSV con vista previa

### Importación CSV de clientes

Proceso recomendado:

1. Pulsa `Descargar plantilla`.
2. Rellena el fichero CSV.
3. Carga el fichero o pega el contenido.
4. Pulsa `Vista previa`.
5. Revisa filas válidas e inválidas.
6. Pulsa `Importar válidos`.

### Nuevo cliente

Campos principales:

- razón social
- CIF/NIF
- provincia
- ciudad
- zona
- segmento

Opcionales:

- teléfono
- email
- notas
- guardar ubicación actual como geolocalización del cliente

### Duplicados

La aplicación avisa de posibles duplicados al crear cliente si detecta coincidencias por nombre o CIF/NIF.

## 9. Dashboard

Disponible para `manager` y `admin`.

### Qué muestra

- KPIs del rango seleccionado
- estado por comercial
- comerciales sin actividad completada

### Qué puedes hacer

- filtrar por fechas
- filtrar por comercial
- filtrar por zona
- exportar estado y faltantes a CSV
- abrir `Registros` para profundizar

## 10. Administración

Disponible para `admin`.

Dentro del menú `Admin` existen varias áreas.

### 10.1 Catálogos

Permite mantener listas maestras como:

- tipos de actividad
- productos
- resultados
- zonas
- segmentos

### 10.2 Usuarios

Permite:

- crear usuario
- editar usuario
- activar o desactivar
- borrar usuario si no tiene dependencias
- cambiar rol
- asignar zona
- asignar manager
- definir si un manager puede ver toda la red comercial
- exportar usuarios a CSV
- importar usuarios por CSV con vista previa

#### Roles

- `sales`: ve y registra solo su trabajo
- `manager`: ve equipo; si tiene permiso especial puede ver toda la red comercial
- `admin`: control total

### 10.3 Auditoría

Permite revisar trazabilidad de acciones importantes realizadas en el sistema.

### 10.4 Registros

Permite consultar actividad detallada y aplicar filtros avanzados.

### 10.5 Configuración

Permite ajustar parámetros del sistema, entre otros:

- hora y minuto de corte
- zona horaria
- radio de geofence
- precisión GPS máxima permitida
- email de alertas administrativas

## 11. Reglas de permisos

### Sales

- puede registrar actividad propia
- puede ver su agenda
- puede ver y crear clientes dentro de su ámbito
- no puede entrar a dashboard
- no puede entrar a administración

### Manager

- puede ver dashboard
- puede ver agenda del equipo comercial permitido
- puede planificar visitas para comerciales de su ámbito
- no puede entrar a administración de usuarios

### Admin

- ve todo
- administra usuarios, catálogos, auditoría, configuración y registros

## 12. Exportaciones e importaciones CSV

Actualmente existen exportaciones o importaciones en varias áreas.

### Exportación

Disponible en:

- clientes
- usuarios
- dashboard
- registros
- auditoría

### Importación con vista previa

Disponible en:

- clientes
- usuarios

Recomendación:

- usar siempre la plantilla descargable
- validar con `Vista previa` antes de importar

## 13. Geolocalización

Varias operaciones dependen del GPS del dispositivo.

### Buenas prácticas

- conceder permiso de ubicación al navegador
- esperar a que la precisión sea aceptable
- trabajar con buena cobertura GPS

### Posibles estados

- ubicación correcta
- permiso denegado
- no disponible
- timeout

Si la geolocalización falla, la aplicación puede impedir el flujo según el tipo de operación y la configuración vigente.

## 14. Mensajes y errores frecuentes

### `Cuenta desactivada`

El usuario existe, pero está inactivo. Debe ser reactivado por administración.

### `Error de validación`

Algún dato obligatorio es incorrecto o falta. Revisa campos del formulario.

### `Ya existe una visita agendada para este comercial y cliente en esa fecha`

La agenda no permite duplicados del mismo cliente/comercial/día.

### `No autorizado`

El usuario no tiene permisos para esa operación o está fuera de su ámbito de visibilidad.

### Problemas de GPS

Revisa:

- permisos del navegador
- cobertura
- precisión del dispositivo

## 15. Recomendaciones de uso

- usa `Hoy` para operar y `Agenda` para planificar
- evita usar `Registro rápido` cuando realmente vas a hacer visita con check-in/check-out
- antes de importar CSV, usa siempre la vista previa
- para managers, usa el dashboard para detectar faltantes y la agenda para planificar acción
- para admins, revisa periódicamente usuarios, configuración y auditoría

## 16. Flujo recomendado por perfil

### Comercial

1. Revisar `Hoy`
2. Atender seguimientos pendientes
3. Iniciar y cerrar visitas
4. Usar `Registro rápido` para llamadas o correos
5. Consultar `Mis actividades`

### Manager

1. Revisar `Dashboard`
2. Detectar comerciales sin actividad o con incidencias
3. Entrar en `Agenda`
4. Filtrar por comercial
5. Planificar visitas del equipo

### Admin

1. Supervisar `Dashboard`
2. Mantener `Usuarios`
3. Mantener `Catálogos`
4. Ajustar `Configuración`
5. Revisar `Auditoría`

## 17. Soporte interno

Si algo no cuadra en operación:

1. anota pantalla y acción realizada
2. copia el mensaje de error exacto
3. indica usuario afectado y hora aproximada
4. si aplica, adjunta el CSV usado o el cliente afectado

Esto acelera mucho el diagnóstico técnico.
