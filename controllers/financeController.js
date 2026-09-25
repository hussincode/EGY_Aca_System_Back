import { getPool, sql } from '../config/db.js';

function isValidGuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

function normalizeArabic(str = '') {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/^فرع\s+/, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

async function resolveBranchId(pool, val, relatedTo = null, sourceId = null, description = null) {
  let allBranches = [];
  try {
    const res = await pool.request().query('SELECT id, name FROM branches');
    allBranches = res.recordset || [];
  } catch {}

  const matchFromText = (text) => {
    if (!text || !allBranches.length) return null;
    const str = String(text).trim();
    if (isValidGuid(str)) return str;

    // 1. Exact match
    const exact = allBranches.find((b) => b.name && b.name.trim().toLowerCase() === str.toLowerCase());
    if (exact) return exact.id;

    // 2. Normalized match
    const norm = normalizeArabic(str);
    if (!norm) return null;

    const normMatch = allBranches.find((b) => {
      if (!b.name) return false;
      const bNorm = normalizeArabic(b.name);
      return bNorm === norm || bNorm.includes(norm) || norm.includes(bNorm);
    });
    if (normMatch) return normMatch.id;

    return null;
  };

  // 1. Direct branch value
  if (val) {
    const found = matchFromText(val);
    if (found) return found;
  }

  // 2. From sourceId (subscriptions)
  if (sourceId && isValidGuid(sourceId)) {
    try {
      const res = await pool
        .request()
        .input('subId', sql.UniqueIdentifier, sourceId)
        .query('SELECT TOP 1 branch_id FROM subscriptions WHERE id = @subId AND branch_id IS NOT NULL');
      if (res.recordset?.length && res.recordset[0].branch_id) return res.recordset[0].branch_id;
    } catch {}
  }

  // 3. From relatedTo (direct branch name or player)
  if (relatedTo) {
    const foundBranch = matchFromText(relatedTo);
    if (foundBranch) return foundBranch;

    try {
      const res = await pool
        .request()
        .input('pName', sql.NVarChar, String(relatedTo).trim())
        .query('SELECT TOP 1 branch_id FROM players WHERE name = @pName AND branch_id IS NOT NULL');
      if (res.recordset?.length && res.recordset[0].branch_id) return res.recordset[0].branch_id;
    } catch {}
  }

  // 4. From description (e.g., 'فرع: الدقي' or 'شراء ... - فرع: ...')
  if (description) {
    for (const b of allBranches) {
      if (b.name && description.includes(b.name)) {
        return b.id;
      }
      const bNorm = normalizeArabic(b.name);
      if (bNorm && normalizeArabic(description).includes(bNorm)) {
        return b.id;
      }
    }
  }

  return null;
}

function normalizeFinancePayload(body = {}) {
  const toNullableString = (value) => {
    if (value === undefined || value === null || value === '') return null;
    return String(value);
  };

  return {
    type: toNullableString(body.type ?? body.Type),
    category: toNullableString(body.category ?? body.Category),
    branch_id: body.branch_id ?? body.branchId ?? body.branch ?? body.branch_name ?? body.branchName ?? null,
    related_to: toNullableString(body.related_to ?? body.relatedTo),
    amount: Number(body.amount ?? body.Amount ?? 0),
    date: body.date ?? body.Date ?? null,
    description: toNullableString(body.description ?? body.Description),
    source: toNullableString(body.source ?? body.Source),
    source_id: body.source_id ?? body.sourceId ?? null,
    created_by_id: body.created_by_id ?? body.createdById ?? null,
  };
}

export { normalizeFinancePayload };

export async function getFinanceRecords(req, res) {
  try {
    const pool = await getPool();

    // Auto-backfill NULL branch_id in database from subscriptions or players
    try {
      await pool.request().query(`
        UPDATE f
        SET f.branch_id = COALESCE(sub.branch_id, p_sub.branch_id, ply.branch_id)
        FROM finance f
        LEFT JOIN subscriptions sub ON f.source_id = sub.id
        LEFT JOIN players p_sub ON sub.player_id = p_sub.id
        LEFT JOIN players ply ON f.related_to = ply.name
        WHERE f.branch_id IS NULL AND COALESCE(sub.branch_id, p_sub.branch_id, ply.branch_id) IS NOT NULL;
      `);
    } catch (backfillErr) {
      console.warn('Finance branch backfill note:', backfillErr.message);
    }

    const result = await pool
      .request()
      .query(`
        SELECT f.*, 
               COALESCE(b.name, sb_branch.name, pb_sub.name, pb_ply.name) AS branch_name, 
               COALESCE(b.name, sb_branch.name, pb_sub.name, pb_ply.name) AS branch
        FROM finance f
        LEFT JOIN branches b ON f.branch_id = b.id
        LEFT JOIN subscriptions sub ON f.source_id = sub.id
        LEFT JOIN branches sb_branch ON sub.branch_id = sb_branch.id
        LEFT JOIN players p_sub ON sub.player_id = p_sub.id
        LEFT JOIN branches pb_sub ON p_sub.branch_id = pb_sub.id
        LEFT JOIN players ply ON f.related_to = ply.name
        LEFT JOIN branches pb_ply ON ply.branch_id = pb_ply.id
        ORDER BY f.date DESC, f.created_at DESC
      `);
    return res.json({ data: result.recordset || [] });
  } catch (err) {
    console.error('Error in getFinanceRecords:', err);
    return res.status(500).json({ message: err.message, data: [] });
  }
}

export async function createFinanceRecord(req, res) {
  const payload = normalizeFinancePayload(req.body);
  const { type, category, branch_id, related_to, amount, date, description, source, source_id, created_by_id } = payload;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ message: 'Missing required finance fields' });
  }

  const pool = await getPool();
  const resolvedBranchId = await resolveBranchId(pool, branch_id, related_to, source_id, description);

  const result = await pool
    .request()
    .input('type', sql.NVarChar, type)
    .input('category', sql.NVarChar, category)
    .input('branch_id', sql.UniqueIdentifier, resolvedBranchId)
    .input('related_to', sql.NVarChar, related_to || null)
    .input('amount', sql.Decimal(12, 2), amount)
    .input('date', sql.Date, date)
    .input('description', sql.NVarChar, description || null)
    .input('source', sql.NVarChar, source || null)
    .input('source_id', sql.UniqueIdentifier, source_id || null)
    .input('created_by_id', sql.UniqueIdentifier, created_by_id || null)
    .query(`
      INSERT INTO finance (
        id, type, category, branch_id, related_to, amount, date, description, source, source_id, created_by_id
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @type, @category, @branch_id, @related_to, @amount, @date, @description, @source, @source_id, @created_by_id
      )
    `);

  const createdRow = result.recordset?.[0] || null;
  if (createdRow && resolvedBranchId) {
    const bRes = await pool.request().input('bId', sql.UniqueIdentifier, resolvedBranchId).query('SELECT TOP 1 name FROM branches WHERE id = @bId');
    if (bRes.recordset?.length) {
      createdRow.branch_name = bRes.recordset[0].name;
      createdRow.branch = bRes.recordset[0].name;
    }
  }

  return res.status(201).json({ data: createdRow, message: 'Finance record created' });
}

