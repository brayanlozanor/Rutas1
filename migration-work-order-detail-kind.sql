ALTER TABLE work_orders ADD COLUMN detail_kind TEXT NOT NULL DEFAULT 'physical';
UPDATE work_orders SET detail_kind = 'physical';
CREATE INDEX IF NOT EXISTS idx_work_orders_detail_kind ON work_orders(detail_kind);
