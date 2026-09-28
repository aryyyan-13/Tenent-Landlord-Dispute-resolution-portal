const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isRemoteDb = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('supabase.com') ||
  process.env.DATABASE_URL.includes('render.com') ||
  process.env.DATABASE_URL.includes('sslmode=require') ||
  isProduction
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client:', err.message || err);
});

module.exports = {
  pool,
  query: (text, params) => {
    const start = Date.now();
    return pool.query(text, params).then(res => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.log('SLOW QUERY executed', { text, duration, rows: res.rowCount });
      }
      return res;
    });
  },
};
