DELETE FROM orders;
DELETE FROM menu_items;
DELETE FROM users;
DELETE FROM tables;

DELETE FROM sqlite_sequence;

INSERT INTO users (username, password, role) VALUES ('staff01', 'password', 'staff');
INSERT INTO users (username, password, role) VALUES ('admin', 'adminpass', 'admin');

INSERT INTO tables (name) VALUES ('table_1');
INSERT INTO tables (name) VALUES ('table_2');
INSERT INTO tables (name) VALUES ('table_3');
INSERT INTO tables (name) VALUES ('table_4');
INSERT INTO tables (name) VALUES ('table_5');

INSERT INTO menu_items (name, price) VALUES ('生ビール', 600);
INSERT INTO menu_items (name, price) VALUES ('ハイボール', 500);
INSERT INTO menu_items (name, price) VALUES ('ウーロン茶', 300);
INSERT INTO menu_items (name, price) VALUES ('枝豆', 400);
INSERT INTO menu_items (name, price) VALUES ('冷奴', 350);
INSERT INTO menu_items (name, price) VALUES ('串焼き5本盛り', 800);
INSERT INTO menu_items (name, price) VALUES ('唐揚げ', 650);
INSERT INTO menu_items (name, price) VALUES ('ポテトフライ', 500);
INSERT INTO menu_items (name, price) VALUES ('だし巻き卵', 550);
INSERT INTO menu_items (name, price) VALUES ('お茶漬け', 450);

INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_1', 1, 2, datetime('now', '-2 hours'));
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_1', 4, 1, datetime('now', '-2 hours'));
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 2, 3, datetime('now', '-1 hours'));
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 7, 2, datetime('now', '-1 hours'));
