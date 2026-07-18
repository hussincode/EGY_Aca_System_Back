import { getPool, sql } from '../config/db.js';

export async function getLeads(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT * FROM leads ORDER BY created_at DESC');
  return res.json({ data: result.recordset || [] });
}

export async function createLead(req, res) {
  const { name, phone, interest, status, branch_id, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('phone', sql.NVarChar, phone)
    .input('interest', sql.NVarChar, interest || null)
    .input('status', sql.NVarChar, status || 'new')
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('notes', sql.NVarChar, notes || null)
    .query(`
      INSERT INTO leads (id, name, phone, interest, status, branch_id, notes)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @name, @phone, @interest, @status, @branch_id, @notes)
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Lead created' });
}

export async function updateLead(req, res) {
  const { id } = req.params;
  const updates = req.body;
  if (!id) return res.status(400).json({ message: 'Lead ID is required' });

  const fields = [];
  const pool = await getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  const map = {
    name: { col: 'name', type: sql.NVarChar },
    phone: { col: 'phone', type: sql.NVarChar },
    interest: { col: 'interest', type: sql.NVarChar },
    status: { col: 'status', type: sql.NVarChar },
    branch_id: { col: 'branch_id', type: sql.UniqueIdentifier },
    notes: { col: 'notes', type: sql.NVarChar },
  };

  Object.entries(map).forEach(([key, value]) => {
    if (key in updates) {
      fields.push(`${value.col} = @${key}`);
      request.input(key, value.type, updates[key] ?? null);
    }
  });

  if (!fields.length) {
    return res.status(400).json({ message: 'No lead fields provided' });
  }

  await request.query(`UPDATE leads SET ${fields.join(', ')} WHERE id = @id`);
  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM leads WHERE id = @id');

  return res.json({ data: updated.recordset?.[0] || null, message: 'Lead updated' });
}

export async function deleteLead(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Lead ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM leads WHERE id = @id');

  return res.status(204).send();
}
