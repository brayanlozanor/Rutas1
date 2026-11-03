-- Permite asignar una fecha independiente a cada plan/parada semanal.
-- Ejecutar una sola vez en bases creadas antes de agosto de 2026.
ALTER TABLE plans ADD COLUMN scheduled_date TEXT;
