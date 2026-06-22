# Sales Tracker: de vender a ciegas a vender con datos

## 1. Título: Sales Tracker: de vender a ciegas a vender con datos

**Mensaje principal**

Pasar de percepción y Excel incompleto a información operativa real, comparable y accionable, sin añadir burocracia innecesaria al trabajo comercial.

**Bullet points**

- Sales Tracker ya existe como base operativa real para registrar actividad comercial.
- El objetivo no es controlar más, sino entender mejor qué está pasando en cliente, zona y equipo.
- La clave es capturar el mínimo dato útil, en el momento en que ocurre la actividad.
- La propuesta es implantarlo como piloto controlado, no como despliegue masivo sin aprendizaje.

**KPIs que podrían mostrarse**

- % de actividad registrada sobre actividad estimada.
- % de visitas con geolocalización válida.
- Nº de clientes con ficha completa.
- Nº de seguimientos pendientes vs. ejecutados.

**Gráfico sugerido**

- Antes / después:
  - `Antes`: datos dispersos, ratios dudosos, decisiones reactivas.
  - `Después`: actividad estructurada, trazabilidad y análisis por comercial real.

**Notas para el presentador**

- Abrir con una idea simple: hoy vendemos con mucho esfuerzo, pero todavía con poca visibilidad real.
- Enfatizar que esto no es un CRM pesado, sino una capa de captura operativa.

---

## 2. Situación actual

**Mensaje principal**

Hoy la empresa tiene actividad comercial, pero no siempre tiene dato fiable sobre esa actividad.

**Bullet points**

- Parte de la información comercial se pierde o llega tarde.
- Hay registros agregados por representante o por zona, pero no siempre por comercial real.
- Los ratios resultantes mezclan personas, territorios y formas de trabajar distintas.
- La dirección acaba tomando decisiones con visibilidad parcial:
  - dónde se visita más
  - dónde se convierte mejor
  - qué zonas requieren refuerzo
  - qué comerciales necesitan apoyo o reasignación
- El problema no es falta de trabajo comercial; es falta de trazabilidad homogénea.

**Ejemplo realista**

- Un representante informa 40 visitas/semana.
- En realidad esas 40 visitas proceden de 3 comerciales distintos.
- El ratio de conversión parece correcto a nivel agregado, pero no permite saber:
  - quién genera el resultado
  - quién necesita acompañamiento
  - qué zona funciona mejor

**KPIs que hoy son débiles o poco fiables**

- visitas por comercial
- duración media de visita
- clientes nuevos por comercial
- seguimiento ejecutado vs. pendiente
- actividad real por zona

**Notas para el presentador**

- No culpar a la red comercial.
- Plantear que el modelo actual no facilita medir bien, aunque la gente trabaje.

---

## 3. Qué información estamos perdiendo

**Mensaje principal**

La empresa no solo pierde “datos”; pierde capacidad de priorizar, corregir y escalar lo que funciona.

**Bullet points**

- Cliente real visitado y frecuencia real de contacto.
- Qué tipo de actividad genera más avance:
  - visita
  - llamada
  - email
  - feria
- Resultado real de cada interacción.
- Tiempo invertido por comercial.
- Seguimiento acordado y si se ejecuta o se pierde.
- Cobertura geográfica real y calidad del dato de visita.
- Diferencias de rendimiento entre comerciales, no entre agregados.

**Ejemplos concretos de pérdida**

- No saber qué clientes han quedado sin seguimiento en 15 días.
- No saber si una zona tiene baja actividad o simplemente mala trazabilidad.
- No poder distinguir entre:
  - “no hay oportunidad”
  - “sí la hay, pero nadie la está registrando”
- No poder explicar con precisión por qué un territorio rinde mejor que otro.

**KPIs que se bloquean por esta pérdida**

- clientes activos últimos 30 días
- cobertura de cartera
- ratio de seguimiento cumplido
- tiempo comercial efectivo
- densidad de actividad por zona

**Gráfico sugerido**

- Embudo de pérdida de información:
  - trabajo comercial real
  - dato parcial registrado
  - dato útil para análisis
  - dato comparable para decisión

**Notas para el presentador**

- El mensaje no es “faltan informes”.
- El mensaje es “faltan hechos trazables y comparables”.

---

## 4. Qué datos recoge la aplicación

