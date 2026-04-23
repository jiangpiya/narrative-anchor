// ============================================
// 数据库行对应的 TypeScript 接口（snake_case 与数据库字段一致）
// 渲染进程可通过 IPC 接收这些类型，建议统一使用 camelCase 但这里保持原始字段名
// ============================================

export interface GameSessionRow {
  id: number;
  session_uuid: string;
  session_name: string;
  created_at: string;
  updated_at: string;
}

export interface GameStateRow {
  id: number;
  session_id: number;
  state_key: string;
  state_value: string; // JSON string
  updated_at: string;
}

export interface DialogueRow {
  id: number;
  session_id: number;
  npc_id: string | null;
  speaker: string;
  message: string;
  timestamp: string;
}

export interface SummaryRow {
  id: number;
  session_id: number;
  summary_text: string;
  start_dialogue_id: number | null;
  end_dialogue_id: number | null;
  created_at: string;
}

export interface KeyEventRow {
  id: number;
  session_id: number;
  event_name: string;
  event_description: string | null;
  event_timestamp: string;
}

export interface SettingsDocRow {
  id: number;
  setting_key: string;
  setting_value: string; // JSON string
  updated_at: string;
}

export interface NPCRow {
  id: number;
  npc_uuid: string;
  name: string;
  personality: string | null; // JSON string
  background: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPCMemoryRow {
  id: number;
  npc_name: string;
  session_id: number;
  memory_text: string;
  importance: number;
  created_at: string;
}

// 迁移记录表类型（可选）
export interface MigrationRow {
  id: number;
  name: string;
  applied_at: string;
}