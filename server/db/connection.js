import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'trustshift.sqlite');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  ensureColumn('employees', 'reliability_score', 'INTEGER NOT NULL DEFAULT 80');
  ensureColumn('employees', 'hourly_rate', 'REAL NOT NULL DEFAULT 18');
  ensureColumn('employees', 'certifications', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn('employees', 'external_employee_id', 'TEXT');
  ensureColumn('employees', 'home_department', 'TEXT');
  ensureColumn('shifts', 'external_shift_id', 'TEXT');
  ensureColumn('shifts', 'required_certification', 'TEXT');
  ensureColumn('shifts', 'labor_budget', 'REAL');
}

export function resetDatabase() {
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}
