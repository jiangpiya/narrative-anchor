// ============================================
// IPC 通道名称常量
// ============================================

export const IPCChannels = {
  // 会话管理
  CREATE_SESSION: 'GAME:CREATE_SESSION',
  GET_SESSIONS: 'GAME:GET_SESSIONS',
  SWITCH_SESSION: 'GAME:SWITCH_SESSION',
  
  // 状态管理
  GET_CURRENT_STATE: 'GAME:GET_CURRENT_STATE',
  UPDATE_STATE: 'GAME:UPDATE_STATE',
  
  // 对话管理
  ADD_DIALOGUE: 'GAME:ADD_DIALOGUE',
  GET_RECENT_DIALOGUES: 'GAME:GET_RECENT_DIALOGUES',
  
  // NPC 管理
  CREATE_NPC: 'GAME:CREATE_NPC',
  GET_NPCS_BY_SESSION: 'GAME:GET_NPCS_BY_SESSION',
  ADD_NPC_MEMORY: 'GAME:ADD_NPC_MEMORY',
  GET_NPC_MEMORIES: 'GAME:GET_NPC_MEMORIES',
} as const;

// ============================================
// 请求参数类型（渲染进程 -> 主进程）
// ============================================

export interface CreateSessionParams {
  sessionUuid: string;
  sessionName: string;
}

export interface GetSessionsParams {
  limit?: number;
}

export interface SwitchSessionParams {
  sessionUuid: string;
}

export interface GetCurrentStateParams {
  sessionUuid: string;
  stateKey: string;
}

export interface UpdateStateParams {
  sessionUuid: string;
  stateKey: string;
  stateDelta: any; // JSON 可序列化对象
}

export interface AddDialogueParams {
  sessionUuid: string;
  npcId?: string | null;
  speaker: string;
  message: string;
  turn: number; // 对话轮数
  stateAfter?: any; // 可选，保存对话后的状态快照
}

export interface GetRecentDialoguesParams {
  sessionUuid: string;
  limit?: number;
}

export interface CreateNPCParams {
  npcUuid: string;
  name: string;
  personality?: string | null;
  background?: string | null;
  avatarPath?: string | null;
}

export interface GetNPCsBySessionParams {
  sessionUuid: string;
  limit?: number;
}

export interface AddNPCMemoryParams {
  npcId: string;
  sessionUuid: string;
  memoryText: string;
  importance?: number;
}

export interface GetNPCMemoriesParams {
  npc_name: string;
  sessionUuid: string;
  limit?: number;
}

// ============================================
// 返回值类型（主进程 -> 渲染进程）
// ============================================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type IpcResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// 具体响应类型（可根据需要扩展）
export interface SessionData {
  id: number;
  sessionUuid: string;
  sessionName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DialogueData {
  id: number;
  sessionId: number;
  npcId: string | null;
  speaker: string;
  message: string;
  timestamp: string;
}

export interface NPCData {
  id: number;
  npcUuid: string;
  name: string;
  personality: string | null;
  background: string | null;
  avatarPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NPCMemoryData {
  id: number;
  npcId: number;
  sessionId: number;
  memoryText: string;
  importance: number;
  createdAt: string;
}

export * from './database';
export * from './ipc';
export * from './ai';

export interface SettingsDoc {
  id: number;
  filename: string;
  filePath: string;
  isCore: boolean;
  enabled: boolean;
  isCleaned: boolean;
}