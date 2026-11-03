# Rutas

Sistema de gestion de rutas, planificacion, ordenes de trabajo, antenas, nodos e inventario de materiales.

Version: **v2026.10.30**.

La interfaz esta en `public/`. La API se implementa en `worker.js` y `relational-store.js`, con Cloudflare Workers y D1. La configuracion principal es `wrangler.jsonc`.

Consulta [la estructura del proyecto](docs/PROJECT_STRUCTURE.md) y [las notas de esta version](docs/changelog/v2026.10.30.md).

Para configurar credenciales locales usa `.env.example` y `.dev.vars.example` como referencia. Los archivos `.env`, `.dev.vars`, respaldos y exportaciones de datos no deben subirse a GitHub.

Esta version en GitHub registra el codigo fuente. El despliegue y las migraciones de la base de datos se realizan por separado.
