-- Migración: Material e infraestructura de torre en antenas (equipment)
ALTER TABLE equipment ADD COLUMN tower_material_notes TEXT;
ALTER TABLE equipment ADD COLUMN tower_sections TEXT;
ALTER TABLE equipment ADD COLUMN tower_batteries TEXT;
ALTER TABLE equipment ADD COLUMN tower_panels TEXT;
ALTER TABLE equipment ADD COLUMN tower_extra_notes TEXT;
ALTER TABLE equipment ADD COLUMN tower_material_photos_json TEXT;
ALTER TABLE equipment ADD COLUMN tower_material_updated_at TEXT;
ALTER TABLE equipment ADD COLUMN tower_material_updated_by_name TEXT;
ALTER TABLE equipment ADD COLUMN tower_material_updated_by TEXT;


ALTER TABLE equipment ADD COLUMN tower_radios TEXT;
