import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

const app = new Hono();

// CORSの設定
app.use('/*', cors());

const getJwtSecret = (c) => c.env.JWT_SECRET || 'super_secret_jwt_key_for_hands_on';

// JWT認証ミドルウェア
const authenticateToken = async (c, next) => {
    const authHeader = c.req.header('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    
    try {
        const user = await verify(token, getJwtSecret(c), 'HS256');
        c.set('user', user);
        await next();
    } catch (err) {
        console.error('JWT verify error:', err);
        return c.json({ error: 'Forbidden', details: err.message }, 403);
    }
};

// 1. POST /api/v2/auth/signin (Simulates QR Code scan)
app.post('/api/v2/auth/signin', async (c) => {
    const { qr_data } = await c.req.json();
    
    const table = await c.env.DB.prepare('SELECT * FROM tables WHERE name = ?').bind(qr_data).first();
    
    if (table) {
        if (table.status === 'checked_out') {
            return c.json({ status: 'error', message: 'この卓はすでにお会計済みです。' }, 403);
        }
        
        // Issue token for this table
        const payload = {
            table_id: table.name,
            role: 'customer',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
        };
        const token = await sign(payload, getJwtSecret(c));
        
        return c.json({
            status: 'ok',
            message: 'テーブルの読み込みに成功しました。',
            token: token,
            table_name: table.name
        });
    } else {
        return c.json({ status: 'error', message: '無効なQRコードです。' }, 401);
    }
});

// 2. GET /api/v2/r/session-data
app.get('/api/v2/r/session-data', authenticateToken, async (c) => {
    const user = c.get('user');
    const { results } = await c.env.DB.prepare(`
        SELECT o.id, o.table_id, o.quantity, o.ordered_at, m.id as menu_item_id, m.name as menu_name, m.price
        FROM orders o
        JOIN menu_items m ON o.menu_item_id = m.id
        WHERE o.table_id = ?
        ORDER BY o.ordered_at DESC
    `).bind(user.table_id).all();

    return c.json({
        status: 'ok',
        data: results
    });
});

// 3. GET /api/v2/menu/list
app.get('/api/v2/menu/list', authenticateToken, async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM menu_items').all();
    return c.json({ status: 'ok', data: results });
});

// 4. POST /api/v2/orders (Customer creates order)
app.post('/api/v2/orders', authenticateToken, async (c) => {
    const { menu_item_id, quantity } = await c.req.json();
    const user = c.get('user');
    const table_name = user.table_id;

    if (!menu_item_id || !quantity) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const tableInfo = await c.env.DB.prepare('SELECT status FROM tables WHERE name = ?').bind(table_name).first();
    if (tableInfo && tableInfo.status === 'checked_out') {
        return c.json({ error: '会計済みの卓です。追加の注文はできません。' }, 403);
    }

    const timestamp = new Date().toISOString();

    await c.env.DB.prepare('INSERT INTO orders (table_id, menu_item_id, quantity, ordered_at) VALUES (?, ?, ?, ?)')
        .bind(table_name, menu_item_id, quantity, timestamp)
        .run();

    return c.json({ status: 'ok', message: 'ご注文を承りました！' });
});


// 6. GET /api/v2/admin/tables
app.get('/api/v2/admin/tables', async (c) => {
    const { results: tables } = await c.env.DB.prepare('SELECT * FROM tables').all();
    const { results: orders } = await c.env.DB.prepare(`
        SELECT o.table_id, m.price, o.quantity
        FROM orders o
        JOIN menu_items m ON o.menu_item_id = m.id
    `).all();

    const result = tables.map(t => {
        const tableOrders = orders.filter(o => o.table_id === t.name);
        const total = tableOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
        return {
            name: t.name,
            status: t.status,
            total: total
        };
    });

    return c.json({ status: 'ok', data: result });
});

// 7. POST /api/v2/admin/checkout
app.post('/api/v2/admin/checkout', async (c) => {
    const { table_name } = await c.req.json();
    if (!table_name) return c.json({ error: 'Missing table_name' }, 400);
    
    await c.env.DB.prepare('UPDATE tables SET status = ? WHERE name = ?')
        .bind('checked_out', table_name)
        .run();
        
    return c.json({ status: 'ok', message: '会計処理が完了しました' });
});

// 7.5 POST /api/v2/admin/reset
app.post('/api/v2/admin/reset', async (c) => {
    const { table_name } = await c.req.json();
    if (!table_name) return c.json({ error: 'Missing table_name' }, 400);
    
    // Reset status to active
    await c.env.DB.prepare('UPDATE tables SET status = ? WHERE name = ?')
        .bind('active', table_name)
        .run();
        
    // Clear all past orders for this table so total is ¥0
    await c.env.DB.prepare('DELETE FROM orders WHERE table_id = ?')
        .bind(table_name)
        .run();
        
    return c.json({ status: 'ok', message: '卓をリセットしました' });
});

// 8. GET /api/v2/table/status
app.get('/api/v2/table/status', authenticateToken, async (c) => {
    const user = c.get('user');
    const table_name = user.table_id;
    const table = await c.env.DB.prepare('SELECT status FROM tables WHERE name = ?').bind(table_name).first();
    
    if (!table) return c.json({ error: 'Table not found' }, 404);
    
    return c.json({ status: 'ok', data: { status: table.status } });
});

export default app;
