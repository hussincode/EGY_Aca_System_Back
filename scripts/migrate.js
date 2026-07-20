import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
loadEnv();

const sql = process.env.DB_DRIVER === 'msnodesqlv8'
  ? require('mssql/msnodesqlv8.js')
  : require('mssql');

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function normalizeConnectionString(rawValue) {
  if (!rawValue) return null;
  return rawValue.trim();
}

function replaceConnectionStringDatabase(connectionString, database) {
  const hasDatabase = /(Database|Initial Catalog)\s*=\s*[^;]+/i.test(connectionString);
  if (hasDatabase) {
    return connectionString.replace(/(Database|Initial Catalog)\s*=\s*[^;]+/gi, `Database=${database}`);
  }
  return `${connectionString}${connectionString.endsWith(';') ? '' : ';'}Database=${database}`;
}

function buildDatabaseConfig(database) {
  const connectionString = normalizeConnectionString(process.env.DB_CONNECTION_STRING);
  if (connectionString) {
    const config = {
      connectionString: replaceConnectionStringDatabase(connectionString, database),
    };
    if (process.env.DB_DRIVER) {
      config.driver = process.env.DB_DRIVER;
    }
    return config;
  }

  const rawServer = process.env.DB_SERVER || 'localhost';
  const config = {
    server: rawServer,
    database,
    connectionTimeout: 5000,
    requestTimeout: 5000,
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
      encrypt: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  if (rawServer.includes('\\')) {
    const [server, instanceName] = rawServer.split('\\');
    config.server = server;
    config.options.instanceName = instanceName;
  }

  if (rawServer.includes(',') || rawServer.includes(':')) {
    const match = rawServer.match(/^(.*?)[,:](\d+)$/);
    if (match) {
      config.server = match[1];
      config.port = Number(match[2]);
    }
  }

  if (process.env.DB_PORT) {
    config.port = Number(process.env.DB_PORT);
  }

  const hasSqlAuth = process.env.DB_USER && process.env.DB_PASSWORD;
  if (hasSqlAuth) {
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
  }

  if (!hasSqlAuth && process.env.DB_TRUSTED === 'true') {
    config.options.trustedConnection = true;
  }

  return config;
}

const MIGRATION_PATH = path.resolve(process.cwd(), 'database', 'schema.sql');
const SEED_PATH = path.resolve(process.cwd(), 'database', 'seed.sql');

function loadSqlFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function ensureDatabaseExists(pool, database) {
  const checkDbResult = await pool
    .request()
    .input('name', sql.NVarChar, database)
    .query('SELECT name FROM sys.databases WHERE name = @name');

  if (!checkDbResult.recordset?.length) {
    throw new Error(`Database does not exist: ${database}`);
  }
}

async function runMigration() {
  const querySql = loadSqlFile(MIGRATION_PATH);
  const seedSql = fs.existsSync(SEED_PATH) ? loadSqlFile(SEED_PATH) : null;
  const databaseName = process.env.DB_NAME || 'EgySystem';
  const dbConfig = buildDatabaseConfig(databaseName);
  const adminConfig = buildDatabaseConfig('master');

  console.log(`Using database: ${databaseName}`);
  console.log('Connecting to SQL Server...');

  const adminPool = await withTimeout(sql.connect(adminConfig), 8000, 'Database connection timed out after 8 seconds');
  try {
    console.log('Checking database existence...');
    await ensureDatabaseExists(adminPool, databaseName);
  } finally {
    await adminPool.close();
  }

  console.log('Database exists. Running schema migration...');
  const pool = await withTimeout(sql.connect(dbConfig), 8000, 'Database connection timed out after 8 seconds');
  try {
    const batches = querySql
      .split(/\nGO\s*\n/gi)
      .map((batch) => batch.trim())
      .filter(Boolean);

    for (const [index, batch] of batches.entries()) {
      console.log(`Executing schema batch ${index + 1}/${batches.length}...`);
      await pool.request().batch(batch);
    }

    if (seedSql) {
      console.log('Running seed data...');
      const seedBatches = seedSql
        .split(/\nGO\s*\n/gi)
        .map((batch) => batch.trim())
        .filter(Boolean);
      for (const [index, batch] of seedBatches.entries()) {
        console.log(`Executing seed batch ${index + 1}/${seedBatches.length}...`);
        await pool.request().batch(batch);
      }
    }

    console.log('Migration complete.');
  } finally {
    await pool.close();
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error.message || error);
  process.exit(1);
});
