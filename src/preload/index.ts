import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '../shared/types/ipc';
import { AI_IPC_CHANNEL } from '../shared/types/ai';
import { SETTINGS_CHANNELS } from '../shared/types/store';
import type { ChatMessage, Tool, ChatResponse } from '../shared/types/ai';
import type { Settings, SettingsGetParams, SettingsSetParams } from '../shared/types/store';

const electronAPI = {
  game: {
    createSession: (params: any) => ipcRenderer.invoke(IPCChannels.CREATE_SESSION, params),
    getSessions: (params?: any) => ipcRenderer.invoke(IPCChannels.GET_SESSIONS, params || {}),
    switchSession: (params: any) => ipcRenderer.invoke(IPCChannels.SWITCH_SESSION, params),
    getCurrentState: (params: any) => ipcRenderer.invoke(IPCChannels.GET_CURRENT_STATE, params),
    renameSession: (sessionUuid: string, newName: string) =>ipcRenderer.invoke('game:renameSession', sessionUuid, newName),
    updateState: (params: any) => ipcRenderer.invoke(IPCChannels.UPDATE_STATE, params),
    addDialogue: (params: any) => ipcRenderer.invoke(IPCChannels.ADD_DIALOGUE, params),
    getRecentDialogues: (params: any) => ipcRenderer.invoke(IPCChannels.GET_RECENT_DIALOGUES, params),
    createNPC: (params: any) => ipcRenderer.invoke(IPCChannels.CREATE_NPC, params),
    getNPCsBySession: (params?: any) => ipcRenderer.invoke(IPCChannels.GET_NPCS_BY_SESSION, params || {}),
    addNPCMemory: (params: any) => ipcRenderer.invoke(IPCChannels.ADD_NPC_MEMORY, params),
    getNPCMemories: (params: any) => ipcRenderer.invoke(IPCChannels.GET_NPC_MEMORIES, params),
    updateNPCRelation: (params: { sessionUuid: string; name: string; relationValue?: number; relation?: string }) =>ipcRenderer.invoke('game:updateNPCRelation', params),
    duplicateSession: (sessionUuid: string, newName: string) =>ipcRenderer.invoke('game:duplicateSession', sessionUuid, newName),
    deleteSession: (sessionUuid: string) =>ipcRenderer.invoke('game:deleteSession', sessionUuid),
    saveSummary: (sessionUuid: string, startDialogueId: number | null, endDialogueId: number | null, summaryText: string) =>
  ipcRenderer.invoke('game:saveSummary', sessionUuid, startDialogueId, endDialogueId, summaryText),
    getRecentSummaries: (sessionUuid: string, limit?: number) =>
  ipcRenderer.invoke('game:getRecentSummaries', sessionUuid, limit),
    deleteAllSummaries: (sessionUuid: string) => ipcRenderer.invoke('game:deleteAllSummaries', sessionUuid),
    addKeyEvent: (sessionUuid: string, eventName: string, eventDescription: string) =>
    ipcRenderer.invoke('game:addKeyEvent', sessionUuid, eventName, eventDescription),
    getKeyEvents: (sessionUuid: string, limit?: number) =>
    ipcRenderer.invoke('game:getKeyEvents', sessionUuid, limit),
    deleteKeyEvent: (eventId: number) =>
    ipcRenderer.invoke('game:deleteKeyEvent', eventId),
    getStateSchema: (sessionUuid: string) => ipcRenderer.invoke('game:getStateSchema', sessionUuid),
    saveStateSchema: (sessionUuid: string, schema: any[]) => ipcRenderer.invoke('game:saveStateSchema', sessionUuid, schema),
    getStateGroups: (sessionUuid: string) => ipcRenderer.invoke('game:getStateGroups', sessionUuid),
    saveStateGroups: (sessionUuid: string, groups: any[]) => ipcRenderer.invoke('game:saveStateGroups', sessionUuid, groups),
  },
 chat: (
  messages: ChatMessage[],
  tools?: Tool[],
  apiKey?: string,
  baseUrl?: string,
  temperature?: number
): Promise<ChatResponse> =>
  ipcRenderer.invoke(AI_IPC_CHANNEL, messages, tools || [], apiKey, baseUrl, temperature),
  settings: {
    getAll: () => ipcRenderer.invoke(SETTINGS_CHANNELS.GET_ALL),
    get: (params: SettingsGetParams) => ipcRenderer.invoke(SETTINGS_CHANNELS.GET, params),
    set: (params: SettingsSetParams) => ipcRenderer.invoke(SETTINGS_CHANNELS.SET, params),
    delete: (key: keyof Settings) => ipcRenderer.invoke(SETTINGS_CHANNELS.DELETE, key),
  },
settingsDocs: {
  setCore: (id: number, isCore: boolean) => ipcRenderer.invoke('settings:setCore', id, isCore),
  saveDoc: (fileName: string, content: string, isCore: boolean) =>
    ipcRenderer.invoke('settings:saveDoc', fileName, content, isCore),
  getDocs: () => ipcRenderer.invoke('settings:getDocs'),
  uploadDoc: (isCore?: boolean) => ipcRenderer.invoke('settings:uploadDoc', isCore),
  updateDoc: (docId: number, newContent: string) => ipcRenderer.invoke('settings:updateDoc', docId, newContent),
  toggleDoc: (id: number, enabled: boolean) => ipcRenderer.invoke('settings:toggleDoc', id, enabled),
  deleteDoc: (id: number) => ipcRenderer.invoke('settings:deleteDoc', id),
  readDocFile: (id: number) => ipcRenderer.invoke('settings:readDocFile', id),
  saveCleaned: (originalId: number, cleanedMarkdown: string, isCore?: boolean) => ipcRenderer.invoke('settings:saveCleaned', originalId, cleanedMarkdown, isCore),
},
    // 新增：清洗设定文档
  cleanSettings: (rawContent: string, apiKey?: string, baseUrl?: string): Promise<{ markdown: string }> =>
    ipcRenderer.invoke('ai:cleanSettings', rawContent, apiKey, baseUrl),
    
npcEditor: {
    addMemory: (sessionUuid: string, npcName: string, memoryText: string, turn: number, timestamp: number) =>
      ipcRenderer.invoke('npcEditor:addMemory', sessionUuid, npcName, memoryText, turn, timestamp),
    updateMemory: (memoryId: number, memoryText: string, turn?: number, importance?: number) =>
      ipcRenderer.invoke('npcEditor:updateMemory', memoryId, memoryText, turn, importance),
    deleteMemory: (memoryId: number) =>
      ipcRenderer.invoke('npcEditor:deleteMemory', memoryId),
    resetNPCMemories: (sessionUuid: string, npcName: string) =>
      ipcRenderer.invoke('npcEditor:resetNPCMemories', sessionUuid, npcName),
    updateNPC: (sessionUuid: string, npcName: string, updates: any) =>
      ipcRenderer.invoke('npcEditor:updateNPC', sessionUuid, npcName, updates),
  },
   quitApp: () => ipcRenderer.invoke('app:quit'),
    toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('app:isFullscreen'),
  setWindowFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('app:setWindowFullscreen', fullscreen),
isWindowFullscreen: () => ipcRenderer.invoke('app:isWindowFullscreen'),
};


if (!(window as any).electronAPI) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
} else {
  console.warn('[Preload] electronAPI already exists, skipping re-expose');
}