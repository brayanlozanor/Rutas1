-- Seguimiento de fotografias y movimientos del inventario.
CREATE TABLE IF NOT EXISTS material_photos (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL UNIQUE,
  storage_type TEXT NOT NULL DEFAULT 'inline_data_url',
  storage_key TEXT NOT NULL,
  created_at TEXT,
  FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_movements (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  technician_id TEXT,
  returned_change REAL NOT NULL DEFAULT 0,
  returned_damaged REAL NOT NULL DEFAULT 0,
  used_quantity REAL NOT NULL DEFAULT 0,
  new_installations INTEGER NOT NULL DEFAULT 0,
  reference TEXT,
  reason TEXT,
  created_by TEXT,
  created_by_name_legacy TEXT,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending_receipt',
  accepted_at TEXT,
  accepted_by TEXT,
  accepted_by_name TEXT,
  handover_accepted_at TEXT,
  handover_accepted_by TEXT,
  handover_accepted_by_name TEXT,
  notes TEXT,
  updated_at TEXT,
  raw_json TEXT,
  FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_material_movements_material_at
  ON material_movements(material_id, created_at DESC);
