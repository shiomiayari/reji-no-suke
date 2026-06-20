DELETE FROM orders;
DELETE FROM menu_items;
DELETE FROM users;
DELETE FROM tables;

DELETE FROM sqlite_sequence;

INSERT INTO users (username, password, role) VALUES ('staff01', 'password', 'staff');
INSERT INTO users (username, password, role) VALUES ('admin', 'adminpass', 'admin');

INSERT INTO tables (name, status) VALUES ('table_1', 'active');
INSERT INTO tables (name, status) VALUES ('table_2', 'checked_out');
INSERT INTO tables (name, status) VALUES ('table_3', 'active');
INSERT INTO tables (name, status) VALUES ('table_4', 'active');
INSERT INTO tables (name, status) VALUES ('table_5', 'active');

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

-- フラグ用の非公開メニュー（問2, 問3）
INSERT INTO menu_items (name, price, is_hidden) VALUES ('GDGoC{SQL_1nj3ct10n_15_fUn}', 0, 1);
INSERT INTO menu_items (name, price, is_hidden) VALUES ('Adminのメモ: 秘密のパスワードは GDGoC{Un1c0d3_3sc4p3_m4g1c}', 0, 1);

INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_1', 1, 2, datetime('now', '-2 hours'));
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_1', 4, 1, datetime('now', '-2 hours'));

-- table_2の本当の注文履歴（合計4800円）
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 1, 4, datetime('now', '-1 hours')); -- 生ビール 600x4=2400
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 2, 2, datetime('now', '-1 hours')); -- ハイボール 500x2=1000
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 7, 1, datetime('now', '-1 hours')); -- 唐揚げ 650x1=650
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 4, 1, datetime('now', '-1 hours')); -- 枝豆 400x1=400
INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES ('table_2', 5, 1, datetime('now', '-1 hours')); -- 冷奴 350x1=350
