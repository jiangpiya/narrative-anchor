import Database from 'better-sqlite3';
import { NPCModel } from './NPCModel';

export interface NPCMemoryRow {
  id: number;
  session_id: string;
  npc_name: string;
  memory_text: string;
  turn: number;
  timestamp: number;      // Unix 毫秒时间戳
  created_at: string;     // SQLite 日期时间
}

export class NPCMemoryModel {
  private db: Database.Database;
  private npcModel: NPCModel;

   constructor(db: Database.Database) {
    this.db = db;
    this.npcModel = new NPCModel(db);
  }

  addMemory(
    sessionId: string,
    npcName: string,
    memoryText: string,
    turn: number,
    importance: number,
    timestamp: number
  ): number {
    // 1. 根据 sessionId 和 npcName 获取 NPC 的数据库主键 id
    const finalImportance = importance ?? 1;
    const npc = this.npcModel.getNPCByName(sessionId, npcName);
    if (!npc) {
      throw new Error(`NPC "${npcName}" does not exist in session "${sessionId}".`);
    }
    const npcid = npc.id;   // 这是 npcs 表的自增主键

    // 2. 插入 npc_memories，包含 npcid
    const stmt = this.db.prepare(`
      INSERT INTO npc_memories (npcid, session_id, npc_name, memory_text, turn, importance, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(npcid, sessionId, npcName, memoryText, turn, importance, timestamp);
    return result.lastInsertRowid as number;
  }

  /**
   * 获取某 NPC 的记忆列表（按轮次倒序，最新的在前）
   * @param sessionId 会话的数据库主键 id
   * @param npc_name NPC 名称
   * @param limit 最大返回数量，默认 50
   */
  getMemoriesByNPC(
    sessionId: string,
    npc_name: string,
    limit: number = 50
  ): NPCMemoryRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM npc_memories
      WHERE session_id = ? AND npc_name = ?
      ORDER BY turn DESC, timestamp DESC
      LIMIT ?
    `);
    return stmt.all(sessionId, npc_name, limit) as NPCMemoryRow[];
  }

  /**
   * 删除某 NPC 的所有记忆
   * @param sessionId 会话的数据库主键 id
   * @param npc_name NPC 名称
   */
  deleteMemoriesByNPC(sessionId: string, npc_name: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM npc_memories WHERE session_id = ? AND npc_name = ?
    `);
    stmt.run(sessionId, npc_name);
  }

  /**
   * 删除某会话的所有 NPC 记忆（通常由外键级联处理，但也可手动调用）
   * @param sessionId 会话的数据库主键 id
   */
  deleteAllBySession(sessionId: string): void {
    const stmt = this.db.prepare(`DELETE FROM npc_memories WHERE session_id = ?`);
    stmt.run(sessionId);
  }

/**
 * 更新单条记忆内容（可选更新轮次）
 * @param memoryId 记忆主键 id
 * @param memoryText 新的记忆文本
 * @param turn 新的轮次（可选，不传则不更新）
 * @param importance 新的重要程度（可选，不传则不更新）
 */
updateMemory(memoryId: number, memoryText: string, turn?: number, importance?: number): void {
  let sql = `UPDATE npc_memories SET memory_text = ?`;
  const params: any[] = [memoryText];
  if (turn !== undefined) {
    sql += `, turn = ?`;
    params.push(turn);
  }
  if (importance !== undefined) {
    sql += `, importance = ?`;
    params.push(importance);
  }
  sql += ` WHERE id = ?`;
  params.push(memoryId);
  const stmt = this.db.prepare(sql);
  const result = stmt.run(...params);
  if (result.changes === 0) {
    throw new Error(`Memory with id ${memoryId} not found`);
  }
}

/**
 * 根据记忆 ID 删除单条记忆
 * @param memoryId 记忆主键 id
 */
deleteMemory(memoryId: number): void {
  const stmt = this.db.prepare('DELETE FROM npc_memories WHERE id = ?');
  const result = stmt.run(memoryId);
  if (result.changes === 0) {
    throw new Error(`Memory with id ${memoryId} not found`);
  }
}

/**
 * 删除指定 NPC 的所有记忆（重置）
 * @param sessionUuid 会话 UUID
 * @param npcName NPC 名称
 */
deleteAllByNPC(sessionUuid: string, npcName: string): void {
  const stmt = this.db.prepare('DELETE FROM npc_memories WHERE session_id = ? AND npc_name = ?');
  const result = stmt.run(sessionUuid, npcName);
  // 即使没有记录也不报错，返回成功
}

}