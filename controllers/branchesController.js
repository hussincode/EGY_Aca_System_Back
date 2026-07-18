import { getPool, sql } from '../config/db.js';

export async function getBranches(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(`SELECT id, name, address AS location, contact AS manager, active, created_at FROM branches ORDER BY name`);
  return res.json({ data: result.recordset || [] });
}

export async function createBranch(req, res) {
  const { name, manager, location } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Branch name is required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('manager', sql.NVarChar, manager || '')
    .input('location', sql.NVarChar, location || '')
    .query(`
      INSERT INTO branches (id, name, address, contact, active)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.address AS location, INSERTED.contact AS manager, INSERTED.active, INSERTED.created_at
      VALUES (NEWID(), @name, @location, @manager, 1)
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Branch created' });
}

export async function updateBranch(req, res) {
  const { id } = req.params;
  const { name, manager, location } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'Branch ID is required' });
  }
  if (!name) {
    return res.status(400).json({ message: 'Branch name is required' });
  }

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('name', sql.NVarChar, name)
    .input('manager', sql.NVarChar, manager || '')
    .input('location', sql.NVarChar, location || '')
    .query(`
      UPDATE branches
      SET name = @name,
          address = @location,
          contact = @manager
      WHERE id = @id;
    `);

  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`SELECT id, name, address AS location, contact AS manager, active, created_at FROM branches WHERE id = @id`);

  if (!updated.recordset?.length) {
    return res.status(404).json({ message: 'Branch not found' });
  }

  return res.json({ data: updated.recordset[0], message: 'Branch updated' });
}

export async function deleteBranch(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Branch ID is required' });
  }

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM branches WHERE id = @id`);

  return res.status(204).send();
}
