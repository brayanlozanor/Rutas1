# Rutas Relacional V3.6 — persistencia de planes y nodos vinculados

## Correcciones

- `plan_assignments` ahora se escribe al guardar `weekPlan`.
- `loadWeekPlan()` carga `plan_assignments` y reconstruye `assignedTechId` / `assignedAt`.
- Al seleccionar un técnico en Planificar, se muestra su plan general asignado y sus paradas.
- Atención a clientes puede elegir entre técnicos con plan asignado y consultar el plan correspondiente en modo lectura.
- Crear un nodo desde Antenas guarda primero el nodo con `/api/record` y después la antena para persistir `equipment_nodes`.
- Si el nodo o el vínculo no se guardan en D1, el modal no se cierra y se informa el error.

## Deploy

Solo ejecutar:

    npx.cmd wrangler deploy

No repetir schema ni migración.
