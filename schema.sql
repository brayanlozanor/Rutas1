CREATE TABLE IF NOT EXISTS app_data (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '[]',
  updated_at DATETIME DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_data (key, value) VALUES ('equipment',         '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('nodes',             '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('workOrders',        '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('technicians',       '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('users',             '[{"id":"u-abraham","name":"Abraham","username":"abraham","password":"Abraham@123","role":"administrador","status":"activo","zones":["san_marcos","ayutla","heroes"],"notes":"Administrador principal","createdAt":"2026-06-23T00:00:00.000Z"},{"id":"u-brayan","name":"Brayan","username":"brayan","password":"Brayan@123","role":"administrador","status":"activo","zones":["san_marcos","huitzuco"],"notes":"Administrador","createdAt":"2026-06-23T00:00:00.000Z"},{"id":"u-atencion","name":"Atencion a clientes","username":"atencion","password":"Atencion@123","role":"atencion_clientes","status":"activo","zones":["san_marcos","ayutla"],"notes":"Captura de nodos y ordenes","createdAt":"2026-06-23T00:00:00.000Z"}]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('techAccessLog',     '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('deletionRequests',  '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('auditLog',          '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('materials',         '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('routes',            '[]');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('weekPlan',          '{}');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('prepChecked',       '{}');
INSERT OR IGNORE INTO app_data (key, value) VALUES ('syncMeta',          '{}');

-- Si en una actualización anterior se creó users vacío, cargar usuarios iniciales.
UPDATE app_data
SET value = '[{"id":"u-abraham","name":"Abraham","username":"abraham","password":"Abraham@123","role":"administrador","status":"activo","zones":["san_marcos","ayutla","heroes"],"notes":"Administrador principal","createdAt":"2026-06-23T00:00:00.000Z"},{"id":"u-brayan","name":"Brayan","username":"brayan","password":"Brayan@123","role":"administrador","status":"activo","zones":["san_marcos","huitzuco"],"notes":"Administrador","createdAt":"2026-06-23T00:00:00.000Z"},{"id":"u-atencion","name":"Atención a clientes","username":"atencion","password":"Atencion@123","role":"atencion_clientes","status":"activo","zones":["san_marcos","ayutla"],"notes":"Captura de nodos y ordenes","createdAt":"2026-06-23T00:00:00.000Z"}]',
    updated_at = datetime('now')
WHERE key = 'users' AND (value = '[]' OR value IS NULL OR value = '');


-- Agregar usuarios iniciales si el arreglo users existe pero no contiene esos usernames.
UPDATE app_data
SET value = json_insert(value, '$[#]', json('{"id":"u-abraham","name":"Abraham","username":"abraham","password":"Abraham@123","role":"administrador","status":"activo","zones":["san_marcos","ayutla","heroes"],"notes":"Administrador principal","createdAt":"2026-06-23T00:00:00.000Z"}')),
    updated_at = datetime('now')
WHERE key = 'users'
  AND json_valid(value)
  AND NOT EXISTS (SELECT 1 FROM json_each(app_data.value) WHERE json_extract(json_each.value, '$.username') = 'abraham');

UPDATE app_data
SET value = json_insert(value, '$[#]', json('{"id":"u-brayan","name":"Brayan","username":"brayan","password":"Brayan@123","role":"administrador","status":"activo","zones":["san_marcos","huitzuco"],"notes":"Administrador","createdAt":"2026-06-23T00:00:00.000Z"}')),
    updated_at = datetime('now')
WHERE key = 'users'
  AND json_valid(value)
  AND NOT EXISTS (SELECT 1 FROM json_each(app_data.value) WHERE json_extract(json_each.value, '$.username') = 'brayan');

UPDATE app_data
SET value = json_insert(value, '$[#]', json('{"id":"u-atencion","name":"Atención a clientes","username":"atencion","password":"Atencion@123","role":"atencion_clientes","status":"activo","zones":["san_marcos","ayutla"],"notes":"Captura de nodos y órdenes","createdAt":"2026-06-23T00:00:00.000Z"}')),
    updated_at = datetime('now')
WHERE key = 'users'
  AND json_valid(value)
  AND NOT EXISTS (SELECT 1 FROM json_each(app_data.value) WHERE json_extract(json_each.value, '$.username') = 'atencion');

SELECT key, updated_at FROM app_data ORDER BY key;
