// 全局类型声明，使渲染进程能够识别 window.electronAPI
import type { ChatMessage, Tool, ChatResponse } from '../shared/types/ai';
import type { Settings, SettingsGetParams, SettingsSetParams } from '../shared/types/store';
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
} from './ipc';



interface SettingsDoc {
  id: number;
  filename: string;
  filePath: string;
  isCore: boolean;
  enabled: boolean;
  isCleaned: boolean;
}



interface NPCEditorAPI {
  updateNPC(params: { sessionUuid: string; npcName: string; relation?: string; relationValue?: number; notes?: string }): Promise<{ success: boolean; error?: string }>;
  addMemory(params: { sessionUuid: string; npcName: string; memoryText: string; eventTurn: number; importance?: number; timestamp: number }): Promise<{ success: boolean; memoryId?: number; error?: string }>;
  updateMemory(params: { memoryId: number; memoryText: string; turn?: number; importance?: number }): Promise<{ success: boolean; error?: string }>;
  deleteMemory(params: { memoryId: number }): Promise<{ success: boolean; error?: string }>;
  resetNPCMemories(params: { sessionUuid: string; npcName: string }): Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: {

        setWindowFullscreen(fullscreen: boolean): Promise<boolean>;
        isWindowFullscreen(): Promise<boolean>;
        npcEditor: any;
        npcEditor: any;
        npcEditor: any;
        npcEditor: any;

      game: {
        getStateGroups(currentSessionId: string): unknown;
        createSession(params: CreateSessionParams): Promise<IpcResponse<SessionData>>;
        getSessions(params?: GetSessionsParams): Promise<IpcResponse<SessionData[]>>;
        switchSession(params: SwitchSessionParams): Promise<IpcResponse<void>>;
        getCurrentState(params: GetCurrentStateParams): Promise<IpcResponse<any>>;
        updateState(params: UpdateStateParams): Promise<IpcResponse<any>>;
        addDialogue(params: AddDialogueParams): Promise<IpcResponse<void>>;
        getRecentDialogues(params: GetRecentDialoguesParams): Promise<IpcResponse<DialogueData[]>>;
        createNPC(params: CreateNPCParams): Promise<IpcResponse<NPCData>>;
        getNPCsBySession(params?: GetNPCsBySessionParams): Promise<IpcResponse<NPCData[]>>;
        addNPCMemory(params: AddNPCMemoryParams): Promise<IpcResponse<void>>;
        getNPCMemories(params: GetNPCMemoriesParams): Promise<IpcResponse<NPCMemoryData[]>>;
        updateNPCRelation: (params: {sessionUuid: string,name: string,relationValue?: number,relation?: string}) => Promise<any>;
        renameSession(sessionUuid: string, newName: string): Promise<{ success: boolean; error?: string }>;
        duplicateSession(sessionUuid: string, newName: string): Promise<{ success: boolean; sessionUuid?: string; error?: string }>;
        deleteSession(sessionUuid: string): Promise<{ success: boolean; error?: string }>;
        saveSummary(sessionUuid: string, startDialogueId: number | null, endDialogueId: number | null, summaryText: string): Promise<{ success: boolean; summaryId?: number; error?: string }>;
        getRecentSummaries(sessionUuid: string, limit?: number): Promise<{ success: boolean; summaries?: SummaryRow[]; error?: string }>;
        addKeyEvent(sessionUuid: string, eventName: string, eventDescription: string): Promise<{ success: boolean; eventId?: number; error?: string }>;
        getKeyEvents(sessionUuid: string, limit?: number): Promise<{ success: boolean; events?: KeyEventRow[]; error?: string }>;
        deleteKeyEvent(eventId: number): Promise<{ success: boolean; error?: string }>;
        getStateSchema(sessionUuid: string): Promise<{ success: boolean; schema?: any[]; error?: string }>;
        saveStateSchema(sessionUuid: string, schema: any[]): Promise<{ success: boolean; error?: string }>;
        getStateGroups(sessionUuid: string): Promise<{ success: boolean; groups?: any[]; error?: string }>;
        saveStateGroups(sessionUuid: string, groups: any[]): Promise<{ success: boolean; error?: string }>;

      };
  chat(
    messages: ChatMessage[],
    tools?: Tool[],
    apiKey?: string,
    baseUrl?: string,
    temperature?: number
  ): Promise<ChatResponse>;
       settingsDocs: {
        setCore(id: number, isCore: boolean): Promise<{ success: boolean }>;
        saveDoc(fileName: string, content: string, isCore: boolean): Promise<SettingsDoc>;
        getDocs(): Promise<SettingsDoc[]>;
        uploadDoc(isCore?: boolean): Promise<SettingsDoc | null>;
        updateDoc(docId: number, newContent: string): Promise<{ success: boolean; error?: string }>;
        toggleDoc(id: number, enabled: boolean): Promise<{ success: boolean }>;
        deleteDoc(id: number): Promise<{ success: boolean }>;
        readDocFile(id: number): Promise<{ content: string }>;
        saveCleaned(originalId: number, cleanedMarkdown: string, isCore: boolean): Promise<SettingsDoc>;
        npcEditor: NPCEditorAPI;
      };
       // 新增清洗方法
      cleanSettings(rawContent: string, apiKey?: string, baseUrl?: string): Promise<{ markdown: string }>;
    };
  }
  
}

export {};