import { getPool, sql } from '../config/db.js';

export async function getAttendance(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(`
      SELECT a.*, p.name AS player_name, s.schedule AS subscription_schedule
      FROM attendance a
      LEFT JOIN players p ON a.player_id = p.id
      LEFT JOIN subscriptions s ON a.subscription_id = s.id
      ORDER BY a.date DESC
    `);
  return res.json({ data: result.recordset || [] });
}

export async function createAttendance(req, res) {
  const { player_id, subscription_id, date, status } = req.body;
  if (!player_id || !status) {
    return res.status(400).json({ message: 'Missing attendance required fields' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('player_id', sql.UniqueIdentifier, player_id)
    .input('subscription_id', sql.UniqueIdentifier, subscription_id || null)
    .input('date', sql.Date, date || new Date().toISOString().slice(0, 10))
    .input('status', sql.NVarChar, status)
    .query(`
      INSERT INTO attendance (id, player_id, subscription_id, date, status)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @player_id, @subscription_id, @date, @status)
    `);
  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Attendance recorded' });
}

export async function updateAttendance(req, res) {
  const { id } = req.params;
  const { status, date, subscription_id } = req.body;
  if (!id) return res.status(400).json({ message: 'Attendance ID is required' });

  const updates = [];
  const pool = await getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  if (status) {
    updates.push('status = @status');
    request.input('status', sql.NVarChar, status);
  }
  if (date) {
    updates.push('date = @date');
    request.input('date', sql.Date, date);
  }
  if (subscription_id) {
    updates.push('subscription_id = @subscription_id');
    request.input('subscription_id', sql.UniqueIdentifier, subscription_id);
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No attendance fields provided' });
  }

  await request.query(`UPDATE attendance SET ${updates.join(', ')} WHERE id = @id`);
  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM attendance WHERE id = @id');

  return res.json({ data: updated.recordset?.[0] || null, message: 'Attendance updated' });
}

export async function deleteAttendance(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Attendance ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM attendance WHERE id = @id');
  return res.status(204).send();
}
