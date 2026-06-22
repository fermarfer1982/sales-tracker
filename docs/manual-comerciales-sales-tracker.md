# Manual para comerciales - Sales Tracker

## 1. Objetivo del manual

Este manual explica como debe usar Sales Tracker un comercial en su trabajo diario.

La aplicacion no esta pensada para generar burocracia. Su objetivo es recoger el minimo dato util de cada actividad comercial para que la empresa pueda saber que clientes se visitan, que productos se trabajan, que oportunidades existen, que ventas se cierran y que acciones quedan pendientes.

## 2. Acceso a la aplicacion

1. Abre la URL de Sales Tracker en el navegador.
2. Introduce tu email y contrasena.
3. Pulsa `Entrar`.

Si el navegador muestra un aviso de ubicacion, permite el acceso cuando vayas a iniciar o cerrar visitas. La geolocalizacion sirve para dejar trazabilidad de la visita.

## 3. Pantallas principales del comercial

Como comercial, normalmente trabajaras con estas pantallas:

- `Hoy`: punto de partida diario para iniciar visitas, continuar visitas abiertas y ver seguimientos pendientes.
- `Registro rapido`: para llamadas, emails u otras acciones sin check-in/check-out completo.
- `Mis actividades`: historico de tus registros, visitas, llamadas, seguimientos y ventas.
- `Agenda`: planificacion de visitas y proximas acciones.
- `Clientes`: consulta, alta y edicion de clientes dentro de tu ambito.

## 4. Flujo diario recomendado

1. Entra en `Hoy` al empezar la jornada.
2. Revisa si tienes seguimientos pendientes.
3. Inicia una visita cuando estes con un cliente.
4. Finaliza la visita al terminar, incluyendo productos, resultado, notas y proxima accion si procede.
5. Usa `Registro rapido` para llamadas, emails, ferias, ensayos u otras gestiones que no sean una visita con check-in/check-out.
6. Revisa `Mis actividades` si necesitas consultar un registro anterior, ubicacion GPS o compartir informacion con un companero.

## 5. Iniciar una visita

Usa `Iniciar visita` cuando vayas a registrar una actividad presencial o de campo.

Pasos:

1. Entra en `Hoy`.
2. Pulsa `Iniciar visita`.
3. Busca y selecciona el cliente.
4. Elige el tipo de actividad disponible:
   - `Visita`
   - `Feria`
   - `Ensayo`
5. Permite la ubicacion si el navegador la solicita.
6. Pulsa `Iniciar visita`.

Si el cliente no existe, puedes crearlo desde el buscador usando la opcion de crear cliente nuevo, sin salir del flujo.

## 6. Continuar una visita en curso

Si dejas una visita abierta, la aplicacion la mostrara como actividad en curso.

Para cerrarla:

1. Entra en `Hoy`.
2. Localiza la visita en curso.
3. Entra para continuarla.
4. Completa los datos pendientes.
5. Pulsa `Finalizar visita`.

No es necesario crear una visita nueva si ya hay una en curso.

## 7. Finalizar una visita

Al finalizar una visita debes registrar la informacion minima de valor.

Campos habituales:

- `Productos`: producto o productos trabajados durante la visita.
- `Resultado`: resultado comercial de la actividad.
- `Notas`: resumen claro de lo hablado o acordado.
- `Duracion`: tiempo aproximado si el formulario lo solicita.
- `Venta cerrada`: marcar solo si realmente se ha cerrado una venta.
- `Proxima accion`: fecha y tipo de accion futura si hay que hacer seguimiento.

Las notas deben ser utiles. Evita textos genericos como `ok`, `visitado` o `pendiente`. Mejor indicar que se ha ofrecido, que objecion hubo o que hay que revisar.

Ejemplo de nota correcta:

```text
Se presenta variedad de col lombarda. Cliente interesado en prueba para septiembre. Confirmar disponibilidad y precio la semana que viene.
```

## 8. Registro rapido

Usa `Registro rapido` para registrar actividad comercial que no requiere visita completa.

Ejemplos:

- llamada telefonica
- email importante
- seguimiento comercial
- contacto en feria
- preparacion o resultado de ensayo
- gestion breve con cliente

Pasos:

1. Entra en `Registro rapido`.
2. Selecciona cliente.
3. Selecciona tipo de actividad.
4. Selecciona uno o varios productos relacionados.
5. Indica resultado.
6. Escribe notas.
7. Indica duracion.
8. Si procede, marca venta cerrada o proxima accion.
9. Guarda el registro.

Si el cliente no existe, puedes crearlo desde el propio buscador de cliente.

## 9. Productos trabajados

En visitas y registros rapidos hay un campo de productos.

Este campo sirve para indicar que producto o productos se han tratado durante la actividad, aunque no se haya cerrado venta.

Ejemplos:

- se presenta una variedad nueva
- se habla de un problema con un producto
- se prepara una prueba
- se hace seguimiento de una oferta anterior

Puedes seleccionar varios productos cuando la actividad incluya mas de uno.

## 10. Registrar una venta

Marca `Se ha cerrado una venta` solo cuando haya una venta real.

Al marcarlo, debes informar las lineas de venta:

- producto vendido
- cantidad
- unidad
- precio

Puedes anadir varios productos con `+ Anadir producto`.

## 11. Cantidades y unidades de venta

La cantidad debe introducirse solo con numeros enteros. No uses puntos, comas, simbolos ni decimales.

Unidades disponibles:

- `SE`: semillas
- `PI`: pildoras
- `GR`: gramos

Importante: la aplicacion convierte automaticamente la cantidad a millares al guardar.

Ejemplos:

