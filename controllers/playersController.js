import { getPool, sql } from '../config/db.js';

export async function getPlayers(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query(`
      SELECT p.*, g.name AS game_name, b.name AS branch_name
      FROM players p
      LEFT JOIN games g ON p.game_id = g.id
      LEFT JOIN branches b ON p.branch_id = b.id
      ORDER BY p.name
    `);
  return res.json({ data: result.recordset || [] });
}

export async function createPlayer(req, res) {
  const {
    playerSerial,
    name,
    age,
    phone,
    game_id,
    branch_id,
    status,
    photo,
    schedule,
    member_type,
    member_id,
    member_expiry,
    member_value,
    amb_ref_code,
    joined,
    join_date,
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Player name is required' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('playerSerial', sql.NVarChar, playerSerial || null)
    .input('name', sql.NVarChar, name)
    .input('age', sql.Int, age || null)
    .input('phone', sql.NVarChar, phone || null)
    .input('game_id', sql.UniqueIdentifier, game_id || null)
    .input('branch_id', sql.UniqueIdentifier, branch_id || null)
    .input('status', sql.NVarChar, status || 'paid')
    .input('photo', sql.NVarChar, photo || null)
    .input('schedule', sql.NVarChar, schedule || null)
    .input('member_type', sql.NVarChar, member_type || 'none')
    .input('member_id', sql.NVarChar, member_id || null)
    .input('member_expiry', sql.Date, member_expiry || null)
    .input('member_value', sql.Decimal(10, 2), member_value || null)
    .input('amb_ref_code', sql.NVarChar, amb_ref_code || null)
    .input('joined', sql.Bit, joined === true)
    .input('join_date', sql.Date, join_date || null)
    .query(`
      INSERT INTO players (
        id, player_serial, name, age, phone, game_id, branch_id, status,
        photo, schedule, member_type, member_id, member_expiry,
        member_value, amb_ref_code, joined, join_date
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @playerSerial, @name, @age, @phone, @game_id, @branch_id, @status,
        @photo, @schedule, @member_type, @member_id, @member_expiry,
        @member_value, @amb_ref_code, @joined, @join_date
      )
    `);

  return res.status(201).json({ data: result.recordset?.[0] || null, message: 'Player created' });
}

export async function updatePlayer(req, res) {
  const { id } = req.params;
  const updates = req.body;
  if (!id) return res.status(400).json({ message: 'Player ID is required' });

  const pool = await getPool();
  const updateFields = [];
  const request = pool.request().input('id', sql.UniqueIdentifier, id);

  const fieldMap = {
    playerSerial: { name: 'player_serial', type: sql.NVarChar },
    name: { name: 'name', type: sql.NVarChar },
    age: { name: 'age', type: sql.Int },
    phone: { name: 'phone', type: sql.NVarChar },
    game_id: { name: 'game_id', type: sql.UniqueIdentifier },
    branch_id: { name: 'branch_id', type: sql.UniqueIdentifier },
    status: { name: 'status', type: sql.NVarChar },
    photo: { name: 'photo', type: sql.NVarChar },
    schedule: { name: 'schedule', type: sql.NVarChar },
    member_type: { name: 'member_type', type: sql.NVarChar },
    member_id: { name: 'member_id', type: sql.NVarChar },
    member_expiry: { name: 'member_expiry', type: sql.Date },
    member_value: { name: 'member_value', type: sql.Decimal(10, 2) },
    amb_ref_code: { name: 'amb_ref_code', type: sql.NVarChar },
    joined: { name: 'joined', type: sql.Bit },
    join_date: { name: 'join_date', type: sql.Date },
  };

  Object.entries(fieldMap).forEach(([key, field]) => {
    if (key in updates) {
      updateFields.push(`${field.name} = @${key}`);
      request.input(key, field.type, updates[key] ?? null);
    }
  });

  if (!updateFields.length) {
    return res.status(400).json({ message: 'No player updates provided' });
  }

  await request.query(`
    UPDATE players
    SET ${updateFields.join(', ')}
    WHERE id = @id;
  `);

  const updated = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`SELECT * FROM players WHERE id = @id`);

  if (!updated.recordset?.length) {
    return res.status(404).json({ message: 'Player not found' });
  }

  return res.json({ data: updated.recordset[0], message: 'Player updated' });
}

export async function deletePlayer(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Player ID is required' });

  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM players WHERE id = @id');

  return res.status(204).send();
}
