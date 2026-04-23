// ============================================
// 前端 Store 相关类型定义
// ============================================

/**
 * 对话消息
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  turn: number;
  timestamp: number;
}

/**
 * 游戏状态
 */
export type GameState = Record<string, any>;

/**
 * 用户设置
 */
export interface Settings {
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  provider: 'deepseek' | 'openai' | 'custom';
  modelName: string;
  customBaseUrl: string;
  bgmVolume: number;
  ambientVolume: number;
}
// ============================================
// Settings IPC 通道常量（必须导出）
// ============================================
export const SETTINGS_CHANNELS = {
  GET: 'settings:get',
  SET: 'settings:set',
  GET_ALL: 'settings:getAll',
  DELETE: 'settings:delete',
} as const;

export interface SettingsGetParams {
  key: keyof Settings;
}

export interface SettingsSetParams {
  key: keyof Settings;
  value: string;
}

/**
 * 新存档的默认游戏状态（符合 PRD 字段）
 */
export const DEFAULT_GAME_STATE: GameState = {
  name: '胡峰',
  race: '异性血脉(被识别为有超能力的人类)',
  physicalCondition: '健康',
  mentalState: '平静',
  powerLevel: "精英级9阶，96折叠度",
  traits: ['黄日储能','星陨之躯','星界感知'],
  title: '剑阁内门弟子',
  gold: '50银盾',
  equipment: ['剑阁装束', '绝影剑（武器）'],
  skills: ['青云步（大成）','听风剑法（小成）', '剑气纵横（初窥门径）'],
  ultimateSkill: [],
  friends: ['云鹤（师父）', '柳鸢（同门师妹）'],
  enemies: [],
  location: '湖林尼亚-暮光市-火车站',
  date: '1065年3月14日-9：30',
  mainQuestProgress: '总幕数1/830，总章节1/6',
  chapterProgress: '序章：启程，1/30',
};