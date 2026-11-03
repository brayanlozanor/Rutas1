# Rutas — Worker Relacional V3

Esta versión cambia la capa de persistencia del Worker para usar las tablas relacionales V3 ya migradas en `netops-db`.

## Estado esperado antes del deploy

La base remota debe tener ya cargadas y validadas las tablas V3. Conteos de referencia:

- users: 10
- technicians: 8
- equipment: 358
- equipment_radios: 72
- nodes: 94
- equipment_nodes: 24
- work_orders: 1413
- work_order_reports: 14
- routes: 50
- route_points: 377
- plans: 31
- plan_stops: 275
- plan_stop_orders: 1266
- deletion_requests: 8
- audit_log: 422
- tech_access_log: 134
- `PRAGMA foreign_key_check;`: sin filas
- `app_data`: 17 keys conservadas como respaldo legado

## Qué cambia

- `GET /api/data` reconstruye el mismo JSON esperado por el frontend desde tablas SQL.
- `POST /api/record` hace UPSERT del registro individual en su tabla.
- `POST /api/changes` aplica cambios por registro; no reemplaza arreglos JSON de `app_data`.
- `POST /api/work-order-report` guarda orden, reporte y evidencias relacionales.
- `weekPlan` se reconstruye desde `plans`, `plan_stops` y `plan_stop_orders`.
- `radioLinks` se reconstruye desde `equipment_radios`.
- `linkedNodeIds` se reconstruye desde `equipment_nodes`.
- `app_data` ya no es la fuente de verdad de antenas, nodos, órdenes, usuarios, técnicos, rutas ni planes.
- `app_data` solo se consulta como compatibilidad de lectura para evidencias históricas que siguen incrustadas en el JSON legado.

## Deploy

Desde la carpeta del proyecto:

```powershell
npx.cmd wrangler deploy
```

Después valida:

```text
https://TU-DOMINIO/api/ping
```

Debe incluir:

```json
{
  "ok": true,
  "storage": "relational-v3"
}
```

Luego abre la aplicación y verifica:

1. Inicio de sesión.
2. Conteos/listados de antenas y nodos.
3. Órdenes existentes.
4. Planificación general y por técnico.
5. Editar un nodo de prueba y recargar.
6. Crear una orden de prueba y recargar.
7. Finalizar un detalle técnico con evidencia de prueba.

## Rollback del Worker

El archivo `worker.legacy-app-data.js` contiene el Worker anterior.

Para regresar temporalmente al Worker viejo sin tocar D1:

```powershell
Copy-Item .\worker.legacy-app-data.js .\worker.js -Force
npx.cmd wrangler deploy
```

Las tablas relacionales no se borran y `app_data` sigue conservada.

## Nota de evidencias

Las evidencias históricas migradas como `legacy_work_order_report` se sirven leyendo la copia histórica de `workOrders` en `app_data`. Las evidencias nuevas se almacenan como filas en `work_order_evidence`; mientras no haya binding R2 para evidencias, el Data URL queda en `storage_key` con `storage_type = inline_data_url`.

La siguiente mejora recomendada es enlazar R2 y mover las evidencias nuevas e históricas a objetos R2.
