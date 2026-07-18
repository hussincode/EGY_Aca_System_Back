import { getPool, sql } from '../config/db.js';

export async function getAuditLogs(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = String(req.query.search || '').trim();
  const offset = (page - 1) * limit;

  const pool = await getPool();
  const whereClause = search ? `WHERE description LIKE @search OR related_to LIKE @search OR category LIKE @search` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM finance ${whereClause}`;
  const countRequest = pool.request();
  if (search) countRequest.input('search', sql.NVarChar, `%${search}%`);
  const countResult = await countRequest.query(countQuery);
  const total = countResult.recordset?.[0]?.total || 0;

  const query = `
    SELECT * FROM finance
    ${whereClause}
    ORDER BY date DESC, created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `;

  const request = pool.request().input('offset', sql.Int, offset).input('limit', sql.Int, limit);
  if (search) request.input('search', sql.NVarChar, `%${search}%`);

  const result = await request.query(query);
  return res.json({ data: result.recordset || [], pages: Math.max(1, Math.ceil(total / limit)), total, message: 'Audit logs fetched' });
}
