import { getPool, sql } from '../config/db.js';

export async function getStaff(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT * FROM staff ORDER BY name');
  return res.json({ data: result.recordset || [] });
}

export async function createStaff(req, res) {
  const { staff_serial, name, phone, role, pay_type, rate, hours, revenue, branch_id } = req.body;
  if (!name || !role) {
    return res.status(400).json({ message: 'Name and role are required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('staff_serial', sql.NVarChar, staff_serial || null)
    .input('name', sql.NVarChar, name)
    .input('phone', sql.NVarChar, phone || null)
    .input('role', sql.NVarChar, role)
    .input('pay_type', sql.NVarChar, pay_type || null)
    .input('rate', sql.Decimal(10, 2), rate || 0)
    .input('hours', sql.Decimal(10, 2), hours || 0)
    .input('revenue', sql.Decimal(10, 2), revenue || 0)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .query(`
      INSERT INTO staff (id, staff_serial, name, phone, role, pay_type, rate, hours, revenue, branch_id)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @staff_serial, @name, @phone, @role, @pay_type, @rate, @hours, @revenue, @branch_id)
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Staff created' });
}

export async function updateStaff(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Staff ID is required' });

  const updates = [];
  const { staff_serial, name, phone, role, pay_type, rate, hours, revenue, branch_id } = req.body;
  const pool = await getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  if (staff_serial) {
    updates.push('staff_serial = @staff_serial');
    request.input('staff_serial', sql.NVarChar, staff_serial);
  }
  if (name) {
    updates.push('name = @name');
    request.input('name', sql.NVarChar, name);
  }
  if (phone) {
    updates.push('phone = @phone');
    request.input('phone', sql.NVarChar, phone);
  }
  if (role) {
    updates.push('role = @role');
    request.input('role', sql.NVarChar, role);
  }
  if (pay_type) {
    updates.push('pay_type = @pay_type');
    request.input('pay_type', sql.NVarChar, pay_type);
  }
  if (rate !== undefined) {
    updates.push('rate = @rate');
    request.input('rate', sql.Decimal(10, 2), rate);
  }
  if (hours !== undefined) {
    updates.push('hours = @hours');
    request.input('hours', sql.Decimal(10, 2), hours);
  }
  if (revenue !== undefined) {
    updates.push('revenue = @revenue');
    request.input('revenue', sql.Decimal(10, 2), revenue);
  }
  if (branch_id) {
    updates.push('branch_id = @branch_id');
    request.input('branch_id', sql.UniqueIdentifier, branch_id);
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No fields provided to update' });
  }

  await request.query(`UPDATE staff SET ${updates.join(', ')} WHERE id = @id`);
  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM staff WHERE id = @id');

  return res.json({ data: updated.recordset?.[0] || null, message: 'Staff updated' });
}

export async function deleteStaff(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Staff ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM staff WHERE id = @id');

  return res.status(204).send();
}
