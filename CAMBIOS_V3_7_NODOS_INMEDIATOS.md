# Rutas Relacional V3.7 - Nodos vinculados inmediatos

Correcciones:

- Al crear un nodo desde el modal de detalles de antena, la interfaz se actualiza al instante sin requerir recargar.
- El selector "Este detalle corresponde a" se refresca automáticamente y selecciona el nodo recién creado.
- La leyenda "Sin nodos vinculados" se actualiza inmediatamente con los nodos vinculados.
- Vincular/quitar nodos desde el modal de "Nodos vinculados" ahora usa guardado individual relacional (`/api/record` sobre `equipment`) en lugar de `saveDB()` general.
- Agregar detalles desde antena ahora usa guardado individual de `workOrders` para evitar sincronización grande.

No requiere ejecutar schema ni migración. Solo deploy del Worker/assets.
