import Database from 'better-sqlite3';

export interface SummaryRow {
  id: number;
  session_id: string;
  start_dialogue_id: number | null;
  end_dialogue_id: number | null;
  summary_text: string;
  created_at: string;
}

export class SummaryModel {
  constructor(private db: Database.Database) {}

  /**
   * 创建摘要（使用 dialogue_id 范围）
   * @param sessionId 会话 UUID
   * @param startDialogueId 起始对话 ID（可选）
   * @param endDialogueId 结束对话 ID（可选）
   * @param summaryText 摘要内容
   * @returns 插入记录的自增 ID
   */
  create(sessionId: string, startDialogueId: number | null, endDialogueId: number | null, summaryText: string): number {
    // 可选：检查是否已存在相同范围的摘要（幂等性）
    const existing = this.db
      .prepare(`SELECT id FROM summaries WHERE session_id = ? AND start_dialogue_id = ? AND end_dialogue_id = ?`)
      .get(sessionId, startDialogueId, endDialogueId);
    if (existing) return existing.id;

    const stmt = this.db.prepare(`
      INSERT INTO summaries (session_id, start_dialogue_id, end_dialogue_id, summary_text, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(sessionId, startDialogueId, endDialogueId, summaryText);
    return result.lastInsertRowid as number;
  }

  /**
   * 获取某会话最近的 N 条摘要（按 end_dialogue_id 降序）
   * @param sessionId 会话 UUID
   * @param limit 数量，默认 2
   */
  getLatestBySession(sessionId: string, limit: number = 2): SummaryRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM summaries
      WHERE session_id = ?
      ORDER BY end_dialogue_id DESC, id DESC
      LIMIT ?
    `);
    return stmt.all(sessionId, limit) as SummaryRow[];
  }

  /**
   * 根据对话 ID 范围查询摘要
   * @param sessionId 会话 UUID
   * @param startDialogueId 起始对话 ID（包含）
   * @param endDialogueId 结束对话 ID（包含）
   */
  getByDialogueRange(sessionId: string, startDialogueId: number, endDialogueId: number): SummaryRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM summaries
      WHERE session_id = ?
        AND (start_dialogue_id >= ? OR start_dialogue_id IS NULL)
        AND (end_dialogue_id <= ? OR end_dialogue_id IS NULL)
      ORDER BY end_dialogue_id ASC
    `);
    return stmt.all(sessionId, startDialogueId, endDialogueId) as SummaryRow[];
  }

  /**
   * 删除某会话的所有摘要（外键级联时非必需）
   * @param sessionId 会话 UUID
   */
  deleteBySession(sessionId: string): void {
    const stmt = this.db.prepare(`DELETE FROM summaries WHERE session_id = ?`);
    stmt.run(sessionId);
  }
}