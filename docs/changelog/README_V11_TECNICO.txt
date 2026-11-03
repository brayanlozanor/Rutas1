Rutas NetOps API v11 - técnico en vivo y evidencias

Cambios principales:
- La vista técnico ya no muestra botón Actualizar.
- La ruta del técnico se actualiza automáticamente cada 5 segundos cuando no hay modal abierto.
- Al recargar, conserva la sesión del técnico y no vuelve a pedir login mientras siga vigente.
- Se quitaron Subir, Bajar, Iniciar detalles y Ver ubicación en Maps de la interfaz del técnico.
- En cada detalle el material es obligatorio. Si no se usó material, debe tocar el botón "No se usó nada".
- El selector de foto tiene diseño mejorado y comprime la evidencia antes de guardarla.
- El administrador ve solución, motivo, material, técnico, fecha y evidencia en detalles de antenas/nodos y planificar.
- Mejoras responsivas para iPhone/Android.

Actualizar copiando encima:
public/
worker.js
schema.sql
wrangler.jsonc

No borrar .env, .wrangler ni backups.
