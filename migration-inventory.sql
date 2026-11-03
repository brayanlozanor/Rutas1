-- Inventario por almacén y técnico. Ejecutar una sola vez en D1 antes de publicar.
ALTER TABLE materials ADD COLUMN stock REAL NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN minimum_stock REAL NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN category TEXT;
ALTER TABLE materials ADD COLUMN price REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS technician_material_stock (
  material_id TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  updated_at TEXT,
  PRIMARY KEY(material_id, technician_id),
  FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE
);
