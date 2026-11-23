import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.resolve(process.cwd(), 'lablink.db');

class DBWrapper {
  private db: DatabaseSync;

  constructor(filePath: string) {
    if (filePath !== ':memory:') {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(filePath);
    // Enable foreign keys and WAL mode for high performance and integrity
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (filePath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }
  }

  exec(sql: string) {
    return this.db.exec(sql);
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params: any[]) => stmt.run(...params),
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
    };
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;');
      } catch (rollbackErr) {
        // ignore rollback error if already aborted
      }
      throw err;
    }
  }

  close() {
    this.db.close();
  }
}

export const db = new DBWrapper(DB_PATH);
export { DBWrapper };
