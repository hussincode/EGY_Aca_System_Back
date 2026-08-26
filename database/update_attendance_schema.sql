-- Script to update existing 'attendance' table in SQL Server to support 'late' status

DECLARE @ConstraintName NVARCHAR(200);

-- Find existing status CHECK constraint name on attendance table
SELECT TOP 1 @ConstraintName = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
WHERE cc.parent_object_id = OBJECT_ID('attendance') AND c.name = 'status';

-- Drop the old constraint if found
IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE attendance DROP CONSTRAINT ' + @ConstraintName);
    PRINT 'Dropped old constraint: ' + @ConstraintName;
END;

-- Add updated constraint accepting ('present', 'absent', 'late')
ALTER TABLE attendance 
ADD CONSTRAINT CK_attendance_status CHECK (status IN ('present', 'absent', 'late'));

PRINT '✅ Successfully updated attendance table constraint to allow late status.';