**Mensaje principal**

Sales Tracker ya captura un núcleo de datos operativos suficiente para empezar a medir de forma seria.

**Funcionalidades reales detectadas en el repo**

- Registro de actividad comercial en dos modos:
  - visita con `check-in / check-out`
  - registro rápido para llamada, email u otras acciones
- Agenda comercial:
  - planificación de visitas futuras
  - alertas de seguimientos pendientes o vencidos
  - visitas en borrador o en curso
- Gestión de clientes:
  - alta y edición
  - importación/exportación CSV
  - sugerencia de duplicados
  - geolocalización del cliente
- Gestión de usuarios:
  - comerciales, managers y admins
  - zona, responsable y visibilidad global de red
  - activación/desactivación
  - importación/exportación CSV
- Dashboard y reporting operativo:
  - KPIs
  - cumplimiento verde/amarillo/rojo
  - comerciales sin actividad completada
- Revisión y auditoría:
  - detalle completo de registro
  - logs de auditoría
- Integración analítica:
  - endpoints BI para hechos y dimensiones

**Campos que hoy se pueden recoger realmente**

### Usuario comercial

- nombre
- email
- rol
- zona
- manager asignado
- visibilidad global o no de la red
- estado activo/inactivo

### Cliente

- razón social
- CIF/NIF
- provincia
- ciudad
- zona
- segmento
- teléfono
- email
- notas
- geolocalización del cliente
- creador del cliente

### Actividad comercial

- comercial responsable
- fecha de actividad
- cliente
- tipo de actividad
- producto
- resultado
- notas
- duración en minutos
- próxima acción
- notas de próxima acción
- estado:
  - borrador
  - en progreso
  - completada

### Trazabilidad GPS

- hora de check-in
- GPS de check-in
- hora de check-out
- GPS de check-out
- precisión GPS
- distancia al cliente
- validación geofence dentro/fuera de zona esperada

### Catálogos maestros

- tipos de actividad
- productos
- resultados
- zonas
- segmentos

**Importante para no sobredimensionar**

- Hoy no existe una entidad formal específica de:
  - oportunidad
  - variedad
  - pipeline comercial
- Pero sí existe la base para evolucionar hacia ello:
  - cliente
  - actividad
  - producto
  - resultado
  - seguimiento
  - responsable
  - geografía

**Ejemplo de registro realista**

- Fecha: `2026-04-28`
- Comercial: `Ana López`
- Zona: `Almería Poniente`
- Cliente: `Semilleros Costa Sur`
- Tipo: `visita`
- Producto: `Pimiento California`
- Resultado: `seguimiento`
- Duración: `52 min`
- Próxima acción: `2026-05-05`
- Distancia a cliente: `42 m`
- Geofence: `dentro de zona`

**Notas para el presentador**

- Este bloque es crítico: demuestra que la app ya no es “idea”, sino herramienta operativa funcional.
- Conviene remarcar que los datos recogidos son muy cercanos a la realidad del trabajo diario.

---

## 5. Qué valor aporta a Dirección

**Mensaje principal**

Permite dejar de gestionar por sensación agregada y empezar a gestionar por evidencia.

**Bullet points**

- Visibilidad real del volumen de actividad por comercial, zona y periodo.
- Trazabilidad del esfuerzo comercial, no solo del resultado final.
- Posibilidad de detectar huecos operativos:
  - zonas con baja actividad
  - clientes sin seguimiento
  - comerciales sin actividad completada
- Base fiable para decisiones de:
  - estructura comercial
  - asignación de zonas
  - refuerzo de equipos
  - foco de cartera
- Más capacidad de defender decisiones ante dirección general con dato objetivo.

**KPIs ejecutivos**

- actividad total y completada
- tasa de cumplimiento
- clientes nuevos captados
- ratio de seguimiento vencido
- actividad media por comercial real
- duración media de visita
- cobertura de clientes por zona

**Ejemplo de cuadro ejecutivo**

| KPI | Abril | Objetivo | Comentario |
|---|---:|---:|---|
| Actividades registradas | 486 | 450 | Por encima de objetivo |
| Actividades completadas | 412 | 400 | Buen nivel operativo |
| Tasa de cumplimiento | 84,8% | 80,0% | Correcta |
| Clientes nuevos | 37 | 25 | Muy positiva |
| Seguimientos vencidos | 29 | <20 | Punto de mejora |

**Gráfico sugerido**

- KPI cards de dirección:
  - actividades
  - cumplimiento
  - nuevos clientes
  - seguimientos vencidos

**Notas para el presentador**

- Insistir en que dirección no necesita más reportes manuales.
- Necesita una fuente única, consistente y comparable.

---

## 6. Qué valor aporta a responsables comerciales

**Mensaje principal**

Da herramientas reales de coordinación, priorización y coaching comercial.

**Bullet points**

- Ver agenda y actividad del equipo.
- Detectar seguimientos pendientes antes de que se pierdan.
- Identificar quién está ejecutando y quién necesita ayuda.
- Planificar visitas futuras con asignación directa a comercial.
- Entrar en el detalle de registros para entender contexto y GPS.
- Trabajar con una foto homogénea del equipo, no con versiones parciales.

**KPIs útiles para managers**

- actividad por comercial y semana
- clientes visitados por comercial
- ratio de registros completados
- seguimientos pendientes por comercial
- duración media por tipo de actividad
- clientes nuevos por zona

**Ejemplo realista**

- Comercial A: 26 actividades, 23 completadas, 4 clientes nuevos.
- Comercial B: 25 actividades, 11 completadas, 0 clientes nuevos.
- A nivel agregado ambos “parecen estar activos”.
- A nivel individual el manager ya sabe dónde intervenir.

**Gráfico sugerido**

- Ranking por comercial:
  - actividad
  - cumplimiento
  - clientes nuevos
  - seguimientos vencidos

**Notas para el presentador**

- Hablar de “ayuda al responsable comercial”, no de “control”.
- La lectura buena es: permite acompañar mejor, no fiscalizar más.

---

## 7. Qué valor aporta a Administración

**Mensaje principal**

Mejora la calidad administrativa del dato comercial y reduce retrabajo posterior.

**Bullet points**

- Fichas de cliente más completas y normalizadas.
- Importación y exportación CSV de clientes y usuarios.
- Menos duplicidad de clientes.
- Mejor trazabilidad sobre quién creó o modificó qué.
- Auditoría completa de cambios.
- Parámetros operativos configurables:
  - precisión GPS
  - radio geofence
  - hora de corte de alertas

**KPIs útiles para administración**

- % clientes con datos completos
- % clientes con GPS cargado
- nº duplicados detectados/prevenidos
- nº usuarios activos por zona
- nº cambios auditados por periodo

**Ejemplo realista**

| Indicador administrativo | Situación actual | Con Sales Tracker |
|---|---|---|
| Clientes con ciudad y zona fiables | Parcial | Estructurado |
| Duplicados por nombre/CIF | Frecuentes | Detectables |
| Quién modificó qué | Difuso | Audit trail |
| Exportación para análisis | Manual | Directa |

**Notas para el presentador**

- Subrayar que administración gana orden y consistencia.
- No es solo una app comercial; también es un sistema de gobierno del dato.

---

## 8. Qué valor aporta a los comerciales

**Mensaje principal**

Si se implanta bien, debe ayudarles a trabajar mejor y a justificar mejor su actividad, no a complicársela.

**Bullet points**

- Registro rápido para llamadas, emails y acciones cortas.
- Flujo simple para visitas:
  - iniciar
  - finalizar
  - dejar siguiente acción
- Creación rápida de cliente sin salir del flujo.
- Agenda con recordatorios operativos.
- Historial personal de actividad.
- Ficha de registro con GPS y trazabilidad, útil incluso para coordinarse con compañeros.

**Claves para no complicarles el trabajo**

- pedir solo el dato mínimo útil
- no convertir cada visita en un formulario largo
- aprovechar catálogos cerrados para reducir escritura libre
- usar agenda y autocompletado para ahorrar tiempo
- revisar el piloto con comerciales reales y ajustar campos

**Mensaje que conviene trasladar**

- “No buscamos que reportéis más.”
- “Buscamos que el dato que ya generáis al trabajar quede recogido una sola vez y sirva para todos.”

**Ejemplo realista de uso**

- 08:45: iniciar visita en cliente.
- 09:35: cerrar visita, indicar resultado y próxima acción.
- 11:10: registrar llamada en 40 segundos desde registro rápido.
- 13:00: crear nuevo cliente detectado en ruta sin esperar a volver a oficina.

**KPIs que también les benefician**

- cartera atendida
- actividad registrada
- seguimiento cumplido
- clientes nuevos detectados

**Notas para el presentador**

- Este bloque debe bajar tensión.
- Hablar de simplificación y utilidad práctica.
- Evitar expresiones como “obligar”, “vigilar” o “controlar”.

---

## 9. Por qué medir representantes agrupados no sirve y hay que medir comercial individual

**Mensaje principal**

Cuando agrupamos varios comerciales bajo un solo representante, el dato deja de ser útil para gestionar personas, territorios y decisiones.

**Bullet points**

- Se mezclan estilos de trabajo distintos.
- Se mezclan carteras distintas.
- Se mezclan intensidades de actividad distintas.
- Se ocultan tanto los buenos resultados como los problemas.
- El ratio agregado tranquiliza, pero no explica.

**Ejemplo ficticio realista**

### Medición agrupada por representante

| Representante | Actividades | Clientes nuevos | Cumplimiento |
|---|---:|---:|---:|
| Levante Sur | 96 | 8 | 82% |

### Realidad por comercial individual

| Comercial | Actividades | Clientes nuevos | Cumplimiento |
|---|---:|---:|---:|
| Ana López | 38 | 5 | 92% |
| Carlos Ruiz | 31 | 3 | 84% |
| Marta Pérez | 27 | 0 | 59% |

**Qué se ve con medición individual**

- quién necesita apoyo
- quién está traccionando la zona
- qué prácticas conviene replicar
- si la carga territorial está equilibrada o no

**Conclusión de negocio**

- El representante agrupado sirve para estructura comercial.
- No sirve para medición de rendimiento individual ni para toma de decisiones operativas finas.

**Gráfico sugerido**

- barra agregada vs. barras por comercial

**Notas para el presentador**

- Este es uno de los mensajes estratégicos más importantes.
- No presentar esto como crítica a los representantes, sino como necesidad de calidad analítica.

---

## 10. Cómo estos datos alimentan Power BI e IA

**Mensaje principal**

La app no es el final; es la capa de captura fiable que habilita analítica avanzada y modelos de IA útiles.

**Capacidades reales ya preparadas**

- Endpoints BI disponibles en backend:
  - `fact-activities`
  - `dim-clients`
  - `dim-users`
  - `dim-catalogs`
- Exportación CSV desde varias pantallas.
- Datos estructurados por usuario, cliente, actividad, zona, resultado y tiempo.

**Qué puede hacerse con Power BI**

- panel por zona y comercial
- evolución semanal de actividad
- cumplimiento verde/amarillo/rojo
- clientes nuevos por periodo
- seguimiento vencido por cartera
- mapas de actividad por GPS y por zona

**Qué puede hacerse después con IA corporativa**

- priorización de clientes con bajo contacto
- identificación de patrones de actividad más eficaces
- detección automática de carteras abandonadas
- sugerencia de siguientes acciones
- resúmenes automáticos de actividad por comercial o zona
- alertas tempranas de caída de ejecución

**Qué hace falta para llegar ahí**

- dato consistente
- comercial individual real
- catálogos limpios
- disciplina mínima de uso

**Importante**

- Hoy ya existe la base analítica.
- Lo que aún no existe como módulo formal es un objeto “oportunidad” o “variedad” dedicado.
- Eso puede ser una fase 2, apoyada sobre la estructura actual.

**Gráfico sugerido**

- Diagrama de flujo:
  - captura operativa
  - modelo de datos
  - Power BI
  - IA corporativa

**Notas para el presentador**

- Posicionar la app como infraestructura de dato, no solo como aplicación operativa.

---

## 11. Propuesta de piloto en Almería

**Mensaje principal**

La forma correcta de implantar esto es con un piloto acotado, medible y corregible.

**Propuesta**

- Ámbito:
  - zona de Almería
  - 3 a 5 comerciales reales
  - 1 responsable comercial
  - 1 soporte de administración
- Duración:
  - 6 a 8 semanas
- Objetivos del piloto:
  - validar facilidad de uso
  - medir calidad del dato
  - detectar fricción real en campo
  - ajustar catálogos y flujos

**Métricas de éxito del piloto**

