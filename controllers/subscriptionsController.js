import { getPool, sql } from '../config/db.js';

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
  return res.json({ data: result.recordset || [] });
}

export async function createSubscription(req, res) {
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
  } = req.body;

  if (!player_id || !subscription_value || !start_date || !end_date) {
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
    .input('subscription_value', sql.Decimal(10, 2), subscription_value)
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

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Subscription created' });
}

export async function updateSubscription(req, res) {
  const { id } = req.params;
  const updates = req.body;
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

  const updateFields = [];
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  Object.entries(fieldMap).forEach(([key, field]) => {
    if (key in updates) {
      updateFields.push(`${field.col} = @${key}`);
      request.input(key, field.type, updates[key] ?? null);
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

  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT * FROM subscriptions WHERE id = @id');

  if (!updated.recordset?.length) {
    return res.status(404).json({ message: 'Subscription not found' });
  }

  return res.json({ data: updated.recordset[0], message: 'Subscription updated' });
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
