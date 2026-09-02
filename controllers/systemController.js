import { getPool, sql } from '../config/db.js';

export async function resetDatabaseExceptUsers(req, res) {
  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Disable all foreign key constraints across tables
      try {
        await request.query(`EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";`);
      } catch (e) {
        console.warn('Could not run sp_MSforeachtable for nocheck constraint:', e.message);
      }

      // 2. Set branch_id to NULL on users so branches can be deleted cleanly without FK violation
      await request.query(`
        IF OBJECT_ID('users', 'U') IS NOT NULL
        BEGIN
          UPDATE users SET branch_id = NULL;
        END
      `);

      // 3. Delete from known tables in dependency-friendly order
      await request.query(`
        IF OBJECT_ID('attendance', 'U') IS NOT NULL DELETE FROM attendance;
        IF OBJECT_ID('subscriptions', 'U') IS NOT NULL DELETE FROM subscriptions;
        IF OBJECT_ID('finance', 'U') IS NOT NULL DELETE FROM finance;
        IF OBJECT_ID('leads', 'U') IS NOT NULL DELETE FROM leads;
        IF OBJECT_ID('players', 'U') IS NOT NULL DELETE FROM players;
        IF OBJECT_ID('staff', 'U') IS NOT NULL DELETE FROM staff;
        IF OBJECT_ID('ambassadors', 'U') IS NOT NULL DELETE FROM ambassadors;
        IF OBJECT_ID('games', 'U') IS NOT NULL DELETE FROM games;
        IF OBJECT_ID('branches', 'U') IS NOT NULL DELETE FROM branches;
      `);

      // 4. Also dynamically delete any other user tables except 'users', '__EFMigrationsHistory', 'sysdiagrams'
      await request.query(`
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += N'DELETE FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N'; '
        FROM sys.tables t
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE t.name NOT IN ('users', 'sysdiagrams', '__EFMigrationsHistory');

        IF LEN(@sql) > 0
          EXEC sp_executesql @sql;
      `);

      // 5. Re-enable all foreign key constraints
      try {
        await request.query(`EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL";`);
      } catch (e) {
        console.warn('Could not run sp_MSforeachtable for check constraint:', e.message);
      }

      await transaction.commit();

      return res.json({
        success: true,
        message: 'تم مسح جميع بيانات قاعدة البيانات بنجاح مع الاحتفاظ بحسابات المستخدمين.',
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('Error resetting database except users:', err);
    return res.status(500).json({
      success: false,
      message: 'فشل مسح بيانات قاعدة البيانات: ' + (err.message || 'خطأ في الخادم'),
    });
  }
}
