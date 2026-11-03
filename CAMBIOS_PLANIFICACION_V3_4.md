# Rutas Relacional V3.4 — planificación y detalles

Cambios de esta entrega:

- Confirmación visual de eliminación para paradas y planes.
- El orden manual de paradas conserva el orden entrante al mezclar con D1.
- `Subir`, `Bajar` y el campo de número esperan confirmación de guardado antes de renderizar.
- En Antenas, al agregar/editar un detalle se elige si pertenece a la antena actual o a uno de sus nodos vinculados.
- En Planificar, una parada de antena solo muestra detalles sin `nodeId` de esa antena.
- Una parada de nodo solo muestra detalles de ese `nodeId`.
- Los detalles realizados/no realizados se muestran al final, separados por una línea “Realizados”.

No requiere ejecutar schema ni migración. Solo `wrangler deploy`.
