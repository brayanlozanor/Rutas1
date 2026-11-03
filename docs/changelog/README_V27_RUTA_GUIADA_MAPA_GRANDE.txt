V27 - Ruta guiada visible en mapa grande de Planificar

Cambios:
- En Planificar > Agrandar mapa, la ruta guiada por carretera se dibuja con borde blanco y linea azul encima.
- Mientras calcula carretera, siempre queda una ruta directa naranja punteada de respaldo, para que nunca quede el mapa sin ruta.
- Los puntos numerados mantienen popup con detalles de la parada.
- El popup de cada punto muestra nombre, region, coordenadas, material y detalles ligados.
- Desde el popup se puede ir a la parada en la lista lateral.

Actualizar:
1. Copiar public/, worker.js, schema.sql y wrangler.jsonc encima del proyecto.
2. npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
3. npx.cmd wrangler deploy
4. Abrir con Ctrl+F5.
