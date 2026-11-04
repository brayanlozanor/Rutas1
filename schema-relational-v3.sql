PRAGMA foreign_keys = ON;

-- Base relacional Rutas V3. app_data se conserva intacta durante la transición.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_hash TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_legacy TEXT,
  password_hash TEXT,
  role_id INTEGER NOT NULL,
  legacy_role TEXT,
  phone TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'activo',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY(role_id) REFERENCES roles(id),
  FOREIGN KEY(created_by) REFERENCES users(id),
  FOREIGN KEY(updated_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS user_zones (
  user_id TEXT NOT NULL,
  zone_id INTEGER NOT NULL,
  PRIMARY KEY(user_id, zone_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT,
  username_legacy TEXT,
  password_legacy TEXT,
  notes TEXT,
  created_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS technician_zones (
  technician_id TEXT NOT NULL,
  zone_id INTEGER NOT NULL,
  PRIMARY KEY(technician_id, zone_id),
  FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT,
  type TEXT,
  lat REAL,
  lng REAL,
  status TEXT,
  provider TEXT,
  notes TEXT,
  zone_id INTEGER,
  ssid TEXT,
  radio_summary_legacy TEXT,
  radio_models_legacy TEXT,
  radio_names_legacy TEXT,
  station_names_legacy TEXT,
  radio_free_text_legacy TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  purged_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  FOREIGN KEY(zone_id) REFERENCES zones(id),
  FOREIGN KEY(created_by) REFERENCES users(id),
  FOREIGN KEY(updated_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS equipment_radios (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT,
  model TEXT,
  antenna_type TEXT,
  sector TEXT,
  port TEXT,
  ip TEXT,
  ssid TEXT,
  gateway TEXT,
  location_raw TEXT,
  lat REAL,
  lng REAL,
  FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  UNIQUE(equipment_id, position)
);
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  node_code TEXT NOT NULL,
  town TEXT NOT NULL,
  zone_id INTEGER,
  lat REAL,
  lng REAL,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  FOREIGN KEY(zone_id) REFERENCES zones(id),
  FOREIGN KEY(created_by) REFERENCES users(id),
  FOREIGN KEY(updated_by) REFERENCES users(id),
  FOREIGN KEY(deleted_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS equipment_nodes (
  equipment_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  position INTEGER,
  created_at TEXT,
  PRIMARY KEY(equipment_id,node_id),
  FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY(node_id) REFERENCES nodes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    detail_kind TEXT NOT NULL DEFAULT 'physical',
    target_role TEXT,
    origin_role TEXT,
    review_opened_at TEXT,
    review_opened_by TEXT,
    reviewed_at TEXT,
    last_resent_at TEXT,
    follow_ups_json TEXT,
    source_order_id TEXT,
    assigned_user_id TEXT,
    assigned_user_name TEXT,
    description TEXT,
  legacy_desc TEXT,
  client_name TEXT,
  client_phone TEXT,
  equipment_id TEXT,
  node_id TEXT,
  equipment_name_legacy TEXT,
  node_code_legacy TEXT,
  node_name_legacy TEXT,
  town_legacy TEXT,
  priority TEXT,
  visit_type TEXT,
  zone_id INTEGER,
  status TEXT,
  detail_location TEXT,
  lat REAL,
  lng REAL,
  legacy_technician_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  completed_at TEXT,
  deleted_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  FOREIGN KEY(equipment_id) REFERENCES equipment(id),
  FOREIGN KEY(node_id) REFERENCES nodes(id),
  FOREIGN KEY(zone_id) REFERENCES zones(id),
  FOREIGN KEY(created_by) REFERENCES users(id),
  FOREIGN KEY(review_opened_by) REFERENCES users(id),
  FOREIGN KEY(updated_by) REFERENCES users(id),
  FOREIGN KEY(deleted_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_node ON work_orders(node_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_detail_kind ON work_orders(detail_kind);
CREATE INDEX IF NOT EXISTS idx_work_orders_target_role ON work_orders(target_role);
CREATE INDEX IF NOT EXISTS idx_work_orders_origin_role ON work_orders(origin_role);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_user ON work_orders(assigned_user_id);
CREATE TABLE IF NOT EXISTS work_order_reports (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL UNIQUE,
  result TEXT,
  solution TEXT,
  material_used TEXT,
  reason TEXT,
  completed_by TEXT,
  completed_by_name_legacy TEXT,
  completed_at TEXT,
  evidence_photo_legacy TEXT,
  raw_json TEXT,
  FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY(completed_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS work_order_evidence (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  report_id TEXT,
  evidence_type TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'legacy_app_data',
  storage_key TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT,
  FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY(report_id) REFERENCES work_order_reports(id) ON DELETE SET NULL,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  stock REAL NOT NULL DEFAULT 0,
  minimum_stock REAL NOT NULL DEFAULT 0,
  category TEXT,
  price REAL NOT NULL DEFAULT 0,
  package_size REAL NOT NULL DEFAULT 1
);
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
CREATE INDEX IF NOT EXISTS idx_material_movements_material_at ON material_movements(material_id,created_at DESC);
CREATE TABLE IF NOT EXISTS technician_material_stock (
  material_id TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  updated_at TEXT,
  PRIMARY KEY(material_id, technician_id),
  FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS work_order_materials (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  material_id TEXT,
  material_name_legacy TEXT,
  quantity REAL,
  unit_legacy TEXT,
  raw_json TEXT,
  FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY(material_id) REFERENCES materials(id)
);
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_legacy TEXT
);
CREATE TABLE IF NOT EXISTS route_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT,
  lat REAL,
  lng REAL,
  FOREIGN KEY(route_id) REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(route_id,position)
);
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_key TEXT,
  day_key TEXT,
  technician_id TEXT,
  status TEXT,
  scheduled_date TEXT,
  created_at TEXT,
  legacy_source TEXT,
  FOREIGN KEY(technician_id) REFERENCES technicians(id)
);
CREATE TABLE IF NOT EXISTS plan_assignments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  assigned_at TEXT,
  FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  UNIQUE(plan_id,technician_id)
);
CREATE TABLE IF NOT EXISTS plan_stops (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  stop_type TEXT,
  equipment_id TEXT,
  node_id TEXT,
  name TEXT,
  lat REAL,
  lng REAL,
  notes TEXT,
  site_status TEXT,
  auto_assigned INTEGER,
  created_at TEXT,
  raw_json TEXT,
  FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY(equipment_id) REFERENCES equipment(id),
  FOREIGN KEY(node_id) REFERENCES nodes(id),
  UNIQUE(plan_id,position)
);
CREATE TABLE IF NOT EXISTS plan_stop_orders (
  plan_stop_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL,
  position INTEGER,
  PRIMARY KEY(plan_stop_id,work_order_id),
  FOREIGN KEY(plan_stop_id) REFERENCES plan_stops(id) ON DELETE CASCADE,
  FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS deletion_requests (
  id TEXT PRIMARY KEY,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  node_id TEXT,
  detail_id TEXT,
  requested_by TEXT,
  requested_by_name_legacy TEXT,
  status TEXT,
  code TEXT,
  created_at TEXT,
  updated_at TEXT,
  resolved_at TEXT,
  approved_by_name_legacy TEXT,
  rejected_by_name_legacy TEXT,
  completed_by_name_legacy TEXT,
  raw_json TEXT,
  FOREIGN KEY(requested_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT,
  at TEXT,
  user_id TEXT,
  by_name_legacy TEXT,
  by_username_legacy TEXT,
  by_role_legacy TEXT,
  target_id TEXT,
  target_name TEXT,
  target_type TEXT,
  raw_json TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS tech_access_log (
  id TEXT PRIMARY KEY,
  technician_id TEXT,
  technician_name_legacy TEXT,
  route_scope TEXT,
  scope_label TEXT,
  at TEXT,
  user_agent TEXT,
  updated_at TEXT,
  raw_json TEXT,
  FOREIGN KEY(technician_id) REFERENCES technicians(id)
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS migration_rejects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  source_id TEXT,
  reason TEXT NOT NULL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
