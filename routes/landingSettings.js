import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DATA_FILE = path.join(__dirname, '../data/landing_settings.json');
const TMP_DATA_FILE = path.join(os.tmpdir(), 'landing_settings.json');

function getDataFilePath() {
  if (process.env.VERCEL) {
    return TMP_DATA_FILE;
  }
  return LOCAL_DATA_FILE;
}

function ensureDataFile() {
  const file = getDataFilePath();
  const dir = path.dirname(file);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(file)) {
      if (fs.existsSync(LOCAL_DATA_FILE)) {
        fs.copyFileSync(LOCAL_DATA_FILE, file);
      } else {
        fs.writeFileSync(file, JSON.stringify({}), 'utf8');
      }
    }
  } catch (err) {
    console.error('Error ensuring landing settings data file:', err);
  }
}

function readData() {
  ensureDataFile();
  const file = getDataFilePath();
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw || '{}');
    }
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      return JSON.parse(raw || '{}');
    }
  } catch (err) {
    console.error('Error reading landing settings:', err);
  }
  return {};
}

function writeData(data) {
  ensureDataFile();
  const file = getDataFilePath();
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing landing settings:', err);
  }
}

const router = express.Router();

router.get('/', (req, res) => {
  const settings = readData();
  res.json({ data: settings });
});

router.post('/', (req, res) => {
  const current = readData();
  const updated = { ...current, ...req.body };
  writeData(updated);
  res.json({ data: updated, message: 'Landing settings updated' });
});

export default router;

