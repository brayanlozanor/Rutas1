V19 - Ubicación de cliente y relación antena/nodo

Cambios:
- En la tabla de Órdenes, la columna Ubicación usa primero la ubicación capturada manualmente en el campo Ubicación opcional.
- Si la orden/detalle no tiene ubicación capturada y está ligada a una antena/Mikrotik, se muestra la ubicación registrada de la antena.
- Si la orden es de nodo y no se captura ubicación, la columna queda sin ubicación.
- En la columna Antena / Nodo / Zona, cuando el detalle está ligado a una antena también se muestra el nodo/pueblo asociado si está capturado en la orden.
- Se corrigió búsqueda de nodo cuando hay varios R repetidos: se prioriza el pueblo/colonia de la orden para no tomar el primer R que encuentre.
