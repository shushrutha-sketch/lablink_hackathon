import fs from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';

export function runMigrations() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  console.log('Running database migrations...');
  runMigrations();
  console.log('Migrations complete.');
}
