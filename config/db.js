import { createRequire } from 'module';
import dotenv from 'dotenv';
const require = createRequire(import.meta.url);

dotenv.config();

const sql = process.env.DB_DRIVER === 'msnodesqlv8'
  ? require('mssql/msnodesqlv8.js')
  : require('mssql');

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

  if (process.env.DB_DRIVER) {
    config.driver = process.env.DB_DRIVER;
  }

  if (!hasSqlAuth && process.env.DB_TRUSTED === 'true') {
    config.options.trustedConnection = true;
  }

  return config;
}

const config = buildDatabaseConfig(process.env.DB_NAME || 'EgySystem');
let pool;

export function getDatabaseConfig() {
  return typeof config === 'string' ? { connectionString: config } : { ...config };
}

export async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server');
  }
  return pool;
}

export { sql };

