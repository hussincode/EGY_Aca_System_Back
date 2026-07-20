import { createRequire } from 'module';
import dotenv from 'dotenv';
const require = createRequire(import.meta.url);

dotenv.config();

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

function parseConnectionString(connectionString) {
  if (!connectionString) return null;

  const values = {};
  connectionString.split(';').forEach((entry) => {
    const value = entry.trim();
    if (!value) return;

    const separatorIndex = value.indexOf('=');
    if (separatorIndex === -1) return;

    const key = value.slice(0, separatorIndex).trim().toLowerCase();
    const parsedValue = value.slice(separatorIndex + 1).trim();
    values[key] = parsedValue;
  });

  const serverValue = values.server || values['data source'] || values.address || values.addr || values['network address'];
  const database = values.database || values['initial catalog'] || values.catalog;
  const user = values['user id'] || values.userid || values.user;
  const password = values.password || values.pwd;
  const encrypt = values.encrypt;
  const trustServerCertificate = values.trustservercertificate;
  const multipleActiveResultSets = values.multipleresultsets;

  if (!serverValue) {
    return null;
  }

  const serverParts = serverValue.split(',');
  const rawServer = serverParts[0].trim();
  const server = rawServer.replace(/^tcp:/i, '').replace(/^udp:/i, '').trim();
  const parsedPort = serverParts[1] ? Number(serverParts[1].trim()) : undefined;

  const options = {
    trustServerCertificate: trustServerCertificate ? trustServerCertificate.toLowerCase() === 'true' || trustServerCertificate.toLowerCase() === 'yes' : true,
    enableArithAbort: true,
    encrypt: encrypt ? encrypt.toLowerCase() === 'true' || encrypt.toLowerCase() === 'yes' || encrypt.toLowerCase() === 'mandatory' : false,
  };

  if (multipleActiveResultSets && (multipleActiveResultSets.toLowerCase() === 'true' || multipleActiveResultSets.toLowerCase() === 'yes')) {
    options.multipleActiveResultSets = true;
  }

  return {
    server,
    ...(parsedPort ? { port: parsedPort } : {}),
    database: database || process.env.DB_NAME || 'EgySystem',
    options,
    ...(user ? { user } : {}),
    ...(password ? { password } : {}),
  };
}

function buildDatabaseConfig(database) {
  const connectionString = normalizeConnectionString(process.env.DB_CONNECTION_STRING);
  if (connectionString) {
    const parsedConnection = parseConnectionString(connectionString);
    if (parsedConnection) {
      const config = {
        ...parsedConnection,
        database: parsedConnection.database || database,
        connectionTimeout: 5000,
        requestTimeout: 5000,
      };
      if (process.env.DB_DRIVER) {
        config.driver = process.env.DB_DRIVER;
      }
      return config;
    }

    const config = {
      connectionString: connectionString,
      connectionTimeout: 5000,
      requestTimeout: 5000,
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
    pool = await withTimeout(sql.connect(config), 8000, 'Database connection timed out after 8 seconds');
    console.log('✅ Connected to SQL Server');
  }
  return pool;
}

export { sql };

