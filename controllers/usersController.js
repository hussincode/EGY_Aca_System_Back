import bcrypt from 'bcryptjs';
import { getPool, sql } from '../config/db.js';

export async function getUsers(req, res) {
  try {
    const pool = await getPool();

    // Check count and seed standard users if database contains only 1 admin user
    const countRes = await pool.request().query('SELECT COUNT(*) AS total FROM users');
    const total = countRes.recordset?.[0]?.total || 0;

    if (total <= 1) {
      const defaultPasswordHash = '$2b$12$JlzNRmROaJM5.2avQN6R7Ok8eAFrCw4VcbiovUYL7BaD9jx5P25P2';
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'ahmed@egy-sports.com')
          INSERT INTO users (id, name, email, password, role, branch_id)
          VALUES (NEWID(), N'أحمد (Manager)', 'ahmed@egy-sports.com', '${defaultPasswordHash}', 'manager', NULL);

          IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'mohamed@egy-sports.com')
          INSERT INTO users (id, name, email, password, role, branch_id)
          VALUES (NEWID(), N'محمد (Manager)', 'mohamed@egy-sports.com', '${defaultPasswordHash}', 'manager', NULL);

          IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'coach@egy-sports.com')
          INSERT INTO users (id, name, email, password, role, branch_id)
          VALUES (NEWID(), N'كابتن محمود (Coach)', 'coach@egy-sports.com', '${defaultPasswordHash}', 'coach', NULL);

          IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'accountant@egy-sports.com')
          INSERT INTO users (id, name, email, password, role, branch_id)
          VALUES (NEWID(), N'مصطفى (Accountant)', 'accountant@egy-sports.com', '${defaultPasswordHash}', 'accountant', NULL);
        `);
      } catch (seedErr) {
        console.error('Failed to auto-seed default users in MSSQL:', seedErr);
      }
    }

    const result = await pool
      .request()
      .query(
        `SELECT u.id, u.name, u.email, u.role, u.branch_id AS branchId, u.created_at, b.name AS branchName
         FROM users u
         LEFT JOIN branches b ON u.branch_id = b.id
         ORDER BY u.name`
      );
    return res.json({ data: result.recordset || [] });
  } catch (err) {
    console.error('Error in getUsers:', err);
    return res.status(500).json({ message: err.message, data: [] });
  }
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
