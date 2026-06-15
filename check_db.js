const db = require('./database');
const tables = db.prepare('SELECT * FROM tables').all();
console.log('Tables:', tables);
