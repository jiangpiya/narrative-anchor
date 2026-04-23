import Database from 'better-sqlite3';
import { GameSessionRow } from '@shared/types/database';

export class GameSessionModel {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 创建新游戏会话
   * @param sessionUuid 全局唯一标识符
   * @param sessionName 会话名称
   * @returns 插入行的 id
   * @throws 如果 session_uuid 重复则抛出错误
   */
  createSession(sessionUuid: string, sessionName: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO game_sessions (session_uuid, session_name, created_at, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);
    try {
      const result = stmt.run(sessionUuid, sessionName);
      return result.lastInsertRowid as number;
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Session with UUID "${sessionUuid}" already exists.`);
      }
      throw err;
    }
  }

  /**
   * 根据 UUID 获取会话
   */
  getSessionByUuid(sessionUuid: string): GameSessionRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM game_sessions WHERE session_uuid = ?');
    return stmt.get(sessionUuid) as GameSessionRow | undefined;
  }

  /**
   * 根据数据库 ID 获取会话
   */
  getSessionById(id: number): GameSessionRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM game_sessions WHERE id = ?');
    return stmt.get(id) as GameSessionRow | undefined;
  }

  /**
   * 列出所有会话，按创建时间倒序
   * @param limit 最大返回数量，默认 50
   */
  listSessions(limit: number = 50): GameSessionRow[] {
    const stmt = this.db.prepare('SELECT * FROM game_sessions ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit) as GameSessionRow[];
  }

  /**
   * 更新会话名称
   */
  updateSessionName(sessionUuid: string, newName: string): void {
    const stmt = this.db.prepare(`
      UPDATE game_sessions SET session_name = ?, updated_at = datetime('now', 'localtime')
      WHERE session_uuid = ?
    `);
    const result = stmt.run(newName, sessionUuid);
    if (result.changes === 0) {
      throw new Error(`Session with UUID "${sessionUuid}" not found.`);
    }
  }

    /**
   * 删除会话（由于外键 ON DELETE CASCADE，关联数据自动删除）
   * @param sessionUuid 会话的 UUID
   * @throws 如果会话不存在则抛出错误
   */
  deleteSession(sessionUuid: string): void {
    const stmt = this.db.prepare('DELETE FROM game_sessions WHERE session_uuid = ?');
    const result = stmt.run(sessionUuid);
    if (result.changes === 0) {
      throw new Error(`Session with UUID "${sessionUuid}" not found.`);
    }
  }
}