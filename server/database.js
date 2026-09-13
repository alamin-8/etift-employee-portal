const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const databaseConfig = {
  type: (process.env.DATABASE_TYPE || 'sqlite').toLowerCase(),
  url: process.env.DATABASE_URL || '',
  path: process.env.DATABASE_PATH || path.resolve(__dirname, '../etift.db')
};

const isPostgresReady = databaseConfig.type === 'postgres' && Boolean(databaseConfig.url);
const isSqliteReady = databaseConfig.type === 'sqlite' || !databaseConfig.url;

const replaceQuestionMarks = (sql, params = []) => {
  let index = 0;
  const rewritten = sql.replace(/\?/g, () => `$${++index}`);
  return { sql: rewritten, params };
};

const normalizePgSql = (sql, params = []) => {
  let query = replaceQuestionMarks(sql, params).sql;

  if (/^INSERT\s+OR\s+IGNORE\s+INTO/i.test(query)) {
    const match = query.match(/^INSERT\s+INTO\s+([A-Za-z0-9_."]+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/is);
    if (match) {
      const table = match[1].replace(/"/g, '');
      const columns = match[2].trim();
      const values = match[3].trim();
      query = `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING`;
    }
  }

  if (/^INSERT\s+OR\s+REPLACE\s+INTO/i.test(query)) {
    const match = query.match(/^INSERT\s+INTO\s+([A-Za-z0-9_."]+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/is);
    if (match) {
      const table = match[1].replace(/"/g, '');
      const columns = match[2].trim();
      const values = match[3].trim();
      if (table === 'attendance') {
        query = `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT (employee_id, date) DO UPDATE SET check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out, status = EXCLUDED.status`;
      } else {
        const setClause = columns.split(',').map((column) => `${column.trim()} = EXCLUDED.${column.trim()}`).join(', ');
        query = `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO UPDATE SET ${setClause}`;
      }
    }
  }

  if (/^INSERT\s+INTO/i.test(query) && !/RETURNING\b/i.test(query)) {
    query += ' RETURNING id';
  }

  return { sql: query, params };
};

const createSqliteDb = (sqlitePath) => new sqlite3.Database(sqlitePath);

const createPostgresDb = () => {
  const pool = new Pool({
    connectionString: databaseConfig.url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const query = (sql, params = [], callback) => {
    const normalized = normalizePgSql(sql, params);
    pool.query(normalized.sql, normalized.params, (err, result) => {
      if (typeof callback !== 'function') return;
      const rows = result && Array.isArray(result.rows) ? result.rows : [];
      const target = { lastID: null };
      if (!err && rows.length && rows[0].id !== undefined) {
        target.lastID = rows[0].id;
      }
      callback.call(target, err, rows);
    });
  };

  return {
    serialize(callback) {
      return callback();
    },
    get(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      query(sql, params, (err, rows) => {
        if (typeof callback === 'function') {
          callback(err, rows && rows.length ? rows[0] : null);
        }
      });
    },
    all(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      query(sql, params, (err, rows) => {
        if (typeof callback === 'function') {
          callback(err, rows || []);
        }
      });
    },
    run(sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      query(sql, params, (err, rows) => {
        if (typeof callback === 'function') {
          const target = { lastID: null };
          if (!err && rows.length && rows[0].id !== undefined) {
            target.lastID = rows[0].id;
          }
          callback.call(target, err);
        }
      });
    },
    close() {
      return pool.end();
    }
  };
};

const createDatabase = () => {
  if (isPostgresReady) {
    console.log('Using PostgreSQL database connection.');
    return createPostgresDb();
  }
  return createSqliteDb(databaseConfig.path);
};

module.exports = {
  databaseConfig,
  isPostgresReady,
  isSqliteReady,
  dbPath: databaseConfig.path,
  createDatabase
};