- Si introduces `1000`, la aplicacion lo normaliza como `1.000`.
- Si introduces `2500`, la aplicacion lo normaliza como `2.500`.
- Si introduces `500`, la aplicacion lo normaliza como `0.500`.

El importe de cada linea se calcula con la cantidad normalizada por el precio indicado.

## 12. Venta directa o con intermediarios

Hay dos formas de registrar una venta.

Venta directa:

- el cliente seleccionado es el cliente al que se vende directamente
- no selecciones intermediarios

Venta con intermediarios:

- la venta se cierra con un cliente
- pero el producto llega a traves de otro cliente o varios clientes de la base de datos
- en `Clientes intermediarios`, selecciona esos clientes

Ejemplo:

```text
La venta se cierra con Agricola Ejemplo, pero el suministro se canaliza a traves de Distribuciones Sur.
Cliente de la actividad: Agricola Ejemplo
Cliente intermediario: Distribuciones Sur
```

Esto permite mantener trazabilidad comercial real.

## 13. Proximas acciones y seguimientos

Cuando rellenes una `Proxima accion`, la aplicacion crea un seguimiento.

Esto aplica a cualquier tipo de proxima accion:

- llamada
- email
- visita
- otra accion

Tambien aplica si la proxima accion nace desde otro seguimiento.

Recomendacion:

- usa proxima accion siempre que haya una tarea comercial concreta futura
- indica fecha realista
- escribe notas de proxima accion claras

Ejemplo:

```text
Proxima accion: 18/05/2026
Tipo: Llamada
Notas: llamar para confirmar si acepta la oferta de nueva variedad.
```

## 14. Agenda

La agenda muestra visitas planificadas, actividades en curso y seguimientos.

En `Acciones y alertas` veras:

- seguimientos vencidos
- seguimientos pendientes
- visitas en curso
- visitas agendadas

Desde la agenda puedes:

- consultar que tienes pendiente
- editar fecha, tipo o notas de un seguimiento
- borrar registros de agenda cuando proceda
- completar seguimientos

Cuando completas un seguimiento, queda reflejado como actividad en `Mis actividades`.

## 15. Mis actividades

`Mis actividades` es tu historico de trabajo.

Desde esta pantalla puedes:

- ver visitas, llamadas, emails, registros rapidos y seguimientos completados
- filtrar por fechas
- entrar al detalle de un registro
- consultar productos tratados
- revisar ventas cerradas
- consultar ubicacion GPS de check-in y check-out
- acceder a la ficha del cliente

Para ver un registro, pulsa el boton de detalle en la fila correspondiente.

## 16. Detalle de un registro

En el detalle puedes consultar toda la informacion registrada:

- cliente
- CIF/NIF
- ciudad y provincia
- tipo de actividad
- productos tratados
- resultado
- duracion
- notas
- venta cerrada
- productos vendidos
- intermediarios
- proxima accion
- GPS de check-in y check-out

Si necesitas compartir una ubicacion con un companero, entra al detalle y abre el enlace de mapa de la ubicacion GPS.

## 17. Clientes

En `Clientes` puedes buscar clientes por nombre, CIF/NIF o ciudad.

Acciones habituales:

- consultar ficha del cliente
- crear cliente nuevo
- editar datos de cliente si tienes permiso
- borrar cliente si procede y la aplicacion lo permite

Antes de crear un cliente nuevo, busca bien para evitar duplicados.

Datos importantes del cliente:

- razon social
- CIF/NIF o documento fiscal
- ciudad
- provincia
- representante
- segmento
- telefono
- email
- notas
- ubicacion GPS si procede

## 18. Buenas practicas de registro

Registra lo importante, no escribas por escribir.

Buenas notas:

- indican que se ha tratado
- indican interes real del cliente
- indican siguiente paso
- indican objeciones, precio, variedad o competencia si aplica

Malas notas:

- `ok`
- `visitado`
- `sin mas`
- `pendiente`

Ejemplo practico:

```text
Cliente interesado en RUBY PERFECTION para proxima campana. Solicita precio y disponibilidad. Revisar tambien alternativa en col lombarda.
```

## 19. Errores frecuentes

### No puedo iniciar o cerrar visita por GPS

Revisa:

- que el navegador tenga permiso de ubicacion
- que el movil tenga GPS activado
- que haya cobertura suficiente
- que no estes en modo privado si bloquea permisos

### No encuentro un cliente

Prueba a buscar por:

- parte del nombre
- CIF/NIF
- ciudad

Si no existe, crea el cliente desde el propio formulario.

### No me deja guardar una venta

Comprueba:

- que cada linea tenga producto
- que la cantidad sea un numero entero
- que hayas elegido unidad `SE`, `PI` o `GR`
- que el precio sea valido

### No veo un seguimiento en Mis actividades

Los seguimientos aparecen en `Mis actividades` cuando se completan. Mientras estan pendientes, debes revisarlos desde `Agenda` o desde `Hoy` si son para el dia.

### Me aparece `No autorizado`

Puede deberse a permisos o a que el cliente no pertenece a tu ambito. Si crees que es incorrecto, comunica el cliente, la accion realizada y la hora aproximada.

## 20. Checklist rapido para el comercial

Antes de terminar el dia, revisa:

- visitas cerradas
- visitas en curso pendientes de cerrar
- registros rapidos importantes guardados
- ventas cerradas informadas con productos, cantidad, unidad y precio
- proximas acciones creadas cuando hay seguimiento real
- seguimientos vencidos o pendientes revisados

## 21. Regla principal

La aplicacion debe ayudarte a dejar trazabilidad comercial con el minimo esfuerzo.

Si una actividad aporta informacion real sobre cliente, producto, oportunidad, venta o siguiente paso, registrala. Si no aporta informacion util, no conviertas el registro en burocracia.
