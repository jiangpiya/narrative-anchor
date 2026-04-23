// ============================================
// AI 清洗接口类型
// ============================================

/**
 * 清洗设定文档的请求参数
 */
export interface CleanSettingsRequest {
  rawContent: string;   // 原始未整理的设定文本
  apiKey?: string;      // 可选，覆盖环境变量
  baseUrl?: string;     // 可选，覆盖环境变量
}

/**
 * 清洗设定文档的响应结果
 */
export interface CleanSettingsResponse {
  markdown: string;     // 整理后的 Markdown 文本（包含四个章节）
}


// ============================================
// AI 相关 IPC 通道类型定义
// 遵循 OpenAI Function Calling 规范
// ============================================

/**
 * OpenAI 工具调用中的函数定义
 */
export interface ToolFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * 工具定义（符合 OpenAI 格式）
 */
export interface Tool {
  type: 'function';
  function: ToolFunction;
}

/**
 * 工具调用实例
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON 字符串
  };
}

/**
 * 聊天消息（OpenAI 格式）
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * 聊天请求参数（渲染进程传入）
 */
export interface ChatRequest {
  messages: ChatMessage[];
  tools?: Tool[];
  apiKey?: string;   // 可选，优先级高于环境变量
  baseUrl?: string;  // 可选，默认 https://api.deepseek.com
}

/**
 * 聊天响应（主进程返回）
 */
export interface ChatResponse {
  content: string | null;
  toolCalls: ToolCall[];
}

// ============================================
// IPC 通道常量
// ============================================
export const AI_IPC_CHANNEL = 'ai:chat';

// ============================================
// 工具定义（用于 AI Function Calling）
// ============================================

/**
 * 更新游戏状态工具
 * 允许 AI 修改任意游戏状态字段
 */
export const UPDATE_GAME_STATE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'update_game_state',
    description: '更新游戏状态，可以修改任意字段。当出现新NPC时，必须使用new_npcs字段创建；当有重要互动时，使用memory_updates记录记忆。',
    parameters: {
      type: 'object',
      properties: {
        new_npcs: {
          type: 'array',
          description: '新出现的NPC列表，每个NPC需包含name, relation, relationValue, notes',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              relation: { type: 'string' },
              relationValue: { type: 'number' },
              notes: { type: 'string' }
            },
            required: ['name']
          }
        },
        memory_updates: {
          type: 'array',
          description: '需要为NPC记录的记忆',
          items: {
            type: 'object',
            properties: {
              npc_name: { type: 'string' },
              memory_text: { type: 'string' },
              important: { type: 'integer', minimum: 1, maximum: 10, default: 1 }
            },
            required: ['npc_name', 'memory_text'] as string[],
          }
        }
      },
      additionalProperties: true
    }
  }
}as const;

/**
 * 建议动作工具
 * 为玩家提供下一步可执行的动作列表
 */
export const SUGGEST_ACTIONS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'suggest_actions',
    description: '向玩家推荐接下来可执行的动作列表，用于引导玩家。',
    parameters: {
      type: 'object' as const,
      properties: {
        actions: {
          type: 'array',
          items: { type: 'string' },
          description: '推荐的动作列表，例如 ["打开门", "与NPC对话", "检查物品"]',
        },
      },
      required: ['actions'] as string[],
    },
  },
}as const;

// 更新 NPC 属性工具
export const UPDATE_NPC_TOOL = {
  type: 'function' as const,
  function: {
    name: 'update_npc',
    description: '更新已存在的 NPC 的关系描述或好感度。如果 NPC 不存在，请先使用 new_npcs 创建。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'NPC 名称（必须与已有 NPC 完全一致）' },
        relation: { type: 'string', description: '新的关系描述（如 “朋友”、“敌人”），可选' },
        relationValue: { type: 'number', description: '新的好感度数值（-100 到 100），可选' },
      },
      required: ['name'] as string[],
    },
  },
}as const;

// 所有工具的数组，便于一次性传入
export const GAME_TOOLS = [UPDATE_GAME_STATE_TOOL, SUGGEST_ACTIONS_TOOL, UPDATE_NPC_TOOL];