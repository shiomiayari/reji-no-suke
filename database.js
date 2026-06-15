const Database = require('better-sqlite3');
const path = require('path');

// Connect to the SQLite database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database tables
const initDb = () => {
    // Create tables table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'active'
        )
    `).run();

    // Create users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff'
        )
    `).run();

    // Create menu_items table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL
        )
    `).run();

    // Create orders table
    // table_id stores the table name as TEXT
    db.prepare(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id TEXT NOT NULL,
            menu_item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
        )
    `).run();

    console.log('Database tables initialized.');
};

initDb();

module.exports = db;
