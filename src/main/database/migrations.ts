import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';


/**
 * 执行所有未运行的 SQL 迁移文件
 * @param db 数据库实例
 */
export async function runMigrations(db: Database.Database): Promise<void> {
  // 1. 创建迁移记录表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 2. 查询已应用的迁移
  const appliedMigrations = new Set<string>();
  const rows = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
  for (const row of rows) {
    appliedMigrations.add(row.name);
  }

  // 3. 读取 migrations 目录下的所有 .sql 文件
  console.log('[Migrations] Current __dirname:', __dirname);
  const migrationsDir = path.join(__dirname, 'database', 'migrations');
  console.log('[Migrations] Looking for migrations at:', migrationsDir);
  // 注意：在打包后 __dirname 指向 dist/main/database，而 SQL 文件会被复制到该目录下
  // 开发环境下需要确保目录存在
  if (!fs.existsSync(migrationsDir)) {
    console.warn('[Migrations] No migrations directory found. Skipping.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // 按文件名升序（如 001_init.sql, 002_add_index.sql）

  // 4. 逐个执行未应用的迁移
  for (const file of files) {
    if (appliedMigrations.has(file)) {
      console.log(`[Migrations] Skipping already applied: ${file}`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[Migrations] Applying: ${file}`);
    try {
      // 执行 SQL 脚本（注意：better-sqlite3 的 exec 不支持多条语句用分号分隔？实际上 exec 支持多条，但需确保没有导致问题的空语句）
      // 更安全的方式是分割语句，但鉴于迁移脚本是可控的，直接 exec 即可
      db.exec(sql);
      // 记录已应用
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
      console.log(`[Migrations] Successfully applied: ${file}`);
    } catch (err) {
      console.error(`[Migrations] Failed to apply ${file}:`, err);
      throw err; // 阻止应用启动
    }
  }
}