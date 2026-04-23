// ============================================
// Settings 相关 IPC 类型定义
// ============================================

export type SettingsKey = 'apiKey' | 'baseUrl' | 'systemPrompt';

export interface SettingsStore {
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
}

export const SETTINGS_IPC_CHANNELS = {
  GET: 'settings:get',
  SET: 'settings:set',
  GET_ALL: 'settings:getAll',
} as const;

export interface SettingsDoc {
  id: number;
  name: string;
  file_path: string;      // 注意字段名是 file_path（下划线）
  content: string;
  is_cleaned: boolean;    // 注意字段名 is_cleaned
  enabled: boolean;
  created_at: string;
  updated_at: string;
}