-- =============================================================================
-- MIGRACIÓN DE INDEXACIÓN Y RENDIMIENTO PARA DETALLES DE RED (V3 NETWORK OPTIMIZATION)
-- =============================================================================

-- 1. Índice compuesto y cubriente por tipo de detalle y fecha de creación
CREATE INDEX IF NOT EXISTS idx_wo_kind_created
  ON work_orders(detail_kind, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. Índice para consultas filtradas por estado (pendiente, resuelto, etc.) y ordenadas cronológicamente
CREATE INDEX IF NOT EXISTS idx_wo_kind_status_created
  ON work_orders(detail_kind, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. Índice para cálculo de criticidad y ordenamiento por nivel de prioridad
CREATE INDEX IF NOT EXISTS idx_wo_kind_priority_created
  ON work_orders(detail_kind, priority, created_at DESC)
  WHERE deleted_at IS NULL;

-- 4. Índices para asignaciones de usuario y operador de red
CREATE INDEX IF NOT EXISTS idx_wo_kind_assigned_created
  ON work_orders(detail_kind, assigned_user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wo_kind_assigned_status
  ON work_orders(detail_kind, assigned_user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 5. Índice para filtrado y agregación por creador (Atención a Clientes / Soporte)
CREATE INDEX IF NOT EXISTS idx_wo_kind_creator
  ON work_orders(detail_kind, created_by, status)
  WHERE deleted_at IS NULL;

-- 6. Índice para filtros por nodo, equipo y pueblo
CREATE INDEX IF NOT EXISTS idx_wo_kind_node_eq
  ON work_orders(detail_kind, node_id, equipment_id, status)
  WHERE deleted_at IS NULL;

-- 7. Índice para actualizaciones recientes y seguimiento de chat
CREATE INDEX IF NOT EXISTS idx_wo_kind_updated
  ON work_orders(detail_kind, updated_at DESC)
  WHERE deleted_at IS NULL;

-- 8. Índices parciales específicos para el subconjunto activo de detalles de red
CREATE INDEX IF NOT EXISTS idx_wo_net_status_created
  ON work_orders(status, created_at DESC)
  WHERE deleted_at IS NULL AND detail_kind = 'network';

CREATE INDEX IF NOT EXISTS idx_wo_net_assigned
  ON work_orders(assigned_user_id, status, created_at DESC)
  WHERE deleted_at IS NULL AND detail_kind = 'network';

CREATE INDEX IF NOT EXISTS idx_wo_net_creator
  ON work_orders(created_by, status)
  WHERE deleted_at IS NULL AND detail_kind = 'network';

CREATE INDEX IF NOT EXISTS idx_wo_net_node_eq
  ON work_orders(node_id, equipment_id, status)
  WHERE deleted_at IS NULL AND detail_kind = 'network';

-- 9. Registro de la migración en schema_migrations
INSERT OR IGNORE INTO schema_migrations (version, applied_at, notes)
VALUES ('migration-network-details-indexing', CURRENT_TIMESTAMP, 'Indexación optimizada y parcial para detalles de red y operaciones');
