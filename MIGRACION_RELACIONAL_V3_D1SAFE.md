# Migración relacional V3 — D1 SAFE

Corrección para Cloudflare D1/Wrangler 4.107.1.

- Se eliminaron `BEGIN TRANSACTION` y `COMMIT` del archivo de importación, como exige D1 para `wrangler d1 execute --file`.
- La validación usa SELECT independientes y evita un compound SELECT con UNION ALL.
- 10 reportes con imágenes base64 grandes NO duplican la imagen en una sentencia SQL >100 KB. La imagen original permanece intacta en `app_data.workOrders`; `work_order_evidence` guarda una referencia `legacy_work_order_report` para la segunda fase de migración a R2.
- `app_data` no se borra ni se vacía.

## Ejecutar desde la carpeta Rutas

El esquema ya fue aplicado correctamente. No hace falta repetirlo.

```powershell
npx.cmd wrangler d1 execute netops-db --remote --file .\data-relational-v3-d1safe.sql
```

Después:

```powershell
npx.cmd wrangler d1 execute netops-db --remote --file .\validate-relational-v3-d1safe.sql
```

No hacer `wrangler deploy` todavía.
