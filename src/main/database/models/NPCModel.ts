import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface NPCRow {
  id: number;
  session_id: number;       // 注意：存储的是会话的数据库主键 id，不是 session_uuid
  npc_uuid: string;        // 新增 npc_uuid 字段
  name: string;
  first_appearance_turn: number;
  relation: string;
  relation_value: number;
  notes: string | null;
  aliases: string;         // 曾用称谓，JSON 字符串数组，如 '["神秘人"]'
  created_at: string;
}

export class NPCModel {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 创建 NPC
   * @param sessionId 会话的数据库主键 id（数字）
   * @param name NPC 名称
   * @param firstAppearanceTurn 首次出现轮次
   * @param relation 关系描述（如“朋友”）
   * @param relationValue 好感度数值（-100 到 100）
   * @param notes 备注（可选）
   * @returns 插入行的 id
   * @throws 如果同名 NPC 已存在，抛出友好错误
   */
  createNPC(
    sessionid: string,
    name: string,
    firstAppearanceTurn: number,
    relation: string,
    relationValue: number,
    notes?: string,
    aliases: string = '[]'
  ): number {
    const npcUuid = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO npcs (session_id, npc_uuid, name, first_appearance_turn, relation, relation_value, notes, aliases, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    try {
      const result = stmt.run(
        sessionid,
        npcUuid,
        name,
        firstAppearanceTurn,
        relation,
        relationValue,
        notes || null,
        aliases
      );
      return result.lastInsertRowid as number;
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`NPC with name "${name}" already exists in this session.`);
      }
      throw err;
    }
  }

  /**
   * 获取某会话的所有 NPC（按首次出现轮次升序）
   * @param sessionId 会话的数据库主键 id
   */
  getNPCsBySession(sessionid: string): NPCRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM npcs WHERE session_id = ? ORDER BY first_appearance_turn ASC
    `);
    return stmt.all(sessionid) as NPCRow[];
  }

  /**
   * 根据名称获取 NPC
   * @param sessionId 会话的数据库主键 id
   * @param name NPC 名称
   */
  getNPCByName(sessionid: string, name: string): NPCRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM npcs WHERE session_id = ? AND name = ?
    `);
    return stmt.get(sessionid, name) as NPCRow | undefined;
  }

/**
 * 更新 NPC 的基本信息（只更新提供的字段）
 * @param sessionUuid 会话 UUID
 * @param name NPC 名称
 * @param updates 要更新的字段对象，可包含 relation, relationValue, notes, personality, background, avatarPath
 */
updateNPC(
  sessionId: string,
  name: string,
  updates: Partial<{
    name: string;
    relation: string;
    relationValue: number;
    notes: string;
  }>
): void {
  const fields: string[] = [];
  const values: any[] = [];
  // 新增：处理 name 更新
  let newName = updates.name;
  if (newName !== undefined) {
    fields.push('name = ?');
    values.push(newName);
  }
  if (updates.relation !== undefined) {
    fields.push('relation = ?');
    values.push(updates.relation);
  }
  if (updates.relationValue !== undefined) {
    fields.push('relation_value = ?');
    values.push(updates.relationValue);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now', 'localtime')`);
  values.push(sessionId, name);
  const sql = `UPDATE npcs SET ${fields.join(', ')} WHERE session_id = ? AND name = ?`;
  console.log('[SQL]', sql, values);
  const stmt = this.db.prepare(sql);
  const result = stmt.run(...values);
  if (result.changes === 0) {
    throw new Error(`NPC with name "${name}" not found in session "${sessionId}".`);
  }
}

/**
 * 更新 NPC 的好感度和关系描述（便捷方法）
 * @param sessionId 会话 UUID
 * @param name NPC 名称
 * @param relationValue 新的好感度数值
 * @param relation 可选，新的关系描述
 */
updateNPCRelation(sessionId: string, name: string, relationValue: number, relation?: string): void {
    const updates: any = { relationValue };
    if (relation !== undefined) updates.relation = relation;
    this.updateNPC(sessionId, name, updates);
  }

/**
 * 同一 NPC 揭示真实身份时改名：更新 name，并把旧称谓记入 aliases
 * 注意：仅更新 npcs 表；npc_memories.npc_name 的级联更新由 NPCMemoryModel.renameForNPC 完成
 * @param sessionId 会话 UUID
 * @param oldName 当前（曾用）名称，必须与已有 NPC 完全一致
 * @param newName 新的真实名称
 */
renameNPC(sessionId: string, oldName: string, newName: string): void {
  const npc = this.getNPCByName(sessionId, oldName);
  if (!npc) {
    throw new Error(`NPC with name "${oldName}" not found in session "${sessionId}".`);
  }

  let aliasList: string[] = [];
  try {
    const parsed = JSON.parse(npc.aliases || '[]');
    if (Array.isArray(parsed)) aliasList = parsed.filter(a => typeof a === 'string');
  } catch {
    aliasList = [];
  }
  if (!aliasList.includes(oldName)) aliasList.push(oldName);

  const stmt = this.db.prepare(`
    UPDATE npcs
    SET name = ?, aliases = ?, updated_at = datetime('now', 'localtime')
    WHERE session_id = ? AND name = ?
  `);
  try {
    const result = stmt.run(newName, JSON.stringify(aliasList), sessionId, oldName);
    if (result.changes === 0) {
      throw new Error(`Failed to rename NPC "${oldName}" to "${newName}".`);
    }
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error(`NPC with name "${newName}" already exists in this session.`);
    }
    throw err;
  }
}

/**
 * 按名称或曾用称谓解析 NPC（先精确匹配当前名，再匹配 aliases）
 * @param sessionId 会话 UUID
 * @param nameOrAlias 当前名或别名
 */
resolveNPC(sessionId: string, nameOrAlias: string): NPCRow | undefined {
  const exact = this.getNPCByName(sessionId, nameOrAlias);
  if (exact) return exact;

  const stmt = this.db.prepare(`SELECT * FROM npcs WHERE session_id = ?`);
  const all = stmt.all(sessionId) as NPCRow[];
  return all.find(npc => {
    try {
      const aliases = JSON.parse(npc.aliases || '[]');
      return Array.isArray(aliases) && aliases.includes(nameOrAlias);
    } catch {
      return false;
    }
  });
}

}