import { ipcMain } from 'electron';
import { getDb, getModels } from '../database/db';
import { IPCChannels } from '@shared/types/ipc';
import { KeyEventModel } from '../database/models/KeyEventModel';
import { GameSessionModel, NPCModel, NPCMemoryModel } from '../database/models';
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
} from '@shared/types/ipc';
import { SummaryModel } from '../database/models/SummaryModel';
import { StateField, StateSchemaModel } from '../database/models/StateSchemaModel';
import { GameStateModel } from '../database/models/GameStateModel';
import { StateGroupModel } from '../database/models/StateGroupModel';

// 获取模型实例（单例）
const models = getModels();

// 辅助函数：统一错误返回
function handleError(error: unknown): IpcResponse {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[IPC Error]', message);
  return { success: false, error: message };
}

// 注册所有游戏相关 IPC 处理器
export function registerGameHandlers() {
  const models = getModels(); // 获取包含 npc, npcMemory 等的模型实例
  // 1. 创建会话
  ipcMain.handle(IPCChannels.CREATE_SESSION, async (_, params: CreateSessionParams): Promise<IpcResponse> => {
    try {
      const { sessionUuid, sessionName } = params;
      
      const id = models.gameSession.createSession(sessionUuid, sessionName);
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error('Failed to retrieve created session');
      return { success: true, data: session };
    } catch (error) {
      return handleError(error);
    }
  });

  // 2. 获取会话列表
  ipcMain.handle(IPCChannels.GET_SESSIONS, async (_, params: GetSessionsParams): Promise<IpcResponse> => {
    try {
      const { limit = 50 } = params;
      const sessions = models.gameSession.listSessions(limit);
      return { success: true, data: sessions };
    } catch (error) {
      return handleError(error);
    }
  });

  // 3. 切换会话（仅验证存在性）
  ipcMain.handle(IPCChannels.SWITCH_SESSION, async (_, params: SwitchSessionParams): Promise<IpcResponse> => {
    try {
      const { sessionUuid } = params;
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      return { success: true, data: undefined };
    } catch (error) {
      return handleError(error);
    }
  });

    // 4. 获取当前状态
  ipcMain.handle(IPCChannels.GET_CURRENT_STATE, async (_, params) => {
    try {
      const { sessionUuid, stateKey } = params;
      if (!sessionUuid) throw new Error('sessionUuid is required');
      
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      
      const state = models.gameState.getCurrentState(sessionUuid, stateKey);
      // 如果 state 存在，解析其 state_value；否则返回 null
      const stateValue = state ? JSON.parse(state.state_value) : null;
      return { success: true, data: stateValue };
    } catch (error) {
      console.error('[IPC] GET_CURRENT_STATE error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPCChannels.UPDATE_STATE, async (_, params: UpdateStateParams) => {
  try {
    const { sessionUuid, stateKey, stateDelta } = params;
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);

    // 获取当前状态
    const currentStateRow = models.gameState.getCurrentState(sessionUuid, stateKey);
    let currentState = currentStateRow ? JSON.parse(currentStateRow.state_value) : {};

    // 获取 Schema
    const schemaModel = new StateSchemaModel(getDb());
    const schema = schemaModel.getBySession(sessionUuid);

    // 构建字段映射
    const schemaMap = new Map(schema.map(f => [f.name, f]));

    // 验证并合并状态
    const newState = { ...currentState };
    for (const [key, value] of Object.entries(stateDelta)) {
      const fieldDef = schemaMap.get(key);
      if (!fieldDef) {
        console.warn(`[UPDATE_STATE] 未知字段 "${key}"，已忽略`);
        continue; // 忽略未定义字段，不中断
      }
      // 可选：类型转换（根据 schema 中的 type）
      let convertedValue = value;
      switch (fieldDef.type) {
        case 'number':
          convertedValue = Number(value);
          if (isNaN(convertedValue)) {
            console.warn(`[UPDATE_STATE] 字段 "${key}" 应为数字，收到 "${value}"，已忽略`);
            continue;
          }
          break;
        case 'boolean':
          convertedValue = Boolean(value);
          break;
        case 'string':
          convertedValue = String(value);
          break;
        // 数组和对象不做转换
      }
      newState[key] = convertedValue;
    }

    // 保存新状态
    models.gameState.saveState(sessionUuid, stateKey, JSON.stringify(newState));
    return { success: true, data: newState };
  } catch (error) {
    console.error('[IPC] UPDATE_STATE error:', error);
    return { success: false, error: error.message };
  }
});

  // 6. 添加对话（可选同时保存状态快照）
  ipcMain.handle(IPCChannels.ADD_DIALOGUE, async (_, params: AddDialogueParams): Promise<IpcResponse> => {
    try {
      const { sessionUuid, npcId, speaker, message, turn, stateAfter } = params;
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);

      // 添加对话
      models.dialogue.addDialogue(sessionUuid, npcId ?? null, speaker, message, turn);
      
      // 如果提供了 stateAfter，保存为状态快照（例如用于标记对话后的状态）
      if (stateAfter !== undefined) {
        const stateKey = 'dialogue_snapshot';
        const stateJson = JSON.stringify(stateAfter);
        models.gameState.appendState(sessionUuid, stateKey, stateJson);
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return handleError(error);
    }
  });

  // 7. 获取最近对话
  ipcMain.handle(IPCChannels.GET_RECENT_DIALOGUES, async (_, params: GetRecentDialoguesParams): Promise<IpcResponse> => {
    try {
      const { sessionUuid, limit = 20 } = params;
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      const dialogues = models.dialogue.getRecentDialogues(sessionUuid, limit);
      return { success: true, data: dialogues };
    } catch (error) {
      return handleError(error);
    }
  });

  // 创建 NPC
  ipcMain.handle(IPCChannels.CREATE_NPC, async (event, params) => {
    console.log('IPC CREATE_NPC called with params:', params);
    try {
      const { sessionUuid, name, firstAppearanceTurn, relation, relationValue, notes } = params;
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      const npcId = models.npc.createNPC(
        sessionUuid,
        name,
        firstAppearanceTurn,
        relation,
        relationValue,
        notes
      );
      // 获取完整 NPC 对象返回
      const npc = models.npc.getNPCByName(sessionUuid, name);
      return { success: true, npc };
    } catch (error: any) {
      console.error('[IPC] game:createNPC error:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取某会话的所有 NPC
  ipcMain.handle(IPCChannels.GET_NPCS_BY_SESSION, async (event, params) => {
    try {
      const { sessionUuid } = params;
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      const npcs = models.npc.getNPCsBySession(sessionUuid);
      
      return { success: true, npcs };
    } catch (error: any) {
      console.error('[IPC] game:getNPCsBySession error:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新 NPC 关系
ipcMain.handle('game:updateNPCRelation', async (event, params) => {
  try {
    const { sessionUuid, name, relationValue, relation } = params;
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const npc = models.npc.getNPCByName(sessionUuid, name);
    if (!npc) throw new Error(`NPC ${name} not found in this session`);
    models.npc.updateNPCRelation(sessionUuid, name, relationValue, relation);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:updateNPCRelation error:', error);
    return { success: false, error: error.message };
  }
});

  // 添加 NPC 记忆
  ipcMain.handle(IPCChannels.ADD_NPC_MEMORY, async (event, params) => {
    try {
      const { sessionUuid, npc_name, memoryText, turn, importance, timestamp } = params;
      console.log('[IPC] addNPCMemory received:', { sessionUuid, npc_name, memoryText, turn, importance, timestamp });
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) throw new Error(`Session ${sessionUuid} not found`);
      const memoryId = models.npcMemory.addMemory(
        sessionUuid,
        npc_name,
        memoryText,
        turn,
        importance,
        timestamp
      );
      return { success: true, memoryId };
    } catch (error: any) {
      console.error('[IPC] game:addNPCMemory error:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取某 NPC 的记忆列表
ipcMain.handle(IPCChannels.GET_NPC_MEMORIES, async (event, params) => {
  console.log('[IPC] game:getNPCMemories 收到参数:', params);
  try {
    const { sessionUuid, npc_name, limit = 50 } = params;  // 改为 npcName
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const memories = models.npcMemory.getMemoriesByNPC(sessionUuid, npc_name, limit);
    console.log(`[IPC] 查询到 ${memories.length} 条记忆 for ${npc_name}`);
    return { success: true, memories };
  } catch (error: any) {
    console.error('[IPC] game:getNPCMemories error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game:duplicateSession', async (event, sessionUuid: string, newName: string) => {
  try {
    const db = getDb();
    const sessionModel = new GameSessionModel(db);

    // 1. 检查原会话是否存在
    const originalSession = sessionModel.getSessionByUuid(sessionUuid);
    if (!originalSession) throw new Error(`Session ${sessionUuid} not found`);

    // 2. 生成新会话 UUID
    const newSessionUuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    // 3. 开启事务
    const transaction = db.transaction(() => {
      // 3.1 插入新会话（让数据库自动填充 created_at / updated_at）
      const insertSession = db.prepare(`
        INSERT INTO game_sessions (session_uuid, session_name)
        VALUES (?, ?)
      `);
      insertSession.run(newSessionUuid, newName);

      // 3.2 复制 game_states
      db.prepare(`
        INSERT INTO game_states (session_id, state_key, state_value, updated_at)
        SELECT ?, state_key, state_value, updated_at
        FROM game_states WHERE session_id = ?
      `).run(newSessionUuid, sessionUuid);

            // 3.3. 复制 game_state_schemas（新增）
      const oldSchema = db.prepare(`SELECT schema_json FROM game_state_schemas WHERE session_id = ?`).get(sessionUuid) as any;
      if (oldSchema) {
        db.prepare(`INSERT INTO game_state_schemas (session_id, schema_json, updated_at) VALUES (?, ?, datetime('now', 'localtime'))`).run(newSessionUuid, oldSchema.schema_json);
      }

      // 3.4. 复制 state_groups（新增）
      const oldGroups = db.prepare(`SELECT group_name, fields, sort_order FROM state_groups WHERE session_id = ?`).all(sessionUuid) as any[];
      const insertGroup = db.prepare(`INSERT INTO state_groups (session_id, group_name, fields, sort_order) VALUES (?, ?, ?, ?)`);
      for (const group of oldGroups) {
        insertGroup.run(newSessionUuid, group.group_name, group.fields, group.sort_order);
      }

      // 3.5 复制 npcs（生成新的 npc_uuid，记录 ID 映射）
      const npcIdMap = new Map<number, number>();
      const selectNPCs = db.prepare(`SELECT * FROM npcs WHERE session_id = ?`);
      const oldNPCs = selectNPCs.all(sessionUuid) as any[];
      const insertNPC = db.prepare(`
        INSERT INTO npcs (npc_uuid, name, session_id, first_appearance_turn, relation, relation_value, notes, created_at, personality, background, avatar_path, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const npc of oldNPCs) {
        const newNpcUuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-${npc.name}`;
        const result = insertNPC.run(
          newNpcUuid,
          npc.name,
          newSessionUuid,
          npc.first_appearance_turn,
          npc.relation,
          npc.relation_value,
          npc.notes,
          npc.created_at,
          npc.personality,
          npc.background,
          npc.avatar_path,
          npc.updated_at  // 保持原时间，也可以使用 datetime('now')
        );
        npcIdMap.set(npc.id, result.lastInsertRowid as number);
      }

      // 3.4 复制 dialogues（更新 npcid 映射）
      const insertDialogue = db.prepare(`
        INSERT INTO dialogues (session_id, npcid, turn, speaker, message, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const selectDialogues = db.prepare(`SELECT * FROM dialogues WHERE session_id = ?`);
      const oldDialogues = selectDialogues.all(sessionUuid) as any[];
      for (const dia of oldDialogues) {
        let newNpcId = dia.npcid ? npcIdMap.get(dia.npcid) : null;
        if (dia.npcid && !newNpcId) {
          console.warn(`对话 ID ${dia.id} 引用了不存在的 NPC ID ${dia.npcid}，将设为 NULL`);
        }
        insertDialogue.run(
          newSessionUuid,
          newNpcId || null,
          dia.turn,
          dia.speaker,
          dia.message,
          dia.timestamp
        );
      }

      // 3.5 复制 npc_memories（更新 npcid 映射）
      const insertMemory = db.prepare(`
        INSERT INTO npc_memories (npcid, npc_name, session_id, memory_text, turn, timestamp, importance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const selectMemories = db.prepare(`SELECT * FROM npc_memories WHERE session_id = ?`);
      const oldMemories = selectMemories.all(sessionUuid) as any[];
      for (const mem of oldMemories) {
        const newNpcId = npcIdMap.get(mem.npcid);
        if (!newNpcId) {
          console.warn(`无法找到 NPC ID ${mem.npcid} 的映射，跳过记忆 ID ${mem.id}`);
          continue;
        }
        insertMemory.run(
          newNpcId,
          mem.npc_name,
          newSessionUuid,
          mem.memory_text,
          mem.turn,
          mem.timestamp,
          mem.importance,
          mem.created_at
        );
      }

      // 3.6 复制 summaries 和 key_events
      db.prepare(`
        INSERT INTO summaries (session_id, summary_text, start_dialogue_id, end_dialogue_id, created_at)
        SELECT ?, summary_text, start_dialogue_id, end_dialogue_id, created_at
        FROM summaries WHERE session_id = ?
      `).run(newSessionUuid, sessionUuid);

      db.prepare(`
        INSERT INTO key_events (session_id, event_name, event_description, event_timestamp)
        SELECT ?, event_name, event_description, event_timestamp
        FROM key_events WHERE session_id = ?
      `).run(newSessionUuid, sessionUuid);
    });

    // 执行事务
    transaction();

    return { success: true, sessionUuid: newSessionUuid };
  } catch (error: any) {
    console.error('[IPC] game:duplicateSession error:', error);
    return { success: false, error: error.message };
  }
});

  // 重命名会话
  ipcMain.handle('game:renameSession', async (event, sessionUuid: string, newName: string) => {
    try {
      if (!sessionUuid || !newName) {
        throw new Error('Session UUID and new name are required');
      }
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) {
        throw new Error(`Session ${sessionUuid} not found`);
      }
      models.gameSession.updateSessionName(sessionUuid, newName);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] game:renameSession error:', error);
      return { success: false, error: error.message };
    }
  });
  
    // 删除存档（利用外键 ON DELETE CASCADE，自动清理关联数据）
  ipcMain.handle('game:deleteSession', async (event, sessionUuid: string) => {
    try {
      // 1. 检查会话是否存在
      const session = models.gameSession.getSessionByUuid(sessionUuid);
      if (!session) {
        throw new Error(`Session ${sessionUuid} not found`);
      }

      // 2. 检查是否为最后一个存档（至少保留一个）
      const allSessions = models.gameSession.listSessions(1); // 只需要知道数量
      const count = models.gameSession.listSessions().length; // 获取总数（不限制）
      if (count <= 1) {
        throw new Error('Cannot delete the last session. At least one session must remain.');
      }

      // 3. 执行删除（级联删除自动处理）
      models.gameSession.deleteSession(sessionUuid);

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] game:deleteSession error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('game:getAllNPCsWithMemories', async (event, sessionUuid: string) => {
  try {
    const db = getDb();
    const npcModel = new NPCModel(db);
    const npcMemoryModel = new NPCMemoryModel(db);

    // 获取所有 NPC
    const npcs = npcModel.getNPCsBySession(sessionUuid);
    if (!npcs.length) return { success: true, npcs: [], memories: {} };

    // 并发获取每个 NPC 的记忆
    const memoriesMap: Record<string, any[]> = {};
    await Promise.all(
      npcs.map(async (npc) => {
        const memories = npcMemoryModel.getMemoriesByNPC(sessionUuid, npc.name, 100);
        memoriesMap[npc.name] = memories;
      })
    );

    return { success: true, npcs, memories: memoriesMap };
  } catch (error: any) {
    console.error('[IPC] game:getAllNPCsWithMemories error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game:saveSummary', async (event, sessionUuid: string, startDialogueId: number | null, endDialogueId: number | null, summaryText: string) => {
  try {
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const summaryModel = new SummaryModel(getDb());
    const summaryId = summaryModel.create(sessionUuid, startDialogueId, endDialogueId, summaryText);
    return { success: true, summaryId };
  } catch (error: any) {
    console.error('[IPC] game:saveSummary error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game:getRecentSummaries', async (event, sessionUuid: string, limit: number = 2) => {
  try {
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const summaryModel = new SummaryModel(getDb());
    const summaries = summaryModel.getLatestBySession(sessionUuid, limit);
    return { success: true, summaries };
  } catch (error: any) {
    console.error('[IPC] game:getRecentSummaries error:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('game:deleteAllSummaries', async (event, sessionUuid: string) => {
  try {
    const db = getDb();
    const stmt = db.prepare(`DELETE FROM summaries WHERE session_id = ?`);
    stmt.run(sessionUuid);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:deleteAllSummaries error:', error);
    return { success: false, error: error.message };
  }
});
// 添加关键事件
ipcMain.handle('game:addKeyEvent', async (event, sessionUuid: string, eventName: string, eventDescription: string) => {
  try {
    // 校验会话存在
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    // 校验参数非空
    if (!eventName || eventName.trim().length === 0) throw new Error('事件名称不能为空');
    if (eventDescription && eventDescription.length > 500) throw new Error('事件描述不能超过500字符');
    const keyEventModel = new KeyEventModel(getDb());
    const eventId = keyEventModel.create(sessionUuid, eventName.trim(), eventDescription?.trim() || '');
    return { success: true, eventId };
  } catch (error: any) {
    console.error('[IPC] game:addKeyEvent error:', error);
    return { success: false, error: error.message };
  }
});

// 获取关键事件列表
ipcMain.handle('game:getKeyEvents', async (event, sessionUuid: string, limit?: number) => {
  try {
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const keyEventModel = new KeyEventModel(getDb());
    const events = keyEventModel.getBySession(sessionUuid, limit);
    return { success: true, events };
  } catch (error: any) {
    console.error('[IPC] game:getKeyEvents error:', error);
    return { success: false, error: error.message };
  }
});

// 删除关键事件
ipcMain.handle('game:deleteKeyEvent', async (event, eventId: number) => {
  try {
    const keyEventModel = new KeyEventModel(getDb());
    keyEventModel.delete(eventId);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:deleteKeyEvent error:', error);
    return { success: false, error: error.message };
  }
});

// 更新关键事件（名称和描述）
ipcMain.handle('game:updateKeyEvent', async (event, eventId: number, eventName: string, eventDescription: string) => {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE key_events SET event_name = ?, event_description = ? WHERE id = ?
    `);
    const result = stmt.run(eventName, eventDescription, eventId);
    if (result.changes === 0) throw new Error(`Event ${eventId} not found`);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:updateKeyEvent error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game:getStateSchema', async (event, sessionUuid: string) => {
  const db = getDb();
  const schemaModel = new StateSchemaModel(db);
  const schema = schemaModel.getBySession(sessionUuid);
  return { success: true, schema };
});

ipcMain.handle('game:saveStateSchema', async (event, sessionUuid: string, schema: StateField[]) => {
  try {
    // 基本校验
    for (const field of schema) {
      if (!field.name || !field.type) {
        throw new Error(`Invalid field: ${field.name}`);
      }
    }
    const db = getDb();
    const schemaModel = new StateSchemaModel(db);
    schemaModel.save(sessionUuid, schema);

    // 检查是否已有状态
    const stateModel = new GameStateModel(db);
    const existingState = stateModel.getCurrentState(sessionUuid, 'game');
    if (!existingState) {
      // 根据 Schema 生成初始状态
      const initialState = schemaModel.generateInitialState(schema);
      const stateJson = JSON.stringify(initialState);
      stateModel.appendState(sessionUuid, 'game', stateJson);
      console.log('[Init] 已根据 Schema 生成初始状态');
    }
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:saveStateSchema error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game:getStateGroups', async (event, sessionUuid: string) => {
  try {
    const session = models.gameSession.getSessionByUuid(sessionUuid);
    if (!session) throw new Error(`Session ${sessionUuid} not found`);
    const db = getDb();
    const groupModel = new StateGroupModel(db);
    const groups = groupModel.getBySession(sessionUuid);
    return { success: true, groups };
  } catch (error: any) {
    console.error('[IPC] game:getStateGroups error:', error);
    return { success: false, error: error.message };
  }
});

// 保存会话的状态分组（完全替换）
ipcMain.handle('game:saveStateGroups', async (event, sessionUuid: string, groups: any[]) => {
  try {
    const db = getDb();
    const groupModel = new StateGroupModel(db);
    groupModel.saveGroups(sessionUuid, groups);
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] game:saveStateGroups error:', error);
    return { success: false, error: error.message };
  }
});


}