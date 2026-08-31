import express from 'express';
import { getPool, sql } from '../config/db.js';

const router = express.Router();

/**
 * POST /api/parent-portal/lookup
 * Public endpoint – no auth required.
 * Body: { player_id: string, phone: string }
 * Returns: player info, active subscription, attendance records
 */
router.post('/lookup', async (req, res) => {
  try {
    const { player_id, phone } = req.body;

    if (!player_id || !phone) {
      return res.status(400).json({ message: 'player_id and phone are required' });
    }

    const pool = await getPool();
    const cleanPhone = String(phone).trim().replace(/\s+/g, '');
    const cleanId   = String(player_id).trim();

    // Find player by serial OR id, AND matching phone
    const playerRes = await pool
      .request()
      .input('serial', sql.NVarChar, cleanId)
      .input('phone', sql.NVarChar, cleanPhone)
      .query(`
        SELECT TOP 1
          p.id,
          p.name,
          p.player_serial,
          p.phone,
          p.age,
          p.status,
          p.photo,
          g.name AS sport,
          b.name AS branch
        FROM players p
        LEFT JOIN games    g ON p.game_id   = g.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE (p.player_serial = @serial 
               OR CAST(p.id AS NVARCHAR(50)) = @serial
               OR p.name = @serial)
          AND (p.phone = @phone
               OR REPLACE(REPLACE(p.phone, ' ', ''), '-', '') = @phone
               OR RIGHT(REPLACE(REPLACE(p.phone, ' ', ''), '-', ''), 10) = RIGHT(@phone, 10))
      `);

    if (!playerRes.recordset?.length) {
      return res.status(404).json({ message: 'لم يتم العثور على اللاعب. تأكد من الرقم التعريفي ورقم الهاتف.' });
    }

    const player = playerRes.recordset[0];

    // Get active (or latest) subscription
    const subRes = await pool
      .request()
      .input('pid', sql.UniqueIdentifier, player.id)
      .query(`
        SELECT TOP 1
          s.id,
          s.start_date,
          s.end_date,
          s.sessions,
          s.status,
          s.subscription_value,
          s.paid_amount,
          s.schedule,
          g.name AS sport,
          b.name AS branch
        FROM subscriptions s
        LEFT JOIN games    g ON s.game_id   = g.id
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE s.player_id = @pid
        ORDER BY
          CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
          s.end_date DESC
      `);

    const subscription = subRes.recordset?.[0] || null;

    // Calculate days remaining
    let daysRemaining = null;
    if (subscription?.end_date) {
      const today = new Date();
      const end   = new Date(subscription.end_date);
      daysRemaining = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
    }

    // Get attendance records for this player (last 6 months)
    const attRes = await pool
      .request()
      .input('pid', sql.UniqueIdentifier, player.id)
      .query(`
        SELECT
          CONVERT(NVARCHAR(10), a.date, 23) AS date,
          a.status
        FROM attendance a
        WHERE a.player_id = @pid
          AND a.date >= DATEADD(MONTH, -6, GETDATE())
        ORDER BY a.date ASC
      `);

    const attendanceRecords = attRes.recordset || [];

    const totalSessions = attendanceRecords.length;
    const presentCount  = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount   = attendanceRecords.filter(r => r.status === 'absent').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    return res.json({
      data: {
        player: {
          id:           player.id,
          name:         player.name,
          serial:       player.player_serial,
          age:          player.age,
          sport:        player.sport,
          branch:       player.branch,
          photo:        player.photo,
          status:       player.status,
        },
        subscription: subscription ? {
          id:          subscription.id,
          startDate:   subscription.start_date,
          endDate:     subscription.end_date,
          daysRemaining,
          sessions:    subscription.sessions,
          status:      subscription.status,
          sport:       subscription.sport,
          branch:      subscription.branch,
          schedule:    subscription.schedule,
        } : null,
        attendance: {
          records:      attendanceRecords,
          total:        totalSessions,
          present:      presentCount,
          absent:       absentCount,
          rate:         attendanceRate,
        },
      },
    });
  } catch (err) {
    console.error('Parent portal error:', err);
    return res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى.' });
  }
});

export default router;
