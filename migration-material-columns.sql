-- Inventario relacional. Ejecutar una sola vez en D1.
ALTER TABLE materials ADD COLUMN stock REAL NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN minimum_stock REAL NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN category TEXT;
ALTER TABLE materials ADD COLUMN price REAL NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN package_size REAL NOT NULL DEFAULT 1;
