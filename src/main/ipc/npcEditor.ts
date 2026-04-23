import { ipcMain } from 'electron';
import { getDb } from '../database/db';
import { GameSessionModel } from '../database/models/GameSessionModel';
import { NPCModel } from '../database/models/NPCModel';
import { NPCMemoryModel } from '../database/models/NPCMemoryModel';

// 获取模型实例的辅助函数（复用已有的 getModels 或直接创建）
function getModels() {
  const db = getDb();
  return {
    gameSession: new GameSessionModel(db),
    npc: new NPCModel(db),
    npcMemory: new NPCMemoryModel(db),
  };
}

export function registerNPCEditorHandlers() {
  const models = getModels();

ipcMain.handle('npcEditor:updateNPC', async (event, params: {

  sessionUuid: string;
  npcName: string;
  relation?: string;
  relationValue?: number;
  notes?: string;
  
}) => { 
    console.log('[IPC] updateNPC 收到参数:', params);
  try {
    const { sessionUuid, npcName, relation, relationValue, notes } = params;
    const { npc } = getModels();
    npc.updateNPC(sessionUuid, npcName, { relation, relationValue, notes });
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] npcEditor:updateNPC error:', error);
    return { success: false, error: error.message };
  }
});

// 添加记忆
ipcMain.handle('npcEditor:addMemory', async (event, params: {
  sessionUuid: string;
  npcName: string;
  memoryText: string;
  eventTurn: number;
  importance?: number;
  timestamp: number;
}) => {
  try {
    const { sessionUuid, npcName, memoryText, eventTurn, importance , timestamp } = params;
    const { gameSession, npc, npcMemory } = getModels();
    const session = gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const npcObj = npc.getNPCByName(sessionUuid, npcName);
    if (!npcObj) throw new Error(`NPC "${npcName}" not found`);
    const memoryId = npcMemory.addMemory(sessionUuid, npcName, memoryText, eventTurn, importance, Date.now());
    return { success: true, memoryId };
  } catch (error: any) {
    console.error('[IPC] npcEditor:addMemory error:', error);
    return { success: false, error: error.message };
  }
});

// 更新记忆
ipcMain.handle('npcEditor:updateMemory', async (event, params: {
  memoryId: number;
  memoryText: string;
  turn?: number;
  importance?: number;
}) => {
  try {
    const { memoryId, memoryText, turn,importance } = params;
    const { npcMemory } = getModels();
    npcMemory.updateMemory(memoryId, memoryText, turn, importance); // 如果需要更新 importance，需修改模型
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] npcEditor:updateMemory error:', error);
    return { success: false, error: error.message };
  }
});

// 删除记忆
ipcMain.handle('npcEditor:deleteMemory', async (event, params: { memoryId: number }) => {
  try {
    const { memoryId } = params;
    const { npcMemory } = getModels();
    npcMemory.deleteMemory(memoryId);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] npcEditor:deleteMemory error:', error);
    return { success: false, error: error.message };
  }
});

// 重置所有记忆
ipcMain.handle('npcEditor:resetNPCMemories', async (event, params: {
  sessionUuid: string;
  npcName: string;
}) => {
  try {
    const { sessionUuid, npcName } = params;
    const { npcMemory } = getModels();
    npcMemory.deleteAllByNPC(sessionUuid, npcName);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] npcEditor:resetNPCMemories error:', error);
    return { success: false, error: error.message };
  }
});
}