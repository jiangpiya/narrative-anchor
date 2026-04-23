import { ipcMain } from 'electron';
import type { ChatMessage, Tool, ChatResponse, ToolCall } from '@shared/types/ai';
import { AI_IPC_CHANNEL } from '@shared/types/ai';

// 默认配置
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const REQUEST_TIMEOUT_MS = 60000; // 60 秒

// 清洗设定的系统提示模板（PRD 提供）
const CLEAN_SETTINGS_SYSTEM_PROMPT = `你是一个专业的设定整理助手。请将用户提供的原始设定文本，整理成以下四个章节的 Markdown 文档：

1. 核心设定（世界观、基础规则、地区设定、种族设定）
2. 公共知识（所有 NPC 默认知道）
3. 角色列表（主要角色、能力、关系、背景）
4. 剧情背景（历史、当前冲突）
5. 重要物品/地点
6. 其他（如果有）


要求：
- 每个章节使用二级标题（##）
- 如果是秘密要在标题前注明“【秘密：XXX知晓/无人知晓】”
- 保持原意，提取关键信息，删除冗余
- 使用 Markdown 格式（列表、加粗等）增强可读性
- 如果某章节没有内容，写“无”
- 输出最多仅包含这五个章节，不要添加额外的开头或结尾说明`;

/**
 * 从环境变量或传入参数获取 API 配置
 */
function getApiConfig(customApiKey?: string, customBaseUrl?: string): { apiKey: string; baseUrl: string } {
  const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('API key is required. Set DEEPSEEK_API_KEY in .env or pass apiKey parameter.');
  }
  const baseUrl = customBaseUrl || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;
  return { apiKey, baseUrl };
}

/**
 * 调用 DeepSeek API（OpenAI 兼容）
 */
async function callDeepSeekAPI(
  messages: ChatMessage[],
  tools: Tool[] | undefined,
  apiKey: string,
  baseUrl: string,
  temperature: number = 0.3,
  maxTokens?: number
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestBody: any = {
      model: 'deepseek-chat',
      messages,
      stream: false,
      temperature,
    };
    if (maxTokens) requestBody.max_tokens = maxTokens;
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const url = `${baseUrl}/chat/completions`;
    console.log('[AI] 请求 URL:', url);
    console.log('[AI] 请求体（摘要）:', JSON.stringify(requestBody).slice(0, 200));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      if (response.status === 401) errorMsg = 'Invalid API key. Please check your DeepSeek API key.';
      else if (response.status === 429) errorMsg = 'Rate limit exceeded. Please try again later.';
      else if (response.status >= 500) errorMsg = 'DeepSeek API server error. Please try again later.';
      else {
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch {
          // ignore
        }
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const message = data.choices[0]?.message;
    if (!message) {
      throw new Error('Invalid API response: missing message');
    }

    const content: string | null = message.content || null;
    const toolCalls: ToolCall[] = message.tool_calls || [];

    return { content, toolCalls };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[AI] fetch 详细错误:', error);
    if (error.name === 'AbortError') {
      throw new Error(`AI request timeout after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    // 输出更友好的错误信息
    if (error.code === 'ENOTFOUND') {
      throw new Error(`无法解析 API 域名，请检查网络或 Base URL 配置: ${baseUrl}`);
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`无法连接到 API 服务器，请检查代理或防火墙设置: ${baseUrl}`);
    }
    throw error;
  }
}

/**
 * 注册 AI 聊天 IPC 处理器
 */
export function registerAIHandlers() {
  ipcMain.handle(
    AI_IPC_CHANNEL,
    async (event, messages: ChatMessage[], tools: Tool[] = [], apiKey?: string, baseUrl?: string, temperature?: number) => {
      try {
        const { apiKey: finalApiKey, baseUrl: finalBaseUrl } = getApiConfig(apiKey, baseUrl);
        const result = await callDeepSeekAPI(messages, tools, finalApiKey, finalBaseUrl, temperature ?? 0.7);
        return result;
      } catch (error) {
        console.error('[AI IPC Error]', error);
        throw error;
      }
    }
  );
    // 新增：清洗设定文档处理器
  ipcMain.handle(
    'ai:cleanSettings',
    async (event, rawContent: string, apiKey?: string, baseUrl?: string) => {
      try {
        const { apiKey: finalApiKey, baseUrl: finalBaseUrl } = getApiConfig(apiKey, baseUrl);
        
        // 构造消息：系统提示 + 用户原始内容
        const messages: ChatMessage[] = [
          { role: 'system', content: CLEAN_SETTINGS_SYSTEM_PROMPT },
          { role: 'user', content: rawContent },
        ];
        
        // 调用 AI，设置较大的 max_tokens，不需要 tools
        const result = await callDeepSeekAPI(messages, [], finalApiKey, finalBaseUrl);
        
        if (!result.content) {
          throw new Error('AI returned empty content');
        }
        
        return { markdown: result.content };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Setting cleaning failed: ${message}`);
      }
    }
  );

}