export async function updateFinanceRecord(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Finance ID is required' });

  const payload = normalizeFinancePayload(req.body);
  const { type, category, branch_id, related_to, amount, date, description, source, source_id } = payload;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ message: 'Missing required finance fields' });
  }

  const pool = await getPool();
  const resolvedBranchId = await resolveBranchId(pool, branch_id, related_to, source_id, description);

  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('type', sql.NVarChar, type)
    .input('category', sql.NVarChar, category)
    .input('branch_id', sql.UniqueIdentifier, resolvedBranchId)
    .input('related_to', sql.NVarChar, related_to || null)
    .input('amount', sql.Decimal(12, 2), amount)
    .input('date', sql.Date, date)
    .input('description', sql.NVarChar, description || null)
    .input('source', sql.NVarChar, source || null)
    .input('source_id', sql.UniqueIdentifier, source_id || null)
    .query(`
      UPDATE finance
      SET type = @type,
          category = @category,
          branch_id = @branch_id,
          related_to = @related_to,
          amount = @amount,
          date = @date,
          description = @description,
          source = @source,
          source_id = @source_id
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  if (!result.rowsAffected?.[0]) {
    return res.status(404).json({ message: 'Finance record not found' });
  }

  const updatedRow = result.recordset?.[0] || null;
  if (updatedRow && resolvedBranchId) {
    const bRes = await pool.request().input('bId', sql.UniqueIdentifier, resolvedBranchId).query('SELECT TOP 1 name FROM branches WHERE id = @bId');
    if (bRes.recordset?.length) {
      updatedRow.branch_name = bRes.recordset[0].name;
      updatedRow.branch = bRes.recordset[0].name;
    }
  }

  return res.json({ data: updatedRow, message: 'Finance record updated' });
}

export async function deleteFinanceRecord(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Finance ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM finance WHERE id = @id');

  return res.status(204).send();
}
