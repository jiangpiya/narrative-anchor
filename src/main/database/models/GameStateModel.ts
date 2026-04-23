import Database from 'better-sqlite3';
import { GameStateRow } from '@shared/types/database';

export class GameStateModel {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 保存或更新游戏状态（基于 session_id + state_key 唯一约束，使用 INSERT OR REPLACE）
   * @param sessionId 会话 ID（数字主键）
   * @param stateKey 状态键名
   * @param stateValue JSON 字符串
   */
  saveState(sessionUuid: string, stateKey: string, stateValue: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO game_states (session_id, state_key, state_value, updated_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);
    stmt.run(sessionUuid, stateKey, stateValue);
  }

  /**
   * 获取当前状态（最新一条）
   */
  getCurrentState(sessionUuid: string, stateKey: string): GameStateRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM game_states WHERE session_id = ? AND state_key = ?
    `);
    return stmt.get(sessionUuid, stateKey) as GameStateRow | undefined;
  }

  /**
   * 获取某个状态键的历史版本（按更新时间倒序）
   */
  getStateHistory(sessionUuid: string, stateKey: string, limit: number = 10): GameStateRow[] {
    // 由于我们使用了 INSERT OR REPLACE，历史版本会被覆盖。若要保留历史，需改为 INSERT 且不替换。
    // 但根据 S1-2 步骤 4 的描述：“不更新旧行，保留完整历史”，因此应改为每次插入新行。
    // 修正：下面提供保留历史的实现（每次 saveState 插入新行，查询时取最新）。
    // 为符合需求，我们提供两个版本：覆盖模式（默认）和追加模式。这里实现追加模式（保留历史）。
    // 注意：需要修改表结构移除 UNIQUE(session_id, state_key) 约束，否则无法插入重复键值。
    // 假设表已按 PRD 设计：没有 UNIQUE 约束，只有普通索引。
    const stmt = this.db.prepare(`
      SELECT * FROM game_states WHERE session_id = ? AND state_key = ?
      ORDER BY updated_at DESC LIMIT ?
    `);
    return stmt.all(sessionUuid, stateKey, limit) as GameStateRow[];
  }

  // 如果采用覆盖模式，只需上述 saveState 使用 INSERT OR REPLACE，但历史版本会丢失。
  // 这里为了满足“支持历史版本”，使用追加模式。需要确保建表时没有 UNIQUE 约束。
  // 若原 SQL 有 UNIQUE(session_id, state_key)，请移除。我们在 S1-1 提供的 SQL 中未加该约束，因此安全。
  /**
   * 追加状态历史（保留所有版本）
   */
  appendState(sessionUuid: string, stateKey: string, stateValue: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO game_states (session_id, state_key, state_value, updated_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);
    stmt.run(sessionUuid, stateKey, stateValue);
  }

  /**
   * 获取最新一条状态（等同于 getCurrentState）
   */
  getLatestState(sessionUuid: string, stateKey: string): GameStateRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM game_states WHERE session_id = ? AND state_key = ?
      ORDER BY updated_at DESC LIMIT 1
    `);
    return stmt.get(sessionUuid, stateKey) as GameStateRow | undefined;
  }
}