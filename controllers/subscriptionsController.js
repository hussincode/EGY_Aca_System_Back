import { getPool, sql } from '../config/db.js';

function normalizeSubscriptionPayload(body = {}) {
  const toNullableString = (value) => {
    if (value === undefined || value === null || value === '') return null;
    return String(value);
  };

  // Only pass valid GUIDs to sql.UniqueIdentifier; empty strings / names cause a 500
  const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toNullableGuid = (value) => {
    if (!value || !GUID_RE.test(String(value).trim())) return null;
    return String(value).trim();
  };

  return {
    player_id: toNullableGuid(body.player_id ?? body.playerId),
    game_id:   toNullableGuid(body.game_id   ?? body.gameId),
    branch_id: toNullableGuid(body.branch_id ?? body.branchId),
    schedule: toNullableString(body.schedule),
    training_time: toNullableString(body.training_time ?? body.trainingTime),
    sessions: Number.isFinite(Number(body.sessions)) ? Number(body.sessions) : 0,
    subscription_value: body.subscription_value ?? body.subscriptionValue ?? null,
    paid_amount: Number.isFinite(Number(body.paid_amount ?? body.paidAmount)) ? Number(body.paid_amount ?? body.paidAmount) : 0,
    start_date: body.start_date ?? body.startDate ?? null,
    end_date: body.end_date ?? body.endDate ?? null,
    status: toNullableString(body.status) || 'active',
    invoice_number: toNullableString(body.invoice_number ?? body.invoiceNumber),
  };
}

function formatSubscriptionRecord(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    playerId: row.player_id || row.playerId || '',
    player_id: row.player_id || row.playerId || null,
    player: row.player_name || row.player || '',
    player_name: row.player_name || row.player || '',
    game: row.game_name || row.game || '',
    game_name: row.game_name || row.game || '',
    gameId: row.game_id || row.gameId || null,
    game_id: row.game_id || row.gameId || null,
    branch: row.branch_name || row.branch || '',
    branch_name: row.branch_name || row.branch || '',
    branchId: row.branch_id || row.branchId || null,
    branch_id: row.branch_id || row.branchId || null,
    schedule: row.schedule || '',
    trainingTime: row.training_time || row.trainingTime || '',
    training_time: row.training_time || row.trainingTime || '',
    sessions: Number(row.sessions || 0),
    subscriptionValue: Number(row.subscription_value ?? row.subscriptionValue ?? 0),
    subscription_value: Number(row.subscription_value ?? row.subscriptionValue ?? 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    paid_amount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    startDate: row.start_date || row.startDate || '',
    start_date: row.start_date || row.startDate || null,
    endDate: row.end_date || row.endDate || '',
    end_date: row.end_date || row.endDate || null,
    status: row.status || 'active',
    invoiceNumber: row.invoice_number || row.invoiceNumber || '',
    invoice_number: row.invoice_number || row.invoiceNumber || '',
  };
}

export { normalizeSubscriptionPayload };

export async function getSubscriptions(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(`
      SELECT s.*, p.name AS player_name, g.name AS game_name, b.name AS branch_name
      FROM subscriptions s
      LEFT JOIN players p ON s.player_id = p.id
      LEFT JOIN games g ON s.game_id = g.id
      LEFT JOIN branches b ON s.branch_id = b.id
      ORDER BY s.start_date DESC
    `);
  const formatted = (result.recordset || []).map(formatSubscriptionRecord);
  return res.json({ data: formatted });
}

export async function createSubscription(req, res) {
  const payload = normalizeSubscriptionPayload(req.body);
  const {
    player_id,
    game_id,
    branch_id,
    schedule,
    training_time,
    sessions,
    subscription_value,
    paid_amount,
    start_date,
    end_date,
    status,
    invoice_number,
  } = payload;

  const subVal = subscription_value !== null ? Number(subscription_value) : 0;

  if (!player_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'Missing required subscription fields' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('player_id', sql.UniqueIdentifier, player_id)
    .input('game_id', sql.UniqueIdentifier, game_id || null)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('schedule', sql.NVarChar, schedule || null)
    .input('training_time', sql.NVarChar, training_time || null)
    .input('sessions', sql.Int, sessions || 0)
    .input('subscription_value', sql.Decimal(10, 2), subVal)
    .input('paid_amount', sql.Decimal(10, 2), paid_amount || 0)
    .input('start_date', sql.Date, start_date)
    .input('end_date', sql.Date, end_date)
    .input('status', sql.NVarChar, status || 'active')
    .input('invoice_number', sql.NVarChar, invoice_number || null)
    .query(`
      INSERT INTO subscriptions (
        id, player_id, game_id, branch_id, schedule, training_time,
        sessions, subscription_value, paid_amount, start_date, end_date,
        status, invoice_number
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @player_id, @game_id, @branch_id, @schedule, @training_time,
        @sessions, @subscription_value, @paid_amount, @start_date, @end_date,
        @status, @invoice_number
      )
    `);

  const created = result.recordset?.[0] ? formatSubscriptionRecord(result.recordset[0]) : null;
  return res.status(201).json({ data: created, message: 'Subscription created' });
}

export async function updateSubscription(req, res) {
  const { id } = req.params;
  const updates = normalizeSubscriptionPayload(req.body);
  if (!id) return res.status(400).json({ message: 'Subscription ID is required' });

  const pool = await getPool();
  const fieldMap = {
    player_id: { col: 'player_id', type: sql.UniqueIdentifier },
    game_id: { col: 'game_id', type: sql.UniqueIdentifier },
    branch_id: { col: 'branch_id', type: sql.UniqueIdentifier },
    schedule: { col: 'schedule', type: sql.NVarChar },
    training_time: { col: 'training_time', type: sql.NVarChar },
    sessions: { col: 'sessions', type: sql.Int },
    subscription_value: { col: 'subscription_value', type: sql.Decimal(10, 2) },
    paid_amount: { col: 'paid_amount', type: sql.Decimal(10, 2) },
    start_date: { col: 'start_date', type: sql.Date },
    end_date: { col: 'end_date', type: sql.Date },
    status: { col: 'status', type: sql.NVarChar },
    invoice_number: { col: 'invoice_number', type: sql.NVarChar },
  };

  const nonNullableFields = new Set(['player_id', 'subscription_value', 'start_date', 'end_date']);
  const updateFields = [];
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  Object.entries(fieldMap).forEach(([key, field]) => {
    if (key in updates) {
      const val = updates[key];
      // Do not update NOT NULL columns if value is null
      if (val === null && nonNullableFields.has(key)) {
        return;
      }
      updateFields.push(`${field.col} = @${key}`);
      request.input(key, field.type, val ?? null);
    }
  });

  if (!updateFields.length) {
    return res.status(400).json({ message: 'No subscription fields provided' });
  }

  await request.query(`
    UPDATE subscriptions
    SET ${updateFields.join(', ')}
    WHERE id = @id;
  `);

  const updatedResult = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT s.*, p.name AS player_name, g.name AS game_name, b.name AS branch_name
      FROM subscriptions s
      LEFT JOIN players p ON s.player_id = p.id
      LEFT JOIN games g ON s.game_id = g.id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE s.id = @id
    `);

  if (!updatedResult.recordset?.length) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  const updated = formatSubscriptionRecord(updatedResult.recordset[0]);
  return res.json({ data: updated, message: 'Subscription updated' });
}

export async function deleteSubscription(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Subscription ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM subscriptions WHERE id = @id');

  return res.status(204).send();
}

