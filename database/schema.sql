-- EGY Sporting Club Management System
-- SQL Server (T-SQL)

-- 1. branches
IF OBJECT_ID('branches','U') IS NULL
BEGIN
CREATE TABLE branches (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  address     NVARCHAR(500),
  contact     NVARCHAR(50),
  active      BIT DEFAULT 1,
  created_at  DATETIME2 DEFAULT GETDATE()
);
END

-- 2. games
IF OBJECT_ID('games','U') IS NULL
BEGIN
CREATE TABLE games (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  description NVARCHAR(500),
  active      BIT DEFAULT 1,
  created_at  DATETIME2 DEFAULT GETDATE()
);
END

-- 3. ambassadors
IF OBJECT_ID('ambassadors','U') IS NULL
BEGIN
CREATE TABLE ambassadors (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  phone       NVARCHAR(50),
  ref_code    NVARCHAR(50) UNIQUE NOT NULL,
  status      NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  DATETIME2 DEFAULT GETDATE()
);
END

-- 4. users (depends on branches)
IF OBJECT_ID('users','U') IS NULL
BEGIN
CREATE TABLE users (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  email       NVARCHAR(255) UNIQUE NOT NULL,
  password    NVARCHAR(255) NOT NULL,
  role        NVARCHAR(50) NOT NULL CHECK (role IN ('admin','manager','coach','accountant')),
  branch_id   UNIQUEIDENTIFIER REFERENCES branches(id),
  created_at  DATETIME2 DEFAULT GETDATE()
);
END

-- 5. players (depends on branches, games, ambassadors)
IF OBJECT_ID('players','U') IS NULL
BEGIN
CREATE TABLE players (
  id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  player_serial   NVARCHAR(100) UNIQUE,
  name            NVARCHAR(255) NOT NULL,
  age             INT,
  phone           NVARCHAR(50),
  game_id         UNIQUEIDENTIFIER REFERENCES games(id),
  branch_id       UNIQUEIDENTIFIER REFERENCES branches(id),
  status          NVARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid','due')),
  photo           NVARCHAR(MAX),
  schedule        NVARCHAR(500),
  member_type     NVARCHAR(20) DEFAULT 'none' CHECK (member_type IN ('none','annual','federation')),
  member_id       NVARCHAR(100),
  member_expiry   DATE,
  member_value    DECIMAL(10,2),
  amb_ref_code    NVARCHAR(50) REFERENCES ambassadors(ref_code),
  joined          BIT DEFAULT 0,
  join_date       DATE,
  created_at      DATETIME2 DEFAULT GETDATE()
);
END

-- 6. subscriptions (depends on players, games, branches)
IF OBJECT_ID('subscriptions','U') IS NULL
BEGIN
CREATE TABLE subscriptions (
  id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  player_id           UNIQUEIDENTIFIER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id             UNIQUEIDENTIFIER REFERENCES games(id),
  branch_id           UNIQUEIDENTIFIER REFERENCES branches(id),
  schedule            NVARCHAR(500),
  training_time       NVARCHAR(100),
  sessions            INT DEFAULT 0,
  subscription_value  DECIMAL(10,2) NOT NULL,
  paid_amount         DECIMAL(10,2) DEFAULT 0,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  invoice_number      NVARCHAR(100),
  created_at          DATETIME2 DEFAULT GETDATE()
);
END

-- 7. attendance (depends on players, subscriptions)
IF OBJECT_ID('attendance','U') IS NULL
BEGIN
CREATE TABLE attendance (
  id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  player_id       UNIQUEIDENTIFIER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  subscription_id UNIQUEIDENTIFIER REFERENCES subscriptions(id),
  date            DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
  status          NVARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','absent')),
  created_at      DATETIME2 DEFAULT GETDATE()
);
END

-- 8. staff (depends on branches)
IF OBJECT_ID('staff','U') IS NULL
BEGIN
CREATE TABLE staff (
  id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  staff_serial  NVARCHAR(100) UNIQUE,
  name          NVARCHAR(255) NOT NULL,
  phone         NVARCHAR(50),
  role          NVARCHAR(100) NOT NULL,
  pay_type      NVARCHAR(20) CHECK (pay_type IN ('hour','fixed','percent')),
  rate          DECIMAL(10,2) DEFAULT 0,
  hours         DECIMAL(10,2) DEFAULT 0,
  revenue       DECIMAL(10,2) DEFAULT 0,
  branch_id     UNIQUEIDENTIFIER REFERENCES branches(id),
  created_at    DATETIME2 DEFAULT GETDATE()
);
END

-- 9. finance (depends on branches, users)
IF OBJECT_ID('finance','U') IS NULL
BEGIN
CREATE TABLE finance (
  id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  type          NVARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
  category      NVARCHAR(255) NOT NULL,
  branch_id     UNIQUEIDENTIFIER REFERENCES branches(id),
  related_to    NVARCHAR(500),
  amount        DECIMAL(12,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
  description   NVARCHAR(MAX),
  source        NVARCHAR(100),
  source_id     UNIQUEIDENTIFIER,
  created_by_id UNIQUEIDENTIFIER REFERENCES users(id),
  created_at    DATETIME2 DEFAULT GETDATE()
);
END

-- 10. leads (depends on branches)
IF OBJECT_ID('leads','U') IS NULL
BEGIN
CREATE TABLE leads (
  id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name        NVARCHAR(255) NOT NULL,
  phone       NVARCHAR(50),
  interest    NVARCHAR(500),
  status      NVARCHAR(50) DEFAULT 'new',
  branch_id   UNIQUEIDENTIFIER REFERENCES branches(id),
  notes       NVARCHAR(MAX),
  created_at  DATETIME2 DEFAULT GETDATE()
);
END

-- Indexes for performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_players_branch' AND object_id = OBJECT_ID('players'))
BEGIN
  CREATE INDEX IX_players_branch ON players(branch_id);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_players_game' AND object_id = OBJECT_ID('players'))
BEGIN
  CREATE INDEX IX_players_game ON players(game_id);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_players_amb' AND object_id = OBJECT_ID('players'))
BEGIN
  CREATE INDEX IX_players_amb ON players(amb_ref_code);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_subscriptions_player' AND object_id = OBJECT_ID('subscriptions'))
BEGIN
  CREATE INDEX IX_subscriptions_player ON subscriptions(player_id);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_subscriptions_status' AND object_id = OBJECT_ID('subscriptions'))
BEGIN
  CREATE INDEX IX_subscriptions_status ON subscriptions(status);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_subscriptions_end_date' AND object_id = OBJECT_ID('subscriptions'))
BEGIN
  CREATE INDEX IX_subscriptions_end_date ON subscriptions(end_date);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_attendance_player' AND object_id = OBJECT_ID('attendance'))
BEGIN
  CREATE INDEX IX_attendance_player ON attendance(player_id);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_attendance_date' AND object_id = OBJECT_ID('attendance'))
BEGIN
  CREATE INDEX IX_attendance_date ON attendance(date);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_finance_type' AND object_id = OBJECT_ID('finance'))
BEGIN
  CREATE INDEX IX_finance_type ON finance(type);
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_finance_date' AND object_id = OBJECT_ID('finance'))
BEGIN
  CREATE INDEX IX_finance_date ON finance(date);
END
