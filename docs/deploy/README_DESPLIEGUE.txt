WiFiMex / NetOps API unificado

Este paquete deja todo en un solo Worker: netops-api.

Estructura:
- worker.js: API /api/login, /api/data, /api/ping y servidor de archivos.
- schema.sql: estructura e inicialización D1.
- wrangler.jsonc: configuración para netops-api con assets en ./public.
- public/: páginas HTML, CSS, JS e imágenes.

Despliegue:
1) Copia estos archivos encima de tu proyecto, conservando tu .git si usas Git.
2) Ejecuta:
   npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
   npx.cmd wrangler deploy
3) Entra a:
   https://netops-api.asistencias.workers.dev/login.html

Nota:
- La app ya no debe depender de Pages rutas.
- El API se llama por el mismo dominio: /api/login y /api/data.
- El indicador permanente de Sincronizado se quitó. Solo aparece aviso si tarda o falla.
