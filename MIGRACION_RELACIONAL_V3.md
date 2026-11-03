# Rutas — Migración relacional V3

## Estado de validación local

La migración fue generada desde el export real `rutas-d1-actual.sql`.

- `app_data` se conserva.
- No se ejecuta `DROP TABLE app_data`.
- Conteos origen/destino validados localmente.
- `PRAGMA foreign_key_check`: 0 violaciones.
- IDs de paradas reutilizados en distintos planes se renombran de forma determinística por `plan + id legado` para evitar colisiones.

## Conteos esperados

| Entidad | Registros |
|---|---:|
| `users` | 10 |
| `technicians` | 8 |
| `equipment` | 358 |
| `equipment_radios` | 72 |
| `nodes` | 94 |
| `equipment_nodes` | 24 |
| `work_orders` | 1413 |
| `work_order_reports` | 14 |
| `routes` | 50 |
| `route_points` | 377 |
| `plans` | 31 |
| `plan_stops` | 275 |
| `plan_stop_orders` | 1266 |
| `deletion_requests` | 8 |
| `audit_log` | 422 |
| `tech_access_log` | 134 |

## Archivos

- `schema-relational-v3.sql`: crea las tablas relacionales.
- `data-relational-v3.sql`: inserta los datos transformados desde el export real.
- `validate-relational-v3.sql`: muestra los conteos relacionales.
- `expected-counts.json`: conteos exactos esperados.

## Orden seguro de ejecución

### 1. No desplegar todavía un Worker nuevo

La web actual sigue usando `app_data`. Esta fase crea y llena las tablas relacionales en paralelo.

### 2. Crear tablas

```powershell
npx wrangler d1 execute netops-db --remote --file schema-relational-v3.sql
```

### 3. Importar los datos normalizados

```powershell
npx wrangler d1 execute netops-db --remote --file data-relational-v3.sql
```

### 4. Validar conteos

```powershell
npx wrangler d1 execute netops-db --remote --file validate-relational-v3.sql
```

Los resultados deben coincidir con `expected-counts.json`.

## Importante

Las contraseñas legadas se conservan temporalmente en columnas `password_legacy` únicamente para no romper el acceso durante la migración. La siguiente fase debe cambiar el login a hashes y, después de confirmar acceso de usuarios, vaciar esas columnas.

`legacy_technician_id` en `work_orders` se conserva como dato histórico. No se usa como FK porque los datos reales incluyen valores vacíos, `__shared__` y otros IDs que no son técnicos. La asignación real se modela mediante `plans`, `plan_assignments`, `plan_stops` y `plan_stop_orders`.
