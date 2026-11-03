# Estructura del proyecto

## Archivos principales

- `worker.js`: API de Cloudflare Worker y guardado en D1.
- `wrangler.jsonc`: configuracion de deploy de Cloudflare.
- `schema.sql`: esquema inicial de la base D1.
- `public/`: unicos archivos que se publican en la web.

## Carpeta public

- `public/*.html`: estructura de cada pantalla.
- `public/assets/css/style.css`: estilos globales compartidos.
- `public/assets/css/tecnico-ruta.css`: estilos especificos de la ruta del tecnico.
- `public/assets/js/api.js`: estado global, sincronizacion y helpers compartidos.
- `public/assets/js/common.js`: navegacion, permisos y UI comun.
- `public/assets/js/*.js`: logica especifica de cada pantalla.
- `public/assets/brand/`: logos e imagenes publicas.

## Carpetas que no se publican

- `archive/data/`: respaldos SQL, JSON y CSV. No deben estar dentro de `public/`.
- `archive/dev-scripts/`: scripts temporales usados para pruebas o extraccion.
- `archive/legacy-assets/`: copias antiguas que ya no usa el deploy actual.
- `docs/changelog/`: notas historicas de versiones.
- `docs/deploy/`: notas de despliegue y sincronizacion.

## Regla importante

No guardar respaldos de base de datos, CSV privados o exportaciones dentro de `public/`, porque esa carpeta se sirve en la web.
