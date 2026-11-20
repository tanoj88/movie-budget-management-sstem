import mysql from 'mysql2/promise';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
}

type DbMode = 'mysql' | 'embedded';

let pool: mysql.Pool | null = null;
let sqliteDb: SqlJsDatabase | null = null;
let dbMode: DbMode = 'mysql';
let initialized = false;

export function getDbMode(): DbMode {
  return dbMode;
}

function createMysqlPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movie_management_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true,
  });
}

function adaptSchemaForSqlite(sql: string): string {
  return sql
    .replace(/^\s*CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+[^;]+;\s*$/gim, '')
    .replace(/^\s*USE\s+[^;]+;\s*$/gim, '')
    .replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/DECIMAL\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL');
}

function adaptSeedForSqlite(sql: string): string {
  return sql.replace(/^\s*USE\s+[^;]+;\s*$/gim, '');
}

async function initEmbeddedFallback(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
  });
  sqliteDb = new SQL.Database();
  sqliteDb.run('PRAGMA foreign_keys = ON;');

  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  const seedPath = path.resolve(process.cwd(), 'seed.sql');

  const schemaSql = adaptSchemaForSqlite(fs.readFileSync(schemaPath, 'utf-8'));
  sqliteDb.exec(schemaSql);

  if (fs.existsSync(seedPath)) {
    const seedSql = adaptSeedForSqlite(fs.readFileSync(seedPath, 'utf-8'));
    sqliteDb.exec(seedSql);
  }
}

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  try {
    pool = createMysqlPool();
    await pool.query('SELECT 1');
    dbMode = 'mysql';
    initialized = true;
    console.log(`[DB] Connected to MySQL (${process.env.DB_NAME || 'movie_management_database'})`);
  } catch (err) {
    console.warn(
      `[DB] MySQL unavailable (${(err as Error).message}). Initializing embedded SQL fallback from schema.sql + seed.sql.`
    );
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    await initEmbeddedFallback();
    dbMode = 'embedded';
    initialized = true;
  }
}

function executeSqlite<T = any>(sql: string, params: any[] = []): [T, any] {
  if (!sqliteDb) {
    throw new Error('Embedded database is not initialized');
  }

  const trimmed = sql.trim();
  const isSelect = /^(SELECT|PRAGMA|WITH)\b/i.test(trimmed);

  const normalizedParams = params.map((p) => (p === undefined ? null : p));

  if (isSelect) {
    const stmt = sqliteDb.prepare(trimmed);
    if (normalizedParams.length > 0) {
      stmt.bind(normalizedParams);
    }
    const rows: Record<string, any>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return [rows as unknown as T, []];
  } else {
    sqliteDb.run(trimmed, normalizedParams);
    const affectedRows = sqliteDb.getRowsModified();
    const lastIdRes = sqliteDb.exec('SELECT last_insert_rowid() AS id');
    const insertId =
      lastIdRes.length > 0 && lastIdRes[0].values.length > 0
        ? Number(lastIdRes[0].values[0][0])
        : 0;
    const header: ResultSetHeader = { insertId, affectedRows };
    return [header as unknown as T, []];
  }
}

export const db = {
  async execute<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    if (!initialized) {
      await initDatabase();
    }
    if (dbMode === 'mysql' && pool) {
      const [rows, fields] = await pool.execute(sql, params);
      return [rows as T, fields];
    }
    return executeSqlite<T>(sql, params);
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    if (!initialized) {
      await initDatabase();
    }
    if (dbMode === 'mysql' && pool) {
      const [rows, fields] = await pool.query(sql, params);
      return [rows as T, fields];
    }
    return executeSqlite<T>(sql, params);
  },
};
