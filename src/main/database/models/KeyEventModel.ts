import Database from 'better-sqlite3';

export interface KeyEventRow {
  id: number;
  session_id: string;
  event_name: string;
  event_description: string | null;
  event_timestamp: string;
}

export class KeyEventModel {
  constructor(private db: Database.Database) {}

  /**
   * 创建关键事件
   * @param sessionId 会话 UUID
   * @param eventName 事件名称（简短）
   * @param eventDescription 事件描述（详细）
   * @returns 插入记录的自增 ID
   */
  create(sessionId: string, eventName: string, eventDescription: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO key_events (session_id, event_name, event_description, event_timestamp)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(sessionId, eventName, eventDescription);
    return result.lastInsertRowid as number;
  }

  /**
   * 获取某会话的所有关键事件（按时间升序）
   * @param sessionId 会话 UUID
   * @param limit 可选，最大返回数量
   */
  getBySession(sessionId: string, limit?: number): KeyEventRow[] {
    let sql = `SELECT * FROM key_events WHERE session_id = ? ORDER BY event_timestamp ASC`;
    if (limit) sql += ` LIMIT ${limit}`;
    const stmt = this.db.prepare(sql);
    return stmt.all(sessionId) as KeyEventRow[];
  }

  /**
   * 删除单个关键事件
   * @param eventId 事件 ID
   */
  delete(eventId: number): void {
    const stmt = this.db.prepare(`DELETE FROM key_events WHERE id = ?`);
    const result = stmt.run(eventId);
    if (result.changes === 0) {
      throw new Error(`Key event with id ${eventId} not found`);
    }
  }

  /**
   * 删除某会话的所有关键事件（外键级联时非必需，但提供手动方法）
   * @param sessionId 会话 UUID
   */
  deleteBySession(sessionId: string): void {
    const stmt = this.db.prepare(`DELETE FROM key_events WHERE session_id = ?`);
    stmt.run(sessionId);
  }
}