import bcrypt from 'bcryptjs';
import { getPool, sql } from '../config/db.js';

export async function getUsers(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id AS branchId, u.created_at, b.name AS branchName
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY u.name`
    );
  return res.json({ data: result.recordset || [] });
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'User ID is required' });

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM users WHERE id = @id');

  if (!result.rowsAffected?.[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(204).send();
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { password, name, email, role, branch_id } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const pool = await getPool();
  const updates = [];
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  if (name) {
    updates.push('name = @name');
    request.input('name', sql.NVarChar, name);
  }
  if (email) {
    updates.push('email = @email');
    request.input('email', sql.NVarChar, email);
  }
  if (role) {
    updates.push('role = @role');
    request.input('role', sql.NVarChar, role);
  }
  if (branch_id) {
    updates.push('branch_id = @branch_id');
    request.input('branch_id', sql.UniqueIdentifier, branch_id);
  }
  if (password) {
    const hashed = await bcrypt.hash(String(password), 12);
    updates.push('password = @password');
    request.input('password', sql.NVarChar, hashed);
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  await request.query(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`);

  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT id, name, email, role, branch_id AS branchId FROM users WHERE id = @id');

  if (!updated.recordset?.length) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ data: updated.recordset[0], message: 'User updated' });
}
