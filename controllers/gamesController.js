import { getPool, sql } from '../config/db.js';

export async function getGames(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT id, name, description, active, created_at FROM games ORDER BY name');
  return res.json({ data: result.recordset || [] });
}

export async function createGame(req, res) {
  const { name, description, active } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Game name is required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('description', sql.NVarChar, description || '')
    .input('active', sql.Bit, active === true)
    .query(`
      INSERT INTO games (id, name, description, active)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.active, INSERTED.created_at
      VALUES (NEWID(), @name, @description, @active)
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Game created' });
}

export async function updateGame(req, res) {
  const { id } = req.params;
  const { name, description, active } = req.body;
  if (!id) return res.status(400).json({ message: 'Game ID is required' });
  if (!name) return res.status(400).json({ message: 'Game name is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('name', sql.NVarChar, name)
    .input('description', sql.NVarChar, description || '')
    .input('active', sql.Bit, active === true)
    .query(`
      UPDATE games
      SET name = @name,
          description = @description,
          active = @active
      WHERE id = @id;
    `);

  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT id, name, description, active, created_at FROM games WHERE id = @id');

  if (!updated.recordset?.length) {
    return res.status(404).json({ message: 'Game not found' });
  }

  return res.json({ data: updated.recordset[0], message: 'Game updated' });
}

export async function deleteGame(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Game ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM games WHERE id = @id');

  return res.status(204).send();
}
