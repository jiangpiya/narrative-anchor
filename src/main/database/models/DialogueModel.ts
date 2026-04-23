import Database from 'better-sqlite3';
import { DialogueRow } from '@shared/types/database';

export class DialogueModel {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 添加一条对话记录
   * @param sessionId 会话 ID
   * @param speaker 发言者（'player' 或 NPC 名称）
   * @param message 消息内容
   */
  addDialogue(sessionUuid: string, npc_id: string | null, speaker: string, message: string, turn: number): number {
    const stmt = this.db.prepare(`
      INSERT INTO dialogues (session_id, npc_id, speaker, message, turn, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(sessionUuid, npc_id, speaker, message, turn);
    return result.lastInsertRowid as number;
  }

  /**
   * 获取最近 N 条对话（按时间倒序，返回后自动正序）
   */
  getRecentDialogues(sessionUuid: string, limit: number = 20): DialogueRow[] {
    const stmt = this.db.prepare(`
    SELECT * FROM dialogues WHERE session_id = ?
    ORDER BY timestamp ASC LIMIT ?
    `);
    return stmt.all(sessionUuid, limit) as DialogueRow[];// 转为时间正序
  }

  /**
   * 获取指定时间范围内的对话（按时间正序）
   */
  getDialoguesByTimeRange(sessionUuid: string, startTime: string, endTime: string): DialogueRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM dialogues WHERE session_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(sessionUuid, startTime, endTime) as DialogueRow[];
  }

  /**
   * 删除会话的所有对话
   */
  deleteDialoguesBySession(sessionUuid: string): void {
    const stmt = this.db.prepare('DELETE FROM dialogues WHERE session_id = ?');
    stmt.run(sessionUuid);
  }
}