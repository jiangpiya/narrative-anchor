import type {
  CreateSessionParams,
  GetSessionsParams,
  SwitchSessionParams,
  GetCurrentStateParams,
  UpdateStateParams,
  AddDialogueParams,
  GetRecentDialoguesParams,
  CreateNPCParams,
  GetNPCsBySessionParams,
  AddNPCMemoryParams,
  GetNPCMemoriesParams,
  IpcResponse,
  SessionData,
  DialogueData,
  NPCData,
  NPCMemoryData,
} from '@shared/types/ipc';

/**
 * 游戏服务 - 封装所有游戏相关的 IPC 调用
 * 直接透传参数和返回值，统一错误处理
 */
export const gameService = {
  // 会话管理
  async createSession(params: CreateSessionParams): Promise<IpcResponse<SessionData>> {
    try {
      return await window.electronAPI.game.createSession(params);
    } catch (error) {
      console.error('[GameService] createSession failed:', error);
      throw new Error('Failed to create session');
    }
  },

  async getSessions(params?: GetSessionsParams): Promise<IpcResponse<SessionData[]>> {
    try {
      return await window.electronAPI.game.getSessions(params || {});
    } catch (error) {
      console.error('[GameService] getSessions failed:', error);
      throw new Error('Failed to load sessions');
    }
  },

  async switchSession(params: SwitchSessionParams): Promise<IpcResponse<void>> {
    try {
      return await window.electronAPI.game.switchSession(params);
    } catch (error) {
      console.error('[GameService] switchSession failed:', error);
      throw new Error('Failed to switch session');
    }
  },

  // 状态管理
  async getCurrentState(params: GetCurrentStateParams): Promise<IpcResponse<any>> {
    try {
      return await window.electronAPI.game.getCurrentState(params);
    } catch (error) {
      console.error('[GameService] getCurrentState failed:', error);
      throw new Error('Failed to load game state');
    }
  },

  async updateState(params: UpdateStateParams): Promise<IpcResponse<any>> {
const safeDelta = JSON.parse(JSON.stringify(params.stateDelta));
const safeParams = { ...params, stateDelta: safeDelta };
    
    try {
      return await window.electronAPI.game.updateState(safeParams);
    } catch (error) {
      console.error('[GameService] updateState failed:', error);
      throw new Error('Failed to save game state');
    }
  },

  // 对话管理
  async addDialogue(params: AddDialogueParams): Promise<IpcResponse<void>> {
    try {
      return await window.electronAPI.game.addDialogue(params);
    } catch (error) {
      console.error('[GameService] addDialogue failed:', error);
      throw new Error('Failed to add dialogue');
    }
  },

  async getRecentDialogues(params: GetRecentDialoguesParams): Promise<IpcResponse<DialogueData[]>> {
    try {
      return await window.electronAPI.game.getRecentDialogues(params);
    } catch (error) {
      console.error('[GameService] getRecentDialogues failed:', error);
      throw new Error('Failed to load dialogues');
    }
  },

  // NPC 管理
  async createNPC(params: CreateNPCParams): Promise<IpcResponse<NPCData>> {
    try {
      return await window.electronAPI.game.createNPC(params);
    } catch (error) {
      console.error('[GameService] createNPC failed:', error);
      throw new Error('Failed to create NPC');
    }
  },

  async getNPCsBySession(params?: GetNPCsBySessionParams): Promise<IpcResponse<NPCData[]>> {
    try {
      return await window.electronAPI.game.getNPCsBySession(params || {});
    } catch (error) {
      console.error('[GameService] getNPCsBySession failed:', error);
      throw new Error('Failed to load NPCs');
    }
  },

  async addNPCMemory(params: AddNPCMemoryParams): Promise<IpcResponse<void>> {
    try {
      return await window.electronAPI.game.addNPCMemory(params);
    } catch (error) {
      console.error('[GameService] addNPCMemory failed:', error);
      throw new Error('Failed to add NPC memory');
    }
  },

  async getNPCMemories(params: GetNPCMemoriesParams): Promise<IpcResponse<NPCMemoryData[]>> {
    try {
      return await window.electronAPI.game.getNPCMemories(params);
    } catch (error) {
      console.error('[GameService] getNPCMemories failed:', error);
      throw new Error('Failed to load NPC memories');
    }
  },
};