- >80% de actividad relevante registrada
- >90% de clientes visitados identificados correctamente
- reducción de seguimientos perdidos
- visibilidad real por comercial individual
- feedback cualitativo positivo del equipo piloto

**Reglas del piloto**

- no usarlo como herramienta sancionadora
- revisar semanalmente incidencias y mejoras
- eliminar campos que no aporten valor
- mantener foco en “mínimo dato útil”

**Ejemplo de comité semanal**

- 15 minutos con jefe comercial
- 15 minutos con 2 comerciales piloto
- 15 minutos con administración

**Entregables al cierre**

- cuadro de KPIs piloto
- incidencias detectadas
- mejoras aplicadas
- recomendación de escalado o ajuste

**Notas para el presentador**

- La palabra clave aquí es “controlado”.
- Un piloto serio reduce rechazo y aumenta credibilidad.

---

## 12. Decisión solicitada

**Mensaje principal**

Se solicita aprobar un piloto de Sales Tracker en Almería para validar captura mínima útil, medición individual y base analítica futura.

**Decisión concreta**

- aprobar piloto de 6 a 8 semanas en Almería
- definir equipo piloto
- nombrar sponsor de negocio
- acordar 5 KPIs de seguimiento
- revisar resultados y ajustes antes de escalar

**Qué gana la empresa si decide avanzar**

- dato comercial real
- trazabilidad
- medición individual fiable
- base para Power BI
- base para IA corporativa

**Qué riesgo se evita si se hace como piloto**

- rechazo por sobrecarga
- diseño de campos innecesarios
- despliegue masivo sin aprendizaje
- conclusiones erróneas por mala implantación

**Cierre propuesto**

- “No se trata de pedir más trabajo al comercial.”
- “Se trata de convertir el trabajo que ya hace en información útil para toda la empresa.”
- “Y hacerlo primero en pequeño, bien medido, para mejorar antes de escalar.”

**Notas para el presentador**

- Cerrar con decisión simple y razonable.
- No pedir un despliegue total.
- Pedir permiso para aprender con un piloto serio.

---

## Anexo: ejemplos de gráficos y KPIs para la presentación

### 1. Actividad por comercial real

| Comercial | Visitas | Llamadas | Emails | Total |
|---|---:|---:|---:|---:|
| Ana López | 24 | 11 | 6 | 41 |
| Carlos Ruiz | 18 | 9 | 7 | 34 |
| Marta Pérez | 12 | 10 | 4 | 26 |

### 2. Cumplimiento por comercial

| Comercial | Registros totales | Completados | Cumplimiento |
|---|---:|---:|---:|
| Ana López | 41 | 38 | 92,7% |
| Carlos Ruiz | 34 | 29 | 85,3% |
| Marta Pérez | 26 | 17 | 65,4% |

### 3. Seguimientos pendientes por zona

| Zona | Pendientes | Vencidos |
|---|---:|---:|
| Almería Poniente | 14 | 5 |
| Níjar | 9 | 2 |
| Levante | 6 | 1 |

### 4. Clientes nuevos por comercial

| Comercial | Clientes nuevos mes |
|---|---:|
| Ana López | 5 |
| Carlos Ruiz | 3 |
| Marta Pérez | 1 |

### 5. Calidad GPS de visitas

| Indicador | Valor |
|---|---:|
| Check-ins con GPS válido | 94% |
| Check-outs con GPS válido | 91% |
| Visitas dentro de geofence | 88% |
| Precisión media GPS | 22 m |

### 6. Ejemplo visual rápido para slide

```text
Actividad real por comercial (abril)

Ana López    ████████████████████ 41
Carlos Ruiz  ████████████████     34
Marta Pérez  ████████████         26
```

```text
Seguimientos vencidos por zona

Almería Poniente  █████ 5
Níjar             ██    2
Levante           █     1
```

## Anexo: conclusiones honestas sobre el estado actual de la app

- La app ya cubre bien la captura operativa básica y la trazabilidad.
- La base de integración con BI está preparada.
- El modelo actual aún no incluye entidad específica de oportunidad ni de variedad.
- Eso no invalida el piloto; al contrario, lo hace más sensato:
  - primero consolidar actividad y cliente
  - después ampliar a oportunidad, cultivo o variedad si negocio lo necesita
