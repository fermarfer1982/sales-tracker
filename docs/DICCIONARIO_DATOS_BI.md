# Diccionario de Datos BI: Sales Tracker

## Objetivo

Este documento define los campos del endpoint BI de actividades para facilitar su uso en:

- Power BI
- cuadros de mando internos
- análisis avanzado
- modelos de IA corporativa

Se basa en el dataset real expuesto actualmente por `fact-activities`.

## Dataset principal

- Nombre lógico recomendado: `fact_activities`
- Origen funcional: actividad comercial completada
- Grano del dato: `1 fila = 1 actividad comercial completada`

Esto significa que cada registro representa una interacción comercial cerrada con trazabilidad operativa suficiente para análisis.

## Reglas de interpretación

- Solo incluye actividades `completed`.
- Una actividad puede ser:
  - visita con `check-in / check-out`
  - registro rápido
- El `cliente principal` es el cliente con el que se cierra la actividad o la venta.
- Si existe venta indirecta, los `clientes intermediarios` representan los clientes de vuestra base de datos a través de los cuales se canaliza la venta.
- Si `venta_cerrada = false`, los campos de cantidad, precio e importe pueden ir vacíos.

## Campos de identificación del registro

### `activity_id`

- Tipo: `string`
- Significado: identificador único del registro de actividad
- Uso recomendado:
  - clave técnica
  - trazabilidad
  - relación con auditoría o detalle operativo

### `activity_date`

- Tipo: `datetime`
- Significado: fecha operativa de la actividad comercial
- Uso recomendado:
  - calendarios
  - series temporales
  - filtros de periodo

### `created_at`

- Tipo: `datetime`
- Significado: fecha/hora real de creación del registro
- Uso recomendado:
  - auditoría
  - análisis de retraso en registro

### `updated_at`

- Tipo: `datetime`
- Significado: fecha/hora de última actualización
- Uso recomendado:
  - control de cambios
  - trazabilidad administrativa

### `status`

- Tipo: `string`
- Valores esperados: `completed`
- Significado: estado del registro dentro del endpoint BI
- Uso recomendado:
  - control de consistencia

## Campos de productividad comercial

### `duration_minutes`

- Tipo: `number`
- Significado: duración de la actividad en minutos
- Uso recomendado:
  - tiempo medio por visita
  - carga comercial real
  - productividad por comercial o cliente

### `notes`

- Tipo: `string`
- Significado: notas operativas del registro
- Uso recomendado:
  - consulta cualitativa
  - IA de resumen, clasificación o extracción temática

### `next_action_date`

- Tipo: `datetime | null`
- Significado: fecha comprometida para la siguiente acción
- Uso recomendado:
  - seguimiento pendiente
  - alertas
  - control de disciplina comercial

### `next_action_notes`

- Tipo: `string | null`
- Significado: detalle de la próxima acción
- Uso recomendado:
  - contexto para seguimiento
  - prompting para IA

## Campos del comercial

### `sales_user_id`

- Tipo: `string`
- Significado: identificador del comercial real que ejecuta la actividad
- Uso recomendado:
  - clave de relación con dimensión de usuarios
  - medición individual

### `sales_user_name`

- Tipo: `string`
- Significado: nombre del comercial
- Uso recomendado:
  - visualización
  - rankings
  - segmentación individual

### `sales_user_email`

- Tipo: `string`
- Significado: email del comercial
- Uso recomendado:
  - trazabilidad
  - relación con otros sistemas

### `sales_user_role`

- Tipo: `string`
- Valores esperados: `sales`, `manager`, `admin`
- Significado: rol del usuario asociado al registro
- Uso recomendado:
  - control de calidad del dato
  - filtros administrativos

### `sales_representative_id`

- Tipo: `string | null`
- Significado: identificador del representante asignado al comercial
- Uso recomendado:
  - agrupación territorial
  - análisis por estructura comercial

### `sales_representative_name`

