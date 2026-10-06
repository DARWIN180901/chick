require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chicken_shop',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,      // DATE/TIME come back as plain strings
  decimalNumbers: true,   // DECIMAL comes back as numbers
});

// Keep CURDATE()/NOW() in the shop's timezone on every connection.
pool.pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${process.env.DB_TIMEZONE || '+05:30'}'`);
});

module.exports = pool;
