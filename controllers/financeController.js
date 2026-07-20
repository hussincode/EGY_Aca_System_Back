import { getPool, sql } from '../config/db.js';

export async function getFinanceRecords(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT * FROM finance ORDER BY date DESC, created_at DESC');
  return res.json({ data: result.recordset || [] });
}

export async function createFinanceRecord(req, res) {
  const { type, category, branch_id, related_to, amount, date, description, source, source_id, created_by_id } = req.body;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ message: 'Missing required finance fields' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('type', sql.NVarChar, type)
    .input('category', sql.NVarChar, category)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('related_to', sql.NVarChar, related_to || null)
    .input('amount', sql.Decimal(12, 2), amount)
    .input('date', sql.Date, date)
    .input('description', sql.NVarChar, description || null)
    .input('source', sql.NVarChar, source || null)
    .input('source_id', sql.UniqueIdentifier, source_id || null)
    .input('created_by_id', sql.UniqueIdentifier, created_by_id || null)
    .query(`
      INSERT INTO finance (
        id, type, category, branch_id, related_to, amount, date, description, source, source_id, created_by_id
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @type, @category, @branch_id, @related_to, @amount, @date, @description, @source, @source_id, @created_by_id
      )
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Finance record created' });
}

export async function updateFinanceRecord(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Finance ID is required' });

  const { type, category, branch_id, related_to, amount, date, description, source, source_id } = req.body;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ message: 'Missing required finance fields' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('type', sql.NVarChar, type)
    .input('category', sql.NVarChar, category)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('related_to', sql.NVarChar, related_to || null)
    .input('amount', sql.Decimal(12, 2), amount)
    .input('date', sql.Date, date)
    .input('description', sql.NVarChar, description || null)
    .input('source', sql.NVarChar, source || null)
    .input('source_id', sql.UniqueIdentifier, source_id || null)
    .query(`
      UPDATE finance
      SET type = @type,
          category = @category,
          branch_id = @branch_id,
          related_to = @related_to,
          amount = @amount,
          date = @date,
          description = @description,
          source = @source,
          source_id = @source_id
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  if (!result.rowsAffected?.[0]) {
    return res.status(404).json({ message: 'Finance record not found' });
  }

  return res.json({ data: result.recordset?.[0] || null, message: 'Finance record updated' });
}

export async function deleteFinanceRecord(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Finance ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM finance WHERE id = @id');

  return res.status(204).send();
}
