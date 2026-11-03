-- Agrega soporte para enrutamiento bidireccional y asignación múltiple de órdenes
ALTER TABLE work_orders ADD COLUMN target_role TEXT;
ALTER TABLE work_orders ADD COLUMN origin_role TEXT;
ALTER TABLE work_orders ADD COLUMN assigned_user_id TEXT;
ALTER TABLE work_orders ADD COLUMN assigned_user_name TEXT;
CREATE INDEX IF NOT EXISTS idx_work_orders_target_role ON work_orders(target_role);
CREATE INDEX IF NOT EXISTS idx_work_orders_origin_role ON work_orders(origin_role);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_user ON work_orders(assigned_user_id);
