import { getPool, sql } from '../config/db.js';

export async function getAuditLogs(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = String(req.query.search || '').trim();
    const userFilter = String(req.query.user || '').trim();
    const typeFilter = String(req.query.type || '').trim();
    const offset = (page - 1) * limit;

    const pool = await getPool();
    const conditions = [];
    const request = pool.request().input('offset', sql.Int, offset).input('limit', sql.Int, limit);

    if (search) {
      conditions.push(`(f.description LIKE @search OR f.related_to LIKE @search OR f.category LIKE @search OR u.name LIKE @search)`);
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (userFilter) {
      conditions.push(`(u.name LIKE @userFilter OR CAST(f.created_by_id AS NVARCHAR(100)) = @userFilterExact)`);
      request.input('userFilter', sql.NVarChar, `%${userFilter}%`);
      request.input('userFilterExact', sql.NVarChar, userFilter);
    }
    if (typeFilter) {
      conditions.push(`f.type = @typeFilter`);
      request.input('typeFilter', sql.NVarChar, typeFilter);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM finance f
      LEFT JOIN users u ON f.created_by_id = u.id
      ${whereClause}
    `;
    const countRequest = pool.request();
    if (search) countRequest.input('search', sql.NVarChar, `%${search}%`);
    if (userFilter) {
      countRequest.input('userFilter', sql.NVarChar, `%${userFilter}%`);
      countRequest.input('userFilterExact', sql.NVarChar, userFilter);
    }
    if (typeFilter) countRequest.input('typeFilter', sql.NVarChar, typeFilter);

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset?.[0]?.total || 0;

    const query = `
      SELECT f.*, u.name AS userName, u.role AS userRole
      FROM finance f
      LEFT JOIN users u ON f.created_by_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC, f.date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const result = await request.query(query);
    const rawList = result.recordset || [];

    const mappedLogs = rawList.map((row) => ({
      id: row.id,
      createdAt: row.created_at || row.date,
      userName: row.userName || 'مدير النظام',
      userRole: row.userRole || 'manager',
      action: row.type === 'income' ? 'عملية إيراد / بيع' : 'عملية مصروف / شراء',
      section: row.category || 'المالية',
      description: row.description || `${row.category} - ${row.related_to || ''} (${row.amount} ج.م)`,
      amount: row.amount,
      relatedTo: row.related_to,
      type: row.type,
    }));

    return res.json({
      data: rawList,
      logs: mappedLogs,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
      message: 'Audit logs fetched successfully',
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ message: err.message, logs: [], data: [], pages: 1, total: 0 });
  }
}
