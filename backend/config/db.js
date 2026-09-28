const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
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
