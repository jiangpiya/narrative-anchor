import Database from 'better-sqlite3';

export interface SettingsDocRow {
  id: number;
  filename: string;
  file_path: string;
  is_core: number;
  enabled: number;
  is_cleaned: number;
  created_at: string;
  updated_at: string;
}

export class SettingsDocModel {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTable();
  }

  private ensureTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS setting_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        is_core INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        is_cleaned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_setting_documents_enabled ON setting_documents(enabled);
      CREATE INDEX IF NOT EXISTS idx_setting_documents_is_core ON setting_documents(is_core);
    `);
  }

  /**
   * 创建文档记录
   * @param filename 实际保存的文件名
   * @param filePath 文件绝对路径
   * @param isCore 是否为核心设定
   * @returns 插入记录的自增 ID
   */
  create(filename: string, filePath: string, isCore: boolean, isCleaned: boolean = false): number {
    const stmt = this.db.prepare(
      'INSERT INTO setting_documents (filename, file_path, is_core, enabled, is_cleaned) VALUES (?, ?, ?, 1, ?)'
    );
    const info = stmt.run(filename, filePath, isCore ? 1 : 0, isCleaned ? 1 : 0);
    return info.lastInsertRowid as number;
  }

  /**
   * 获取所有文档记录（按 ID 升序）
   */
  getAll(): SettingsDocRow[] {
    const stmt = this.db.prepare('SELECT * FROM setting_documents ORDER BY id ASC');
    return stmt.all() as SettingsDocRow[];
  }

  /**
   * 根据 ID 获取单个文档
   */
  getById(id: number): SettingsDocRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM setting_documents WHERE id = ?');
    return stmt.get(id) as SettingsDocRow | undefined;
  }

  /**
   * 更新文档启用状态
   */
  updateEnabled(id: number, enabled: boolean): void {
    const stmt = this.db.prepare('UPDATE setting_documents SET enabled = ? WHERE id = ?');
    const result = stmt.run(enabled ? 1 : 0, id);
    if (result.changes === 0) {
      throw new Error(`Document with id ${id} not found`);
    }
  }

  /**
   * 更新文档清洗状态（标记是否已注入系统提示）
   */
  updateCleaned(id: number, isCleaned: boolean): void {
    const stmt = this.db.prepare('UPDATE setting_documents SET is_cleaned = ? WHERE id = ?');
    const result = stmt.run(isCleaned ? 1 : 0, id);
    if (result.changes === 0) {
      throw new Error(`Document with id ${id} not found`);
    }
  }
  /**
   * 根据 ID 删除文档记录（不删除物理文件，由调用方负责）
   */
  delete(id: number): void {
    const stmt = this.db.prepare('DELETE FROM setting_documents WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      throw new Error(`Document with id ${id} not found`);
    }
  }
  /**
 * 更新文档的核心标记
 */
updateCore(id: number, isCore: boolean): void {
  const stmt = this.db.prepare('UPDATE setting_documents SET is_core = ? WHERE id = ?');
  const result = stmt.run(isCore ? 1 : 0, id);
  if (result.changes === 0) {
    throw new Error(`Document with id ${id} not found`);
  }
}
}