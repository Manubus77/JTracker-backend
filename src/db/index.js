const { Pool } = require('pg');
const config = require('../config');

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
});

const query = (text, params) => pool.query(text, params);

// Test database connection
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return { connected: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};

