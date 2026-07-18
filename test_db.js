import { getPool } from './config/db.js';

async function testConnection() {
  console.log('Testing connection to SQL Server...');
  try {
    const pool = await getPool();
    console.log('Connection successful!');
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('SQL Server Version:', result.recordset[0].version);
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
