import Database from 'better-sqlite3';

export interface StateField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
}

export class StateSchemaModel {
  constructor(private db: Database.Database) {}

  // 获取某会话的状态 schema，若无则返回默认硬编码 schema
  getBySession(sessionId: string): StateField[] {
    const stmt = this.db.prepare(`SELECT schema_json FROM game_state_schemas WHERE session_id = ?`);
    const row = stmt.get(sessionId) as { schema_json: string } | undefined;
    if (row) {
      return JSON.parse(row.schema_json);
    }
    // 返回默认 schema（与原 DEFAULT_GAME_STATE 对应）
    return [
      { name: 'name', type: 'string', defaultValue: '无名旅者' },
      { name: 'race', type: 'string', defaultValue: '人类' },
      { name: 'physicalCondition', type: 'string', defaultValue: '健康' },
      { name: 'mentalState', type: 'string', defaultValue: '平静' },
      { name: 'powerLevel', type: 'string', defaultValue: 1 },
      { name: 'traits', type: 'array', defaultValue: [] },
      { name: 'title', type: 'string', defaultValue: '' },
      { name: 'gold', type: 'string', defaultValue: 10 },
      { name: 'equipment', type: 'array', defaultValue: [] },
      { name: 'skills', type: 'array', defaultValue: [] },
      { name: 'ultimateSkill', type: 'array', defaultValue: [] },
      { name: 'friends', type: 'array', defaultValue: [] },
      { name: 'enemies', type: 'array', defaultValue: [] },
      { name: 'location', type: 'string', defaultValue: '新手村' },
      { name: 'date', type: 'string', defaultValue: '第1天' },
      { name: 'mainQuestProgress', type: 'string', defaultValue: '未开始' },
      { name: 'chapterProgress', type: 'string', defaultValue: 0 },
    ];
  }

  // 保存或更新 schema
  save(sessionId: string, fields: StateField[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO game_state_schemas (session_id, schema_json, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(session_id) DO UPDATE SET
        schema_json = excluded.schema_json,
        updated_at = excluded.updated_at
    `);
    stmt.run(sessionId, JSON.stringify(fields));
  }

  generateInitialState(schema: StateField[]): Record<string, any> {
  const state: Record<string, any> = {};
  for (const field of schema) {
    state[field.name] = field.defaultValue;
  }
  return state;
}
}