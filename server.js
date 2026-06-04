require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_hands_on';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const btoa = (str) => Buffer.from(str).toString('base64');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// 1. POST /api/v2/auth/signin (Simulates QR Code scan)
app.post('/api/v2/auth/signin', (req, res) => {
    const { qr_data } = req.body;
    
    // Check if table exists
    const table = db.prepare('SELECT * FROM tables WHERE name = ?').get(qr_data);
    
    if (table) {
        // Issue token for this table
        const token = jwt.sign({ table_id: table.name, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });
        // [VULNERABILITY] Token exposed in response
        res.json({
            status: 'ok',
            message: 'テーブルの読み込みに成功しました。',
            token: token,
            table_name: table.name
        });
    } else {
        res.status(401).json({ status: 'error', message: '無効なQRコードです。' });
    }
});

// 2. GET /api/v2/r/session-data
// [VULNERABILITY] IDOR: Returns ALL orders for all tables.
app.get('/api/v2/r/session-data', authenticateToken, (req, res) => {
    const orders = db.prepare(`
        SELECT o.id, o.table_id, o.quantity, o.ordered_at, m.id as menu_item_id, m.name as menu_name, m.price
        FROM orders o
        JOIN menu_items m ON o.menu_item_id = m.id
        ORDER BY o.ordered_at DESC
    `).all();

    res.json({
        status: 'ok',
        data: orders
    });
});

// 3. GET /api/v2/menu/list
app.get('/api/v2/menu/list', authenticateToken, (req, res) => {
    const menus = db.prepare('SELECT * FROM menu_items').all();
    res.json({ status: 'ok', data: menus });
});

// 4. POST /api/v2/orders (Customer creates order)
app.post('/api/v2/orders', authenticateToken, (req, res) => {
    const { menu_item_id, quantity } = req.body;
    const table_name = req.user.table_id;

    if (!menu_item_id || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const tableInfo = db.prepare('SELECT status FROM tables WHERE name = ?').get(table_name);
    if (tableInfo && tableInfo.status === 'checked_out') {
        return res.status(403).json({ error: '会計済みの卓です。追加の注文はできません。' });
    }

    const tableIdBase64 = btoa(table_name);
    const timestamp = new Date().toISOString();

    const insert = db.prepare('INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES (?, ?, ?, ?)');
    insert.run(tableIdBase64, menu_item_id, quantity, timestamp);

    res.json({ status: 'ok', message: 'ご注文を承りました！' });
});

// 5. GET /api/v2/orders/:table_id (The Final Goal Endpoint for Hackers)
app.get('/api/v2/orders/:table_id', (req, res) => {
    const decodedTableId = req.params.table_id;

    const tableExists = db.prepare('SELECT * FROM tables WHERE name = ?').get(decodedTableId);
    if (!tableExists) {
        return res.status(404).json({ error: '卓が見つかりません。卓番号が正しくデコードされているか確認してください。' });
    }

    const base64TableId = btoa(decodedTableId);

    const orders = db.prepare(`
        SELECT m.name as item, m.price, o.quantity, (m.price * o.quantity) as subtotal, o.ordered_at
        FROM orders o
        JOIN menu_items m ON o.menu_item_id = m.id
        WHERE o.table_id = ?
        ORDER BY o.ordered_at ASC
    `).all(base64TableId);

    const total = orders.reduce((sum, order) => sum + order.subtotal, 0);

    res.json({
        message: '【ハッキング成功！】正しい注文データと合計金額を取得しました。',
        target_table: decodedTableId,
        correct_total: total,
        receipt_details: orders
    });
});

// 6. GET /api/v2/admin/tables
app.get('/api/v2/admin/tables', (req, res) => {
    const tables = db.prepare('SELECT * FROM tables').all();
    const orders = db.prepare(`
        SELECT o.table_id, m.price, o.quantity
        FROM orders o
        JOIN menu_items m ON o.menu_item_id = m.id
    `).all();

    const result = tables.map(t => {
        const base64TableId = btoa(t.name);
        const tableOrders = orders.filter(o => o.table_id === base64TableId);
        const total = tableOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        return {
            name: t.name,
            status: t.status,
            total: total
        };
    });

    res.json({ status: 'ok', data: result });
});

// 7. POST /api/v2/admin/checkout
app.post('/api/v2/admin/checkout', express.json(), (req, res) => {
    const { table_name } = req.body;
    if (!table_name) return res.status(400).json({ error: 'Missing table_name' });
    db.prepare('UPDATE tables SET status = ? WHERE name = ?').run('checked_out', table_name);
    res.json({ status: 'ok', message: '会計処理が完了しました' });
});

// 8. GET /api/v2/table/status
app.get('/api/v2/table/status', authenticateToken, (req, res) => {
    const table_name = req.user.table_id;
    const table = db.prepare('SELECT status FROM tables WHERE name = ?').get(table_name);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json({ status: 'ok', data: { status: table.status } });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
