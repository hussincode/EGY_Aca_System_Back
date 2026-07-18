import bcrypt from 'bcryptjs';

import { getPool, sql } from '../config/db.js';
import { generateToken } from '../utils/generateToken.js';

function pickUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export async function register(req, res) {
  const { name, email, password, role, branch_id } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const pool = await getPool();

  const existing = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .query('SELECT TOP 1 * FROM users WHERE email = @email');

  if (existing.recordset?.length) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const hash = await bcrypt.hash(String(password), 12);

  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('email', sql.NVarChar, email)
    .input('password', sql.NVarChar, hash)
    .input('role', sql.NVarChar, role)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .query(`
      INSERT INTO users (name, email, password, role, branch_id)
      OUTPUT INSERTED.*
      VALUES (@name, @email, @password, @role, @branch_id)
    `);

  const created = result.recordset[0];
  return res.status(201).json({ data: pickUser(created), message: 'Created successfully' });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .query('SELECT TOP 1 * FROM users WHERE email = @email');

  const user = result.recordset?.[0];
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = generateToken(user);
  return res.json({ data: { token }, message: 'Logged in successfully' });
}

export async function me(req, res) {
  // req.user comes from JWT payload
  return res.json({ data: req.user });
}

