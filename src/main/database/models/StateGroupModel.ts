import Database from 'better-sqlite3';

export interface StateGroup {
  id: number;
  session_id: string;
  group_name: string;
  fields: string[];   // JSON 数组
  sort_order: number;
}

export class StateGroupModel {
  constructor(private db: Database.Database) {}

  getBySession(sessionId: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM state_groups WHERE session_id = ? ORDER BY sort_order ASC`);
    const rows = stmt.all(sessionId) as any[];
    return rows.map(row => ({
      ...row,
      fields: JSON.parse(row.fields),
    }));
  }

  saveGroups(sessionId: string, groups: { group_name: string; fields: string[]; sort_order: number }[]): void {
    const deleteStmt = this.db.prepare(`DELETE FROM state_groups WHERE session_id = ?`);
    deleteStmt.run(sessionId);

    const insertStmt = this.db.prepare(`
      INSERT INTO state_groups (session_id, group_name, fields, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    for (const group of groups) {
      insertStmt.run(sessionId, group.group_name, JSON.stringify(group.fields), group.sort_order);
    }
  }
}