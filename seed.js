const db = require('./database');

console.log('Seeding database...');

try {
    // Clear existing data
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM menu_items').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM tables').run();

    // Reset sqlite sequence for auto-increment
    db.prepare('DELETE FROM sqlite_sequence').run();

    // Insert Users
    const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    insertUser.run('staff01', 'password', 'staff');
    insertUser.run('admin', 'adminpass', 'admin'); // For organizer

    // Insert Tables
    const insertTable = db.prepare('INSERT INTO tables (name) VALUES (?)');
    insertTable.run('table_1');
    insertTable.run('table_2');
    insertTable.run('table_3');
    insertTable.run('table_4');
    insertTable.run('table_5');

    // Insert Menu Items
    const insertMenu = db.prepare('INSERT INTO menu_items (name, price) VALUES (?, ?)');
    insertMenu.run('生ビール', 600);
    insertMenu.run('ハイボール', 500);
    insertMenu.run('ウーロン茶', 300);
    insertMenu.run('枝豆', 400);
    insertMenu.run('冷奴', 350);
    insertMenu.run('串焼き5本盛り', 800);
    insertMenu.run('唐揚げ', 650);
    insertMenu.run('ポテトフライ', 500);
    insertMenu.run('だし巻き卵', 550);
    insertMenu.run('お茶漬け', 450);

    // Some initial dummy orders for other tables just to populate the IDOR vulnerability with noise.
    // table_id needs to be base64 encoded.
    const btoa = (str) => Buffer.from(str).toString('base64');
    const insertOrder = db.prepare('INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES (?, ?, ?, ?)');
    
    // Add noise to table_1 and table_2
    const pastTime1 = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(); // 2 hours ago
    const pastTime2 = new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(); // 1 hour ago
    
    insertOrder.run(btoa('table_1'), 1, 2, pastTime1); // 2 beers
    insertOrder.run(btoa('table_1'), 4, 1, pastTime1); // 1 edamame
    insertOrder.run(btoa('table_2'), 2, 3, pastTime2); // 3 highballs
    insertOrder.run(btoa('table_2'), 7, 2, pastTime2); // 2 karaage

    console.log('Seeding complete! Dummy data is ready.');
} catch (error) {
    console.error('Error seeding database:', error);
}
