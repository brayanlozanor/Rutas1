V10 - Interfaz técnico

Cambios:
- El técnico ya no puede seleccionar ni cambiar el plan.
- La interfaz del técnico carga automáticamente el último plan asignado a ese técnico desde Planificar.
- Si el plan no tiene paradas, muestra aviso claro.
- Diseño actualizado para parecerse más al panel del administrador: barra superior, hero azul, tarjetas y mapa más ancho.

Despliegue:
1. Copiar public/, worker.js, schema.sql y wrangler.jsonc encima del proyecto actual.
2. No borrar .env, .wrangler ni backups.
3. Ejecutar:
   npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql
   npx.cmd wrangler deploy
4. Abrir con Ctrl + F5.
