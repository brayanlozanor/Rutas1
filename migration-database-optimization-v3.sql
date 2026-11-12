-- =============================================================================
-- MIGRACIÓN DE OPTIMIZACIÓN Y NORMALIZACIÓN DE BASE DE DATOS (V3 OPTIMIZED)
-- =============================================================================
-- 1. Índices para acelerar búsquedas de plan_stop_orders por orden de trabajo
--    (Elimina el cuello de botella de escaneo completo de 2.7M de filas en /api/data?part=map)
CREATE INDEX IF NOT EXISTS idx_plan_stop_orders_work_order
  ON plan_stop_orders(work_order_id);

CREATE INDEX IF NOT EXISTS idx_plan_stop_orders_stop_position
  ON plan_stop_orders(plan_stop_id, position, work_order_id);

-- 2. Índices para agilizar la carga del historial de auditoría
--    (Elimina el ordenamiento temporal en B-Tree sobre miles de registros)
CREATE INDEX IF NOT EXISTS idx_audit_log_at_id
  ON audit_log(at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_at
  ON audit_log(target_id, at DESC);

-- 3. Índices para búsquedas de equipos y nodos vinculados
CREATE INDEX IF NOT EXISTS idx_equipment_nodes_node_id
  ON equipment_nodes(node_id);

CREATE INDEX IF NOT EXISTS idx_equipment_nodes_equipment_position
  ON equipment_nodes(equipment_id, position, node_id);

CREATE INDEX IF NOT EXISTS idx_equipment_radios_equipment_position
  ON equipment_radios(equipment_id, position);

-- 4. Índices para planificación de paradas y asignaciones por técnico
CREATE INDEX IF NOT EXISTS idx_plan_assignments_tech
  ON plan_assignments(technician_id, plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_position
  ON plan_stops(plan_id, position);

CREATE INDEX IF NOT EXISTS idx_plan_stops_equipment
  ON plan_stops(equipment_id);

CREATE INDEX IF NOT EXISTS idx_plan_stops_node
  ON plan_stops(node_id);

-- 5. Índices compuestos y cubrientes para órdenes de trabajo
--    (Acelera el sondeo de red de 4s, la paginación y el cálculo de prioridades)
CREATE INDEX IF NOT EXISTS idx_work_orders_deleted_kind_status
  ON work_orders(deleted_at, detail_kind, status);

CREATE INDEX IF NOT EXISTS idx_wo_node_eq_pri
  ON work_orders(node_id, equipment_id, priority, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_created_by
  ON work_orders(created_by);

-- 6. Índices de reportes, evidencias y materiales
CREATE INDEX IF NOT EXISTS idx_work_order_reports_order
  ON work_order_reports(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_materials_order
  ON work_order_materials(work_order_id, id);

CREATE INDEX IF NOT EXISTS idx_work_order_evidence_order_created
  ON work_order_evidence(work_order_id, created_at, id);

-- 7. Registro de migración completada en schema_migrations
INSERT OR IGNORE INTO schema_migrations (version, applied_at, notes)
VALUES ('database-optimization-v3-perf', CURRENT_TIMESTAMP, 'Índices compuestos, cubrientes y optimización de caminos calientes D1');

