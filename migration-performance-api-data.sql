-- Indices para las lecturas paginadas de /api/data.
-- Son aditivos y no modifican ni eliminan datos existentes.
CREATE INDEX IF NOT EXISTS idx_audit_log_target_at
  ON audit_log(target_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_work_order_materials_order
  ON work_order_materials(work_order_id, id);

CREATE INDEX IF NOT EXISTS idx_work_order_reports_order
  ON work_order_reports(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_evidence_order_created
  ON work_order_evidence(work_order_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_equipment_radios_equipment_position
  ON equipment_radios(equipment_id, position);

CREATE INDEX IF NOT EXISTS idx_equipment_nodes_equipment_position
  ON equipment_nodes(equipment_id, position, node_id);

CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_position
  ON plan_stops(plan_id, position);

CREATE INDEX IF NOT EXISTS idx_plan_stop_orders_stop_position
  ON plan_stop_orders(plan_stop_id, position, work_order_id);
