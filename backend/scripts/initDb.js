// Creates the database and tables from config/schema.sql (skips if already created).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const db = process.env.DB_NAME || 'chicken_shop';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', multipleStatements: true });
  try {
    await conn.query(`SELECT 1 FROM \`${db}\`.users LIMIT 1`);
    console.log('Database already initialised, skipping schema.');
  } catch {
    const sql = fs.readFileSync(path.join(__dirname, '../config/schema.sql'), 'utf8')
      .replace(/chicken_shop/g, db);
    await conn.query(sql);
    console.log('Schema created.');
  }
  await conn.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
