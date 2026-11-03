PROYECTO UNIFICADO: TODO EN netops-api
======================================

Este paquete está preparado para que uses un solo Worker llamado netops-api.
El mismo Worker sirve la página HTML/CSS/JS y también responde /api/login, /api/data y conecta a D1.

ESTRUCTURA:
- worker.js              API + servidor de assets
- schema.sql             tablas/keys iniciales D1
- wrangler.jsonc         configuración de Cloudflare
- public/                aquí está la página completa

NO INCLUYE:
- .git
- .env
- backups .sql
- tokens

PASOS:
1) Copia todo este paquete en tu carpeta C:\Users\wifim\Downloads\Rutas
   No reemplaces tu .git si quieres conservar tu repositorio.

2) Revisa que wrangler.jsonc tenga la D1 correcta:
   database_name = netops-db
   database_id   = 233e0a4f-79b7-4268-a280-61d670b1624c

3) Respalda D1:
   npx.cmd wrangler d1 export netops-db --remote --output=backup_antes_unificar.sql

4) Ejecuta schema:
   npx.cmd wrangler d1 execute netops-db --remote --file=schema.sql

5) Despliega todo en netops-api:
   npx.cmd wrangler deploy

6) Prueba:
   https://netops-api.asistencias.workers.dev/login.html
   https://netops-api.asistencias.workers.dev/api/ping

7) En cada laptop limpia respaldo viejo:
   Abre F12 > Console y pega:
   localStorage.removeItem('netops_backup');
   localStorage.removeItem('netops_dirty');
   localStorage.removeItem('token');
   localStorage.removeItem('user');
   location.href = '/login.html';

8) Cuando confirmes que netops-api abre y sincroniza bien, ya puedes borrar los Workers/Pages rutas duplicados.
