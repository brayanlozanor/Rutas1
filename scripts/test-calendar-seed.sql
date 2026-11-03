PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_data (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO roles(code,name) VALUES ('administrador','Administrador');
INSERT OR IGNORE INTO roles(code,name) VALUES ('tecnico','Tecnico');
INSERT OR IGNORE INTO zones(code,name) VALUES ('prueba','Zona de prueba');

INSERT OR REPLACE INTO users(id,name,username,password_legacy,role_id,status,active,created_at)
VALUES ('test-admin','Administrador de prueba','admin-prueba','prueba123',(SELECT id FROM roles WHERE code='administrador'),'activo',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO users(id,name,username,password_legacy,role_id,status,active,created_at)
VALUES ('test-tech-user','Tecnico de prueba','tecnico-prueba','prueba123',(SELECT id FROM roles WHERE code='tecnico'),'activo',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO technicians(id,user_id,name,phone,status,username_legacy,password_legacy,created_at)
VALUES ('test-tech','test-tech-user','Tecnico de prueba','000-000-0000','activo','tecnico-prueba','prueba123',CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO work_orders(id,title,client_name,priority,visit_type,status,created_at)
VALUES ('test-detail-1','Alinear antena del cliente','Cliente Demo 1','alta','servicio','pendiente',CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO work_orders(id,title,client_name,priority,visit_type,status,created_at)
VALUES ('test-detail-2','Cambiar conector danado','Cliente Demo 2','media','servicio','pendiente',CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO work_orders(id,title,client_name,priority,visit_type,status,created_at)
VALUES ('test-detail-3','Revisar potencia y cableado','Cliente Demo 3','baja','revision','pendiente',CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO work_orders(id,title,client_name,priority,visit_type,status,created_at)
VALUES ('test-detail-4','Reubicar equipo exterior','Cliente Demo 4','alta','servicio','pendiente',CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO plans(id,name,scope_type,scope_key,day_key,status,created_at,legacy_source)
VALUES ('test-plan','Plan semanal de prueba','shared','__shared__','general','activo',CURRENT_TIMESTAMP,'weekPlan _generalPlans');
INSERT OR REPLACE INTO plan_assignments(id,plan_id,technician_id,assigned_at)
VALUES ('test-assignment','test-plan','test-tech',CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO plan_stops(id,plan_id,position,stop_type,name,lat,lng,notes,site_status,created_at,raw_json)
VALUES ('test-stop-1','test-plan',0,'manual','Parada Centro',17.5500,-99.5000,'Trabajo programado para hoy','pendiente',CURRENT_TIMESTAMP,'{"id":"test-stop-1","type":"manual","name":"Parada Centro","lat":17.55,"lng":-99.50,"scheduledDate":"2026-08-07","siteStatus":"pendiente"}');
INSERT OR REPLACE INTO plan_stops(id,plan_id,position,stop_type,name,lat,lng,notes,site_status,created_at,raw_json)
VALUES ('test-stop-2','test-plan',1,'manual','Parada Norte',17.5800,-99.4800,'Segunda visita de hoy','pendiente',CURRENT_TIMESTAMP,'{"id":"test-stop-2","type":"manual","name":"Parada Norte","lat":17.58,"lng":-99.48,"scheduledDate":"2026-08-07","siteStatus":"pendiente"}');
INSERT OR REPLACE INTO plan_stops(id,plan_id,position,stop_type,name,lat,lng,notes,site_status,created_at,raw_json)
VALUES ('test-stop-3','test-plan',2,'manual','Parada Sabado',17.6000,-99.4600,'Visita del siguiente dia','pendiente',CURRENT_TIMESTAMP,'{"id":"test-stop-3","type":"manual","name":"Parada Sabado","lat":17.60,"lng":-99.46,"scheduledDate":"2026-08-08","siteStatus":"pendiente"}');
INSERT OR REPLACE INTO plan_stops(id,plan_id,position,stop_type,name,lat,lng,notes,site_status,created_at,raw_json)
VALUES ('test-stop-4','test-plan',3,'manual','Parada Lunes',17.6200,-99.4400,'Visita del lunes','pendiente',CURRENT_TIMESTAMP,'{"id":"test-stop-4","type":"manual","name":"Parada Lunes","lat":17.62,"lng":-99.44,"scheduledDate":"2026-08-10","siteStatus":"pendiente"}');

INSERT OR REPLACE INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES ('test-stop-1','test-detail-1',0);
INSERT OR REPLACE INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES ('test-stop-1','test-detail-2',1);
INSERT OR REPLACE INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES ('test-stop-2','test-detail-3',0);
INSERT OR REPLACE INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES ('test-stop-3','test-detail-4',0);
