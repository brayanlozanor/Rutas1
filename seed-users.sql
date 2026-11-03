-- Inserción de roles requeridos por schema-relational-v3
INSERT OR IGNORE INTO roles (id, code, name) VALUES (1, 'administrador', 'Administrador');
INSERT OR IGNORE INTO roles (id, code, name) VALUES (2, 'atencion_clientes', 'Atención a clientes');
INSERT OR IGNORE INTO roles (id, code, name) VALUES (3, 'tecnico', 'Técnico');

-- Inserción de zonas base
INSERT OR IGNORE INTO zones (id, code, name) VALUES (1, 'san_marcos', 'San Marcos');
INSERT OR IGNORE INTO zones (id, code, name) VALUES (2, 'ayutla', 'Ayutla');
INSERT OR IGNORE INTO zones (id, code, name) VALUES (3, 'heroes', 'Héroes');
INSERT OR IGNORE INTO zones (id, code, name) VALUES (4, 'huitzuco', 'Huitzuco');

-- Inserción de usuarios iniciales en la tabla relacional users
INSERT OR REPLACE INTO users (id, name, username, password_legacy, role_id, legacy_role, status, active, notes, created_at)
VALUES 
  ('u-abraham', 'Abraham', 'abraham', 'Abraham@123', 1, 'administrador', 'activo', 1, 'Administrador principal', datetime('now')),
  ('u-brayan', 'Brayan', 'brayan', 'Brayan@123', 1, 'administrador', 'activo', 1, 'Administrador', datetime('now')),
  ('u-atencion', 'Atención a clientes', 'atencion', 'Atencion@123', 2, 'atencion_clientes', 'activo', 1, 'Captura de nodos y órdenes', datetime('now'));

-- Vincular zonas a los usuarios
INSERT OR IGNORE INTO user_zones (user_id, zone_id) VALUES ('u-abraham', 1), ('u-abraham', 2), ('u-abraham', 3);
INSERT OR IGNORE INTO user_zones (user_id, zone_id) VALUES ('u-brayan', 1), ('u-brayan', 4);
INSERT OR IGNORE INTO user_zones (user_id, zone_id) VALUES ('u-atencion', 1), ('u-atencion', 2);

