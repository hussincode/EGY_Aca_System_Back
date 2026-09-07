import { getPool, sql } from '../config/db.js';

function isValidGuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

async function resolveForeignKey(pool, value, tableName) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!isValidGuid(normalized)) return null;

  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, normalized)
    .query(`SELECT TOP 1 1 AS found FROM ${tableName} WHERE id = @id`);

  return result.recordset?.length ? normalized : null;
}

async function resolveAmbRefCode(pool, value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  try {
    const result = await pool
      .request()
      .input('code', sql.NVarChar, normalized)
      .query(`
        SELECT TOP 1 ref_code 
        FROM ambassadors 
        WHERE ref_code = @code 
           OR id = TRY_CAST(@code AS uniqueidentifier)
           OR name = @code
      `);

    return result.recordset?.length ? result.recordset[0].ref_code : null;
  } catch {
    return null;
  }
}

async function resolveUniquePlayerSerial(pool, requestedSerial) {
  const serialTrimmed = requestedSerial ? String(requestedSerial).trim() : '';

  if (serialTrimmed) {
    const check = await pool
      .request()
      .input('serial', sql.NVarChar, serialTrimmed)
      .query('SELECT TOP 1 id FROM players WHERE player_serial = @serial');
    if (!check.recordset?.length) {
      return serialTrimmed;
    }
  }

  const allSerialsResult = await pool
    .request()
    .query("SELECT player_serial FROM players WHERE player_serial LIKE 'PLY-%'");

  const used = new Set();
  let max = 0;
  (allSerialsResult.recordset || []).forEach((row) => {
    const match = row.player_serial?.match(/^PLY-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num)) {
        used.add(num);
        if (num > max) max = num;
      }
    }
  });

  let nextSeq = 1;
  for (let i = 1; i <= max + 1; i++) {
    if (!used.has(i)) {
      nextSeq = i;
      break;
    }
  }

  const padLength = serialTrimmed?.match(/^PLY-(\d+)$/i)?.[1]?.length || 2;
  return `PLY-${String(nextSeq).padStart(padLength, '0')}`;
}

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
  const resolvedGameId = await resolveForeignKey(pool, game_id, 'games');
  const resolvedBranchId = await resolveForeignKey(pool, branch_id, 'branches');
  const resolvedAmbRefCode = await resolveAmbRefCode(pool, amb_ref_code);
  const resolvedPlayerSerial = await resolveUniquePlayerSerial(pool, playerSerial);

  const result = await pool
    .request()
    .input('playerSerial', sql.NVarChar, resolvedPlayerSerial)
    .input('name', sql.NVarChar, name)
    .input('age', sql.Int, age || null)
    .input('phone', sql.NVarChar, phone || null)
    .input('game_id', sql.UniqueIdentifier, resolvedGameId || null)
    .input('branch_id', sql.UniqueIdentifier, resolvedBranchId || null)
    .input('status', sql.NVarChar, status || 'paid')
    .input('photo', sql.NVarChar, photo || null)
    .input('schedule', sql.NVarChar, schedule || null)
    .input('member_type', sql.NVarChar, member_type || 'none')
    .input('member_id', sql.NVarChar, member_id || null)
    .input('member_expiry', sql.Date, member_expiry || null)
    .input('member_value', sql.Decimal(10, 2), member_value || null)
    .input('amb_ref_code', sql.NVarChar, resolvedAmbRefCode || null)
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
  const updates = { ...req.body };
  if (!id) return res.status(400).json({ message: 'Player ID is required' });

  const pool = await getPool();

  if ('game_id' in updates) {
    updates.game_id = await resolveForeignKey(pool, updates.game_id, 'games');
  }
  if ('branch_id' in updates) {
    updates.branch_id = await resolveForeignKey(pool, updates.branch_id, 'branches');
  }
  if ('amb_ref_code' in updates) {
    updates.amb_ref_code = await resolveAmbRefCode(pool, updates.amb_ref_code);
  }
  if ('ambId' in updates && !('amb_ref_code' in updates)) {
    updates.amb_ref_code = await resolveAmbRefCode(pool, updates.ambId);
  }
  if ('playerSerial' in updates && updates.playerSerial) {
    const serialTrimmed = String(updates.playerSerial).trim();
    const check = await pool
      .request()
      .input('serial', sql.NVarChar, serialTrimmed)
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT TOP 1 id FROM players WHERE player_serial = @serial AND id <> @id');
    if (check.recordset?.length) {
      delete updates.playerSerial;
    }
  }

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