- Tipo: `string | null`
- Significado: nombre del representante asignado al comercial
- Uso recomendado:
  - dashboards por representante
  - comparación representante vs comercial real

## Campos del cliente principal

### `client_id`

- Tipo: `string`
- Significado: identificador del cliente principal del registro
- Uso recomendado:
  - clave de relación con dimensión clientes

### `client_name`

- Tipo: `string`
- Significado: razón social del cliente principal
- Uso recomendado:
  - ranking de clientes
  - seguimiento de cuenta

### `client_tax_id`

- Tipo: `string`
- Significado: CIF/NIF del cliente principal
- Uso recomendado:
  - deduplicación
  - integración con ERP u otros maestros

### `client_city`

- Tipo: `string`
- Significado: ciudad del cliente principal
- Uso recomendado:
  - análisis geográfico

### `client_province`

- Tipo: `string`
- Significado: provincia del cliente principal
- Uso recomendado:
  - mapas
  - cobertura territorial

### `client_representative_id`

- Tipo: `string | null`
- Significado: identificador del representante asociado al cliente
- Uso recomendado:
  - análisis de cartera por representante

### `client_representative_name`

- Tipo: `string | null`
- Significado: nombre del representante asociado al cliente
- Uso recomendado:
  - vistas agregadas por territorio

### `client_segment_id`

- Tipo: `string | null`
- Significado: identificador del segmento del cliente
- Uso recomendado:
  - segmentación analítica

### `client_segment_name`

- Tipo: `string | null`
- Significado: nombre del segmento del cliente
- Uso recomendado:
  - análisis por canal o perfil de cliente

## Campos de clasificación de actividad

### `activity_type_id`

- Tipo: `string | null`
- Significado: identificador del tipo de actividad
- Uso recomendado:
  - relación con catálogos

### `activity_type_name`

- Tipo: `string | null`
- Ejemplos: `visita`, `llamada`, `email`
- Significado: tipo funcional de actividad
- Uso recomendado:
  - mezcla de actividad
  - productividad por canal

### `product_id`

- Tipo: `string | null`
- Significado: identificador del producto asociado
- Uso recomendado:
  - análisis por producto

### `product_name`

- Tipo: `string | null`
- Significado: nombre del producto asociado
- Uso recomendado:
  - mix comercial
  - seguimiento por variedad o familia

### `outcome_id`

- Tipo: `string | null`
- Significado: identificador del resultado de actividad
- Uso recomendado:
  - relación con catálogo de resultados

### `outcome_name`

- Tipo: `string | null`
- Ejemplos: `oferta`, `pedido`, `seguimiento`
- Significado: resultado registrado de la actividad
- Uso recomendado:
  - embudos
  - ratio de conversión por fase

## Campos de venta y trazabilidad

### `venta_cerrada`

- Tipo: `boolean`
- Significado: indica si en esa actividad se ha cerrado una venta
- Uso recomendado:
  - tasa de cierre
  - filtro de registros comerciales con venta

### `cantidad_vendida`

- Tipo: `number | null`
- Significado: cantidad vendida en la actividad
- Uso recomendado:
  - volumen vendido
  - comparación entre productos, clientes y comerciales

### `precio_unitario_venta`

- Tipo: `number | null`
- Significado: precio unitario de venta informado
- Uso recomendado:
  - análisis de precio medio
  - dispersión de precios

### `importe_total_venta`

- Tipo: `number | null`
- Significado: importe total calculado de la operación
- Fórmula: `cantidad_vendida * precio_unitario_venta`
- Uso recomendado:
  - ventas totales
  - ticket medio
  - ranking de comerciales, clientes y productos

### `clientes_intermediarios_count`

- Tipo: `number`
- Significado: número de clientes intermediarios asociados a la venta
- Uso recomendado:
  - detectar complejidad del canal
  - separar venta directa vs indirecta

### `clientes_intermediarios_ids`

