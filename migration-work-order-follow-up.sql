ALTER TABLE work_orders ADD COLUMN reviewed_at TEXT;
ALTER TABLE work_orders ADD COLUMN last_resent_at TEXT;
ALTER TABLE work_orders ADD COLUMN follow_ups_json TEXT;
ALTER TABLE work_orders ADD COLUMN source_order_id TEXT;
