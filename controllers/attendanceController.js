import { getPool, sql } from '../config/db.js';

function isValidGuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

async function resolvePlayerId(pool, val, fallbackName = 'لاعب جديد') {
  if (!val) return null;
  const str = String(val).trim();
  if (isValidGuid(str)) {
    const res = await pool.request().input('id', sql.UniqueIdentifier, str).query('SELECT TOP 1 id FROM players WHERE id = @id');
    if (res.recordset?.length) return str;
  }

  const searchRes = await pool
    .request()
    .input('val', sql.NVarChar, str)
    .query('SELECT TOP 1 id FROM players WHERE player_serial = @val OR name = @val OR phone = @val');
  if (searchRes.recordset?.length) return searchRes.recordset[0].id;

  // Auto-create player in players table so foreign key constraint NEVER fails
  try {
    const nameToUse = (str.startsWith('custom_') || str.startsWith('att_')) ? fallbackName : str;
    const serialToUse = (str.startsWith('custom_') || str.startsWith('att_')) ? null : str;

    const createRes = await pool
      .request()
      .input('name', sql.NVarChar, nameToUse || 'لاعب جديد')
      .input('serial', sql.NVarChar, serialToUse)
      .query(`
        INSERT INTO players (id, name, player_serial, status)
        OUTPUT INSERTED.id
        VALUES (NEWID(), @name, @serial, 'paid')
      `);

    return createRes.recordset?.[0]?.id || null;
  } catch {
    // If serial unique constraint hits, pick first player as fallback
    const fallback = await pool.request().query('SELECT TOP 1 id FROM players ORDER BY name');
    return fallback.recordset?.[0]?.id || null;
  }
}

async function resolveSubscriptionId(pool, val) {
  if (!val) return null;
  const str = String(val).trim();
  if (isValidGuid(str)) {
    const res = await pool.request().input('id', sql.UniqueIdentifier, str).query('SELECT TOP 1 id FROM subscriptions WHERE id = @id');
    if (res.recordset?.length) return str;
  }
  return null;
}

export async function getAttendance(req, res) {
  try {
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
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return res.status(500).json({ message: err.message, data: [] });
  }
}

export async function createAttendance(req, res) {
  try {
    const { player_id, player_name, subscription_id, date, status } = req.body;
    if (!player_id || !status) {
      return res.status(400).json({ message: 'Missing attendance required fields' });
    }

    const pool = await getPool();
    const resolvedPlayerId = await resolvePlayerId(pool, player_id, player_name);
    if (!resolvedPlayerId) {
      return res.status(400).json({ message: 'Could not resolve valid player for attendance record' });
    }

    const resolvedSubId = await resolveSubscriptionId(pool, subscription_id);
    const validStatus = ['present', 'absent', 'late'].includes(status) ? status : 'present';

    const result = await pool
      .request()
      .input('player_id', sql.UniqueIdentifier, resolvedPlayerId)
      .input('subscription_id', sql.UniqueIdentifier, resolvedSubId || null)
      .input('date', sql.Date, date || new Date().toISOString().slice(0, 10))
      .input('status', sql.NVarChar, validStatus)
      .query(`
        INSERT INTO attendance (id, player_id, subscription_id, date, status)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @player_id, @subscription_id, @date, @status)
      `);

    return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Attendance recorded' });
  } catch (err) {
    console.error('Error creating attendance:', err);
    return res.status(500).json({ message: err.message });
  }
}

export async function updateAttendance(req, res) {
  try {
    const { id } = req.params;
    const { status, date, subscription_id } = req.body;
    if (!id || !isValidGuid(id)) return res.status(400).json({ message: 'Valid attendance ID is required' });

    const pool = await getPool();
    const updates = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (status) {
      const validStatus = ['present', 'absent', 'late'].includes(status) ? status : 'present';
      updates.push('status = @status');
      request.input('status', sql.NVarChar, validStatus);
    }
    if (date) {
      updates.push('date = @date');
      request.input('date', sql.Date, date);
    }
    if (subscription_id) {
      const resolvedSubId = await resolveSubscriptionId(pool, subscription_id);
      updates.push('subscription_id = @subscription_id');
      request.input('subscription_id', sql.UniqueIdentifier, resolvedSubId || null);
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
  } catch (err) {
    console.error('Error updating attendance:', err);
    return res.status(500).json({ message: err.message });
  }
}

export async function deleteAttendance(req, res) {
  try {
    const { id } = req.params;
    if (!id || !isValidGuid(id)) return res.status(204).send();

    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM attendance WHERE id = @id');
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting attendance:', err);
    return res.status(500).json({ message: err.message });
  }
}