- Tipo: `array<string>`
- Significado: identificadores de los clientes intermediarios
- Uso recomendado:
  - trazabilidad técnica
  - cruces con dimensión de clientes

### `clientes_intermediarios_nombres`

- Tipo: `array<string>`
- Significado: nombres de los clientes intermediarios
- Uso recomendado:
  - análisis de red de distribución
  - visualizaciones tipo tabla o tooltip

### `clientes_intermediarios_tax_ids`

- Tipo: `array<string>`
- Significado: CIF/NIF de los clientes intermediarios
- Uso recomendado:
  - conciliación con ERP
  - control maestro

### `clientes_intermediarios_resumen`

- Tipo: `string`
- Significado: concatenación legible de los intermediarios
- Formato actual: nombres separados por ` | `
- Uso recomendado:
  - visualización directa en tablas
  - exportaciones simples

## KPIs recomendados

### Actividad comercial

- actividades completadas
- actividades por comercial
- actividades por representante
- duración media por actividad
- clientes activos por periodo

### Efectividad comercial

- % de actividades con venta cerrada
- importe total vendido
- ticket medio
- cantidad media por venta
- ratio `pedido / visita`

### Cobertura de cartera

- clientes únicos trabajados por comercial
- clientes sin actividad en 30 días
- frecuencia media de contacto por cliente

### Trazabilidad de canal

- % de ventas directas
- % de ventas indirectas
- nº medio de intermediarios por venta
- importe vendido por cliente final vs canal intermediario

## Medidas sugeridas en Power BI

### Ventas totales

```DAX
Ventas Totales = SUM ( fact_activities[importe_total_venta] )
```

### Actividades completadas

```DAX
Actividades Completadas = COUNTROWS ( fact_activities )
```

### Ventas cerradas

```DAX
Ventas Cerradas = CALCULATE (
    COUNTROWS ( fact_activities ),
    fact_activities[venta_cerrada] = TRUE ()
)
```

### Tasa de cierre

```DAX
Tasa de Cierre = DIVIDE ( [Ventas Cerradas], [Actividades Completadas] )
```

### Ticket medio

```DAX
Ticket Medio = DIVIDE ( [Ventas Totales], [Ventas Cerradas] )
```

### Precio medio de venta

```DAX
Precio Medio Venta = AVERAGE ( fact_activities[precio_unitario_venta] )
```

## Visualizaciones recomendadas

- serie temporal de `importe_total_venta` por semana
- ranking de comerciales por `ventas totales`
- ranking de clientes por `importe total`
- matriz `producto x comercial`
- embudo `actividad -> oferta -> pedido -> venta cerrada`
- tabla de ventas indirectas con `clientes_intermediarios_resumen`
- mapa por provincia o ciudad

## Consideraciones de calidad de dato

- `venta_cerrada = true` debería implicar cantidad y precio informados.
- Los importes nulos no deben sumarse como cero sin revisar el contexto.
- Los análisis de rendimiento deben hacerse por `sales_user_id`, no por representante agrupado.
- `clientes_intermediarios_*` puede venir vacío y eso no es error:
  - significa venta directa

## Recomendación de modelado

- Usar este dataset como tabla de hechos principal.
- Relacionarlo con:
  - dimensión de usuarios
  - dimensión de clientes
  - dimensión de catálogos
  - calendario
- Mantener `activity_id` como clave técnica de detalle.

## Ejemplo de lectura funcional

Una fila puede significar:

- el comercial `Juan Pérez`
- realizó una `visita`
- al cliente final `Cliente A`
- registró producto `ALCACHOFA - LORCA`
- cerró venta
- vendió `300` unidades
- a `2,80 €`
- con un importe total de `840 €`
- y la venta se canalizó a través de `Distribuidor X`

Ese nivel de detalle permite medir:

- actividad real
- conversión real
- valor económico
- trazabilidad del canal
- rendimiento individual del comercial
