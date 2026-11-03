WiFiMex v4 - correcciones de sincronizacion

Cambios importantes:
- El sistema muestra una ventana de espera cuando carga o guarda.
- Los errores rojos tienen letras blancas y son mas legibles.
- La carga desde la nube ya no mezcla respaldo viejo local si no hay cambios pendientes.
- Guardar marca cambios pendientes y confirma sincronizacion con la nube.
- Las peticiones a /api/data y /api/login usan no-cache para evitar datos viejos.
- El Worker crea/recupera usuarios iniciales si faltan en D1.
- Se agrego indicador de sincronizacion en la barra superior.

IMPORTANTE:
Para que los cambios de una laptop salgan en otra, todos deben abrir el mismo dominio:
https://ruta.api-25.com

La app usa ese mismo dominio para todo:
- Paginas HTML/CSS/JS.
- Login.
- Guardado y lectura en /api/data.
- Sincronizacion entre laptops.

Si solo despliegas la pagina estatica pero no actualizas el Worker/API de ese mismo dominio, los usuarios, nodos y sincronizacion seguiran fallando.

Comandos:
npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
npx.cmd wrangler deploy

Para pruebas locales puedes guardar en localStorage:
localStorage.setItem('netops_api_url','https://ruta.api-25.com')
