V15 - Auditoría y permisos

Cambios:
- Usuarios con rol Administrador se pueden crear/editar correctamente.
- Corrección de validación de rol administrador en Usuarios.
- Se registra quién crea, modifica, elimina, marca listo o solicita eliminación en nodos, antenas, detalles, órdenes, usuarios y paradas del plan.
- Se muestra auditoría básica en tarjetas y detalles: Creado por / Modificado por / Eliminado por.
- Atención a clientes ya no puede eliminar órdenes desde Órdenes.
- Las solicitudes de eliminación quedan auditadas: quién solicitó, quién generó código, quién rechazó o completó.

Actualizar:
1. Copiar public/, worker.js, schema.sql y wrangler.jsonc encima del proyecto.
2. No borrar .env, .wrangler ni backups.
3. Ejecutar:
   npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
   npx.cmd wrangler deploy
4. Abrir con Ctrl + F5.
