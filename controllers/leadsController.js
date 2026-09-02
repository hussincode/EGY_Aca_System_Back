import { getPool, sql } from '../config/db.js';

export async function getLeads(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(`
      SELECT l.*, b.name AS branch_name
      FROM leads l
      LEFT JOIN branches b ON l.branch_id = b.id
      ORDER BY l.created_at DESC
    `);
  return res.json({ data: result.recordset || [] });
}

export async function createLead(req, res) {
  const {
    name,
    parent,
    parentName,
    parent_name,
    phone,
    interest,
    sport,
    status,
    branch_id,
    branch,
    branch_name,
    notes,
    score,
    age,
    childAge,
    source,
    followDate,
  } = req.body;

  const leadName = name || req.body.childName || parentName || parent;
  if (!leadName || !phone) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }

  const pool = await getPool();
  let finalBranchId = branch_id || null;

  // If branch name provided instead of UUID, lookup branch_id
  const branchNameInput = branch || branch_name;
  if (!finalBranchId && branchNameInput) {
    const branchRes = await pool
      .request()
      .input('bName', sql.NVarChar, branchNameInput.trim())
      .query('SELECT TOP 1 id FROM branches WHERE name = @bName');
    if (branchRes.recordset?.length) {
      finalBranchId = branchRes.recordset[0].id;
    }
  }

  const finalParent = parent || parentName || parent_name || null;
  const finalInterest = interest || sport || null;
  const finalAge = age || childAge ? String(age || childAge) : null;
  const finalScore = score || 'hot';
  const finalSource = source || null;
  const finalFollowDate = followDate || null;

  const result = await pool
    .request()
    .input('name', sql.NVarChar, leadName)
    .input('parent', sql.NVarChar, finalParent)
    .input('phone', sql.NVarChar, phone)
    .input('interest', sql.NVarChar, finalInterest)
    .input('status', sql.NVarChar, status || 'new')
    .input('branch_id', sql.UniqueIdentifier, finalBranchId)
    .input('notes', sql.NVarChar, notes || null)
    .input('score', sql.NVarChar, finalScore)
    .input('age', sql.NVarChar, finalAge)
    .input('source', sql.NVarChar, finalSource)
    .input('followDate', sql.NVarChar, finalFollowDate)
    .query(`
      INSERT INTO leads (id, name, parent, phone, interest, status, branch_id, notes, score, age, source, followDate)
      OUTPUT INSERTED.*
      VALUES (NEWID(), @name, @parent, @phone, @interest, @status, @branch_id, @notes, @score, @age, @source, @followDate)
    `);

  const created = result.recordset?.[0] || null;
  return res.status(201).json({ data: created, message: 'Lead created' });
}

export async function updateLead(req, res) {
  const { id } = req.params;
  const updates = req.body;
  if (!id) return res.status(400).json({ message: 'Lead ID is required' });

  const fields = [];
  const pool = await getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  let branchIdToUse = updates.branch_id;
  if (!branchIdToUse && (updates.branch || updates.branch_name)) {
    const bName = updates.branch || updates.branch_name;
    const branchRes = await pool
      .request()
      .input('bName', sql.NVarChar, bName.trim())
      .query('SELECT TOP 1 id FROM branches WHERE name = @bName');
    if (branchRes.recordset?.length) {
      branchIdToUse = branchRes.recordset[0].id;
    }
  }

  const map = {
    name: { col: 'name', type: sql.NVarChar, val: updates.name },
    parent: { col: 'parent', type: sql.NVarChar, val: updates.parent || updates.parentName || updates.parent_name },
    phone: { col: 'phone', type: sql.NVarChar, val: updates.phone },
    interest: { col: 'interest', type: sql.NVarChar, val: updates.interest || updates.sport },
    status: { col: 'status', type: sql.NVarChar, val: updates.status },
    branch_id: { col: 'branch_id', type: sql.UniqueIdentifier, val: branchIdToUse },
    notes: { col: 'notes', type: sql.NVarChar, val: updates.notes },
    score: { col: 'score', type: sql.NVarChar, val: updates.score },
    age: { col: 'age', type: sql.NVarChar, val: updates.age != null ? String(updates.age) : undefined },
    source: { col: 'source', type: sql.NVarChar, val: updates.source },
    followDate: { col: 'followDate', type: sql.NVarChar, val: updates.followDate },
  };

  Object.entries(map).forEach(([key, config]) => {
    if (config.val !== undefined) {
      fields.push(`${config.col} = @${key}`);
      request.input(key, config.type, config.val ?? null);
    }
  });

  if (!fields.length) {
    return res.status(400).json({ message: 'No lead fields provided' });
  }

  await request.query(`UPDATE leads SET ${fields.join(', ')} WHERE id = @id`);
  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT l.*, b.name AS branch_name
      FROM leads l
      LEFT JOIN branches b ON l.branch_id = b.id
      WHERE l.id = @id
    `);

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
