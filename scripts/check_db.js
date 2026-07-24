import { getPool } from '../config/db.js';

async function checkColumns() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users'
    `);
    console.log('Columns in users table:');
    console.log(JSON.stringify(result.recordset, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error querying columns:', error);
    process.exit(1);
  }
}

checkColumns();
