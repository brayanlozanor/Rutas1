V14 - Plan técnico único

Cambios:
- Un técnico solo puede estar asignado a un plan general activo a la vez.
- En Planificar, el selector de técnico ya no muestra técnicos ocupados en otros planes.
- Si necesitas mover un técnico a otro plan, primero selecciona el plan donde está asignado y ponlo en "Sin técnico asignado"; después aparecerá libre para el nuevo plan.
- La vista del técnico ahora verifica cambios de ruta en segundo plano cada 15 segundos, sin recargar la página ni hacer efecto Ctrl+R.
- Si el técnico fue removido de un plan o asignado a otro, su vista se actualiza automáticamente sin que él pueda seleccionar planes.

Actualizar:
1. Copiar public/, worker.js, schema.sql y wrangler.jsonc encima del proyecto.
2. No borrar .env, .wrangler ni backups.
3. Ejecutar:
   npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
   npx.cmd wrangler deploy
4. Abrir con Ctrl+F5.
