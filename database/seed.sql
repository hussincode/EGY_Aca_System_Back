-- EGY Sporting Club Management System
-- Seed data (minimal, safe for testing)

-- Note: Insert order respects FK dependencies.

-- Branches
INSERT INTO branches (id, name, address, contact, active)
VALUES
  (NEWID(), N'القاهرة - الرئيسي', N'شارع النيل', N'01000000001', 1),
  (NEWID(), N'الجيزة - فرع 2', N'شارع الهرم', N'01000000002', 1);

-- Admin user (password: AdminPass001)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'Admin@gmail.com')
BEGIN
  INSERT INTO users (id, name, email, password, role, branch_id)
  VALUES (NEWID(), N'Admin', N'Admin@gmail.com', N'$2b$12$X.dUR87r0ua2qMBafCgimO3zwMvrpYJqVc/d4vgo1crE1i8TwPsna', N'admin', NULL);
END

-- Games
INSERT INTO games (id, name, description, active)
VALUES
  (NEWID(), N'كرة قدم', N'تدريبات كرة القدم', 1);
