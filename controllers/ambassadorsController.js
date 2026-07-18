import { getPool, sql } from '../config/db.js';

export async function getAmbassadors(req, res) {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM ambassadors ORDER BY name');
  return res.json({ data: result.recordset || [] });
}

export async function createAmbassador(req, res) {
  const { name, phone, branch_id, notes } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Ambassador name is required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('phone', sql.NVarChar, phone || null)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('notes', sql.NVarChar, notes || null)
    .query(`
      INSERT INTO ambassadors (id, name, phone, branch_id, notes)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @name, @phone, @branch_id, @notes)
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Ambassador created' });
}

export async function updateAmbassador(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Ambassador ID is required' });

  const updates = [];
  const pool = await getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  const map = {
    name: { col: 'name', type: sql.NVarChar },
    phone: { col: 'phone', type: sql.NVarChar },
    branch_id: { col: 'branch_id', type: sql.UniqueIdentifier },
    notes: { col: 'notes', type: sql.NVarChar },
  };

  Object.entries(map).forEach(([key, value]) => {
    if (key in req.body) {
      updates.push(`${value.col} = @${key}`);
      request.input(key, value.type, req.body[key] ?? null);
    }
  });

  if (!updates.length) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  await request.query(`UPDATE ambassadors SET ${updates.join(', ')} WHERE id = @id`);
  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM ambassadors WHERE id = @id');

  return res.json({ data: updated.recordset?.[0] || null, message: 'Ambassador updated' });
}

export async function deleteAmbassador(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Ambassador ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM ambassadors WHERE id = @id');

  return res.status(204).send();
}
