import { DEFAULT_GAME_STATE } from '@shared/types/store';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import merge from 'lodash/merge';
import type { Message, GameState } from '@shared/types/store';
import type { ToolCall } from '@shared/types/ai';
import { GAME_TOOLS } from '@shared/types/ai';
import { gameService } from '../services/gameService';
import { aiService } from '../services/aiService';
import type { ChatMessage, Tool, ChatResponse } from '@shared/types/ai';
import { useSettingsStore } from './settings';
import { extractMentionedNPCs } from '../utils/npcNameExtractor';
import { RecentNPCsTracker } from '../utils/npcNameExtractor';
import { checkAndGenerateSummary } from '../services/memoryService';
import { audioService  } from '../services/audioService';

let recentNPCsTracker: RecentNPCsTracker | null = null;
function getTracker() {
  if (!recentNPCsTracker) {
    recentNPCsTracker = new RecentNPCsTracker(10);
  }
  return recentNPCsTracker;
}

export const useGameSessionStore = defineStore('gameSession', () => {
  // State
  const currentAgentStep = ref<string>('');
  const currentSessionId = ref<string | null>(null);
  const currentState = ref<GameState | null>(null);
  const messages = ref<Message[]>([]);
  const turnNumber = ref(0);
  const isLoading = ref(false);
  const suggestedOptions = ref<string[]>([]); // 新增：当前可用的建议选项列表

  // Getters
  const lastMessage = () => messages.value[messages.value.length - 1];
  function clearSuggestedOptions() {
    suggestedOptions.value = [];
  }

  function setAgentStep(step: string) {
    currentAgentStep.value = step;
  }

// ========== 辅助函数：调用结构化代理 ==========

// 辅助函数：清理 JSON 字符串中的非法控制字符
async function callReplyAndSuggestAgent(
  userInput: string,
  currentState: GameState | null,
  recentMessages: Message[],
  coreSettingsContent: string,
  sessionId: string
): Promise<{ reply: string; actions: string[] }> {
  // ========== 1. 获取 NPC 列表 ==========
  let allNPCs: Array<{ name: string }> = [];
  try {
    const npcResult = await gameService.getNPCsBySession({ sessionUuid: sessionId });
    if (npcResult.success && npcResult.npcs) {
      allNPCs = npcResult.npcs;
    }
  } catch (err) {
    console.warn('[NPC] 获取 NPC 列表失败:', err);
  }

  // ========== 2. 提取提及的 NPC ==========
  const mentionedNPCNames = extractMentionedNPCs(userInput, allNPCs);

  // ========== 3. 构建 NPC 知识边界章节 ==========
  let npcKnowledgeSection = '';
  if (mentionedNPCNames.length > 0) {
    const npcKnowledgeParts = ['## NPC 知识边界\n以下信息是 NPC 根据其经历所知道的内容，NPC 的对话和行为必须严格基于此知识边界，不能超出。\n'];
    for (const npc_name of mentionedNPCNames) {
      let memories: any[] = [];
      try {
        const memResult = await gameService.getNPCMemories({
          sessionUuid: sessionId,
          npc_name: npc_name,
          limit: 50,
        });
        if (memResult.success && memResult.memories) {
          memories = memResult.memories;
        }
      } catch (err) {
        console.warn(`[NPC] 获取 ${npc_name} 记忆失败:`, err);
      }
      memories.sort((a, b) => (b.importance || b.turn) - (a.importance || a.turn));
      const topMemories = memories.slice(0, 10);
      if (topMemories.length === 0) continue;
      const memoryLines = topMemories.map(m => `- 知道：${m.memory_text}（来源：第${m.turn}幕）`).join('\n');
      npcKnowledgeParts.push(`### ${npc_name}\n${memoryLines}\n`);
    }
    if (npcKnowledgeParts.length > 1) {
      npcKnowledgeParts.push('在生成 NPC 的对话和行为时，必须严格基于上述“NPC 知识边界”中的信息，不能编造 NPC 不知道的内容。');
      npcKnowledgeSection = npcKnowledgeParts.join('\n');
    }
  }

  // ========== 4. 获取剧情摘要（最近 1 条） ==========
  let summarySection = '';
  try {
    const summaryRes = await window.electronAPI.game.getRecentSummaries(sessionId, 1);
    if (summaryRes.success && summaryRes.summaries && summaryRes.summaries.length > 0) {
      const latestSummary = summaryRes.summaries[0];
      summarySection = `## 📝 剧情摘要\n${latestSummary.summary_text}\n\n`;
    }
  } catch (err) {
    console.warn('[摘要] 获取失败:', err);
  }

  // ========== 5. 获取关键事件（最多 10 条） ==========
  let keyEventsSection = '';
  try {
    const keyEventsRes = await window.electronAPI.game.getKeyEvents(sessionId, 10);
    if (keyEventsRes.success && keyEventsRes.events && keyEventsRes.events.length > 0) {
      const events = keyEventsRes.events;
      const eventLines = events.map(evt => {
        return `- ${evt.event_name}：${evt.event_description || '（无描述）'}（发生于 ${new Date(evt.event_timestamp).toLocaleString()}）`;
      }).join('\n');
      keyEventsSection = ``;
    }
  } catch (err) {
    console.warn('[关键事件] 获取失败:', err);
  }

  // ========== 6. 构建系统提示（按顺序：核心设定 → 摘要 → 关键事件 → NPC 知识边界） ==========
  let systemPrompt = `你是游戏叙述者。请严格遵循以下核心设定：\n${coreSettingsContent || '（无额外设定）'}\n\n`;
  if (summarySection) {
    systemPrompt += summarySection;
  }
  if (keyEventsSection) {
    systemPrompt += keyEventsSection;
  }
  if (npcKnowledgeSection) {
    systemPrompt += npcKnowledgeSection + '\n\n';
  }
  systemPrompt += `# 游戏核心原则

1. **能力系统**：采用合理克制关系与去数值化的能力体系，强调角色特质与剧情逻辑。
2. **战斗设计**：限制较少，但必须符合角色能力、剧情发展与故事背景，确保爽点与合理性。
3. **NPC 行为**：行为真实，不强行推动剧情；控制非必要 NPC 出场频率。
4. **游戏流程**：流程足够长，覆盖各大陆与城邦，展现多样风土人情。
5. **剧情驱动**：遵循黑格尔辩证法，由内部矛盾而非外部威胁推动故事发展。
6. **剧情质量**：跌宕起伏且逻辑自洽；包含精彩战斗场景，提供爽快体验。
7. **结局机制**：主角死亡或内容结束即游戏结束。
8. **建议机制**: 为玩家提供动作建议，给玩家更好的体验。
9.【非常重要】无论如何，每次对话都提供【必须】提供2-5个可选动作（按照下文的JSON格式输出），即使玩家没有明确要求，这个是最重要的。

3. NPC 扮演规则：
你（AI）作为游戏主持人，拥有全部世界观设定（包括秘密信息），以便合理推进剧情。
但在扮演 任何 NPC 时，必须严格区分“你知道”和“这个 NPC 知道”。
NPC 知识范围
NPC 默认只知晓以下两类信息：
公共常识（设定中明确标注为“公共知识”的部分）。
该 NPC 的记忆列表中已经存在的事件或秘密。
禁止行为：
如果一个信息是秘密（例如组织真实目的、主角身世等），且未出现在当前 NPC 的记忆列表中，则该 NPC 绝对不能：提及、暗示或表现出知道该秘密。
即使剧情需要，NPC 也必须保持“无知”，除非主角主动告知或 NPC 亲眼目睹。
不确定时处理
如果你不确定某个 NPC 是否应该知道某个信息，请假设他不知道，并让他在对话中表现出合理的疑惑。
请严格按照以上规则生成回复与动作选项。

# 每轮对话任务
根据用户输入和当前游戏状态，一次完成以下事务：
生成一段自然的叙事回复。可自然暗示状态变化，不显式说明技术细节。日常交流 ≤ 560 字；重要信息 ≤ 1000 字。避免大段独白；复杂情节可拆分为多轮对话或由旁白叙述，并用“状态变化：”标注游戏状态有哪些变化。
提供 2-6 个玩家接下来可采取的动作选项。
   - 输出格式为 JSON：
     {"reply": "叙事回复内容","actions": ["探索深处", "寻找食物", "返回村庄"]}
reply为叙事回复内容。actions为玩家可采取的可选动作（不能为空）。两个都必须提供。
【非常重要】无论玩家偏好如何，每次对话都提供【必须】提供2-5个JSON格式的动作选项。

`;

  // 5. 构建消息列表
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: `当前状态：${JSON.stringify(currentState || {}, null, 2)}\n用户输入：${userInput},给出游戏内容回复和行动建议（必须包含reply和actions字段）`,
    },
  ] as ChatMessage[];
  const response = await aiService.chat(messages, [], 0.6);
  const content = response.content;
  if (!content) return { reply: '（AI 没有返回内容）', actions: [] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      reply: parsed.reply || '（AI 没有返回内容）',
      actions: parsed.actions || [],
    };
  } catch (err) {
    console.error('解析回复和建议失败:', content, err);
    return { reply: response.content || '（AI 没有返回内容）', actions: [] }; // 降级：如果解析失败，直接返回原始内容
  }
  
}

// ========== 2. 状态更新代理（从回复中推断状态变化） ==========
/*async function callStateAndNPCAgent(
  finalReply: string,
  currentState: GameState | null,
  coreSettingsContent: string
): Promise<any> {
  const systemPrompt = `你是游戏状态管理器。请严格遵循以下核心设定：
${coreSettingsContent || '（无额外设定）'}

根据叙述者生成的回复内容，推断游戏状态应该发生的变化。回复内容：${finalReply}
当前状态：${JSON.stringify(currentState || {}, null, 2)}
只输出一个 JSON 对象，格式为 { "stateDelta": { ... } }，不要包含任何其他文字。
如果没有任何状态变化，输出 {}。`;
  const messages: ChatMessage[] = [{ role: 'user', content: systemPrompt }];
  const response = await aiService.chat(messages, [], undefined, undefined, 0.2);
  const content = response.content;
  if (!content) return {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (err) {
    console.error('解析状态更新失败:', content, err);
    return {};
  }
}
*/

// ========== 3. NPC & 记忆代理（基于回复和状态变化） ==========
async function callStateAndNPCAgent(
  finalReply: string,
  currentState: GameState | null,
  existingNPCs: string[],
  coreSettingsContent: string
): Promise<{ stateDelta: any; new_npcs: any[]; memory_updates: any[]; __audio?: { bgm?: string; ambient?: string } }> {
  console.log('[Agent] callStateAndNPCAgent 输入:', {
    finalReply,
    currentState,
    existingNPCs,
    coreSettingsContentLength: coreSettingsContent?.length,
  });
  const systemPrompt = `你是游戏状态和 NPC 管理器。请严格遵循以下核心设定：
${coreSettingsContent || '（无额外设定）'}

根据叙述者回复，推断游戏状态应该发生的变化，并决定需要创建哪些新 NPC，或为哪些 NPC 添加记忆。
叙述者回复：${finalReply}
当前状态：${JSON.stringify(currentState)}
已有 NPC 名称列表：${existingNPCs.join(', ')}
更新状态是为了让游戏更有趣和合理，而不是为了机械地追求状态变化。注意除非剧情需要，否则相关的技能或者称号不能删去。
如果要添加一个未创建的NPC的记忆，【必须】先创建该NPC，再添加记忆。
创建npc时notes中要标明角色的性格、爱好等信息，并用【】标记，比如【性格：睿智】【爱好：魔法】，以方便后续AI扮演时使用。
音频控制
你可以通过额外输出一个 __audio 字段来切换背景音乐和环境音效，格式如下：
{
  "stateDelta": { ... },
  "new_npcs": [...],
  "memory_updates": [...],
  "__audio": {
    "bgm": "game",        // 可选值: 'game', 'menu', 'boss', 'peaceful', 'tense' 等
    "ambient": "forest"   // 可选值: 'forest', 'dungeon', 'village', 'cave' 等
  }
}
  **bgm（背景音乐）可选值：**
- "game"    → 游戏默认背景音乐（冒险/探索风格）
- "menu"    → 菜单/存档管理界面音乐（舒缓风格）
- "boss"    → 战斗/BOSS 战音乐（紧张激昂）
- "village" → 在村庄的音乐（宁静放松）
- "city"    → 在现代城市的音乐（爵士风格）
- "urba"    → 在中世纪城市/城镇的音乐（热闹繁华）
- "tense"   → 紧张/悬疑场景音乐（压抑不安，尽量少用，不要打断其他bgm）

**ambient（环境音效）可选值：**
- "forest"  → 森林环境音（鸟鸣、树叶沙沙）
- "dungeon" → 地牢环境音（阴风声）
- "village" → 村庄环境音（人声、牲畜声）
- "city"    → 城市环境音（嘈杂人声、汽车声）
- "night"   → 夜晚环境音（昆虫声）
- "train"   → 火车环境音（火车轨道声）
- "heartbeat"   → 心跳环境音（心跳声，可以用于多种场景）
- "cave"    → 洞穴环境音（回声、水滴）
- bgm 用于切换背景音乐，不写则保持不变。
- ambient 用于切换环境音效，不写则保持不变。
- 如果不需要切换音频，可以省略 __audio 字段。

输出 JSON 对象，格式如下：
{
  "stateDelta": { ... },        // 需要变更的状态字段，无变化时输出 {}，所有状态都不需要详细列出，比如：健康/略有受伤/重伤。精神状态：稳定。！不能写一大堆！
  "new_npcs": [                 // 新 NPC 列表，每个包含 name, relation, relationValue, notes
    { "name": "Gandalf", "relation": "friend", "relationValue": 80, "notes": "Wizard" }
  ],
  "memory_updates": [           // 记忆更新列表，每个包含 npc_name, memory_text, importance（可选，1-10）
    { "npc_name": "Gandalf", "memory_text": "Said he would help us", "importance": 5 }
  ],
  "__audio": {                  // 可选，音频切换指令
    "bgm": "boss",
    "ambient": "dungeon"
  }
}

注意：
【重要】bgm和音效不能频繁更换，除非场景切换导致不得不换bgm或者音效，否则不要切换。bgm和音效不是必填的，如果不要切换就不填此项。
【重要】状态文本必须简短，单个描述内容不能超过6个字。skills是战斗用的技能，不要随意修改。不要再“（）”添加大量内容，最好用非常简单的话语概括性描述，游戏状态只是玩家面板，不是用来记录剧情的。
【重要】不要创建【已有 NPC 名称列表】存在的 NPC。如果某个列表为空，可以省略该字段。
【重要】如果先前未赋予准确名字的 NPC 已经在对话中出现过（无论是否有名字），后续赋予名字时应当调用 updateNPC 修改原有 NPC 的 name 字段，而不是创建新 NPC。
【重要】输出必须是合法的 JSON 对象，字符串内的换行符必须转义为 \\n，不能包含未转义的控制字符。`;

  const messages: ChatMessage[] = [{ role: 'user', content: systemPrompt }];
  const response = await aiService.chat(messages, [], 0.2);
  const content = response.content;
  if (!content) return { stateDelta: {}, new_npcs: [], memory_updates: [] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const result = JSON.parse(jsonMatch[0]);
    return {
      stateDelta: result.stateDelta || {},
      new_npcs: result.new_npcs || [],
      memory_updates: result.memory_updates || [],
      __audio: result.__audio,   // 透传音频指令
    };
  } catch (err) {
    console.error('解析 NPC 代理失败:', content, err);
    return { stateDelta: {}, new_npcs: [], memory_updates: [] };
  }
}

/*
// ========== 4. 建议动作代理（基于最终状态） ==========
async function callSuggestAgent(
  finalState: GameState,
  coreSettingsContent: string
): Promise<string[]> {
  const systemPrompt = `你是游戏建议生成器。请严格遵循以下核心设定：
${coreSettingsContent || '（无额外设定）'}

根据当前游戏状态，提供 2-4 个玩家接下来可采取的动作选项。
输出 JSON 对象：{ "actions": ["动作1", "动作2", ...] }。
只输出 JSON，不要其他内容。动作描述应简短且符合核心设定。`;
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `当前状态：${JSON.stringify(finalState, null, 2)}` },
  ];
  const response = await aiService.chat(messages, [], undefined, undefined, 0.3);
  const content = response.content;
  if (!content) return [];
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const result = JSON.parse(jsonMatch[0]);
    return result.actions || [];
  } catch (err) {
    console.error('解析建议动作失败:', content, err);
    return [];
  }
}
*/

// ========== 辅助：获取当前会话已有 NPC 名称 ==========
async function getExistingNPCNames(sessionUuid: string): Promise<string[]> {
  try {
    const result = await window.electronAPI.game.getNPCsBySession({ sessionUuid });
    if (result.success && result.npcs) {
      return result.npcs.map((npc: any) => npc.name);
    }
  } catch (err) {
    console.warn('获取已有 NPC 列表失败:', err);
  }
  return [];
}

  // ========== 辅助函数 ==========
/**
 * 构建系统提示词
 * @param state 当前游戏状态
 * @param recentMessages 最近 N 条对话
 * @param coreSettingsContent 核心设定内容（Markdown 格式）
 * @returns 系统提示字符串
 */
//-----------已弃用-------------
function buildSystemPrompt(
  state: GameState | null,
  recentMessages: Message[],
  coreSettingsContent: string
): string {
  const stateJson = state ? JSON.stringify(state, null, 2) : '{}';
  const recentDialogues = recentMessages
    .map(msg => `${msg.role === 'user' ? '用户' : '助理'}: ${msg.content}`)
    .join('\n');

  let systemPrompt = '你是游戏叙述者。';

  if (coreSettingsContent && coreSettingsContent.trim()) {
    systemPrompt += `\n\n以下是本游戏的核心设定，请严格遵守：\n${coreSettingsContent}\n`;
  }
  systemPrompt += `\n\n【严格指令】在每一次回复中，你都必须同时完成以下两件事：
1. 根据情况更新游戏状态（如果需要），调用 update_game_state。
2. **始终**调用 suggest_actions 工具，提供 2-4 个玩家接下来可采取的行动选项。

即使你认为当前没有状态更新，也必须提供建议选项。如果没有任何状态变化，只需调用 suggest_actions 即可。`;

// 示例说明（可选，帮助模型理解）
systemPrompt += `\n示例：用户说“我走进森林”。你应该返回：
- update_game_state: { location: "森林" }
- suggest_actions: { actions: ["探索深处", "寻找食物", "返回村庄"] }`;
  systemPrompt += `

当前游戏状态：
${stateJson}

最近对话：
${recentDialogues}

请根据用户输入推进剧情，必要时调用 update_game_state 工具。

！！非常重要！！：无论你是否调用了工具，都必须用自然语言回复用户，有趣并沉浸式地回复用户，适当发挥想象力，不要太过死板出戏，比如：'已根据你的指令更新游戏状态。'这种就特别地破坏沉浸感，可以尝试"因为你的祈求，神明回应了你，你捡到了100元"。不要只返回工具调用而不说话。每次对话必须给出建议选项，除非你认为没有任何建议选项是合理的（但这种情况应该极其罕见）。如果没有合理的建议选项，请至少给出一个模糊的提示，暗示玩家可以做什么。建议选项应该是玩家在当前情境下可以合理选择的行动，比如"探索森林"、"与NPC对话"、"查看背包"等，而不是模糊或过于宽泛的选项如"继续前进"。建议选项应该具体且具有可操作性，帮助玩家理解他们可以如何与游戏世界互动。
**重要：NPC 管理规则（必须遵守）**
- 当剧情中出现新NPC（无论用户是否明确要求创建），你**必须**在同一个回复中调用 update_game_state 工具，并在参数中包含 new_npcs 字段。
- 不要只在文本中描述新NPC，必须通过工具创建，否则玩家将无法与NPC互动。
- 示例：如果用户说“我遇到了一个名叫 Gandalf 的巫师”，你必须返回：
  {
    "new_npcs": [{"name": "Gandalf", "relation": "neutral", "relationValue": 0, "notes": "Wizard"}]
  }并进行文字描述。
  NPC记忆添加的格式为：{ "memory_updates": [{ "npc_name": "NPC名称", "memory_text": "记忆内容" ,"importance": '重要等級1到10，一般的记忆为1' }] }
  你可以使用以下工具：
- update_game_state: 更新游戏状态（如位置、金币等），也可以在此工具中通过 new_npcs 创建新 NPC，通过 memory_updates 记录记忆。
- update_npc: 更新已存在的 NPC 的关系或好感度。不要使用 new_npcs 来更新已有 NPC。
- suggest_actions: 向玩家推荐行动。
- 即使没有其他状态更新，也要包含一个空对象或保持原有状态字段不变。
- 当你为NPC记录记忆时，必须使用 memory_updates 字段。
请在所有操作完成后，再与用户对话，并用可见的文本中描述发生的事件和变化，确保玩家能够理解当前的游戏状况和可选的行动。
`;
  return systemPrompt;
}
  /**
   * 从消息列表构建 AI 消息数组（不含系统提示）
   * @param messages 消息列表
   * @returns ChatMessage 数组
   */
  function buildMessagesForAI(messages: Message[]): ChatMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
//----------------------------------------------------------

  //
  /**
   * 执行工具调用
   * @param toolCalls AI 返回的工具调用列表
   * @returns 是否发生了状态变更
   */
    async function executeToolCalls(toolCalls: ToolCall[]): Promise<boolean> {
    let stateChanged = false;
    let newState = currentState.value ? JSON.parse(JSON.stringify(currentState.value)) : {};

    // 用于收集所有需要创建的 NPC 和记忆
    const allNewNPCs: Array<{
      name: string;
      relation?: string;
      relationValue?: number;
      notes?: string;
    }> = [];
    const allMemoryUpdates: Array<{
      npc_name: string;
      memory_text: string;
    }> = [];

    for (const toolCall of toolCalls) {
        const { name, arguments: argsStr } = toolCall.function;
        try {
        const args = JSON.parse(argsStr);
        if (name === 'update_game_state') {
          // 提取 new_npcs 和 memory_updates
            if (args.new_npcs && Array.isArray(args.new_npcs)) {
          allNewNPCs.push(...args.new_npcs);
        }
        if (args.memory_updates && Array.isArray(args.memory_updates)) {
          allMemoryUpdates.push(...args.memory_updates);
        }
        // 剥离特殊字段，剩余的是普通状态字段
        const { new_npcs, memory_updates, __audio, ...stateDelta } = args;
          // ========== 处理音频切换指令 ==========
  if (__audio) {
  // 仅当 bgm 为非空字符串时才切换
  if (__audio.bgm && typeof __audio.bgm === 'string' && __audio.bgm.trim() !== '') {
    switch (__audio.bgm) {
      case 'game':
        audioService.playBGM('game');
        break;
      case 'menu':
        audioService.playBGM('menu');
        break;
      default:
        audioService.playCustomBGM(__audio.bgm);
        break;
    }
  }
  // 仅当 ambient 为非空字符串时才切换
  if (__audio.ambient && typeof __audio.ambient === 'string' && __audio.ambient.trim() !== '') {
    audioService.playAmbientByLocation(__audio.ambient);
  }
}
        // 合并普通状态
        if (Object.keys(stateDelta).length > 0) {
          merge(newState, stateDelta);
          stateChanged = true;
          console.log('[Game] 状态变更:', stateDelta);
        }
      } else if (name === 'update_npc') {
        // 处理 NPC 属性更新
        const { name: npc_name, relation, relationValue } = args;
        if (!npc_name) {
          console.warn('[Game] update_npc 缺少 name 字段');
          continue;
        }
        try {
          await window.electronAPI.game.updateNPCRelation({
            sessionUuid: currentSessionId.value!,
            name: npc_name,
            relation,
            relationValue,
          });
          console.log(`[Game] 更新 NPC ${npc_name}: relation=${relation}, value=${relationValue}`);
        } catch (err) {
          console.error(`[Game] 更新 NPC ${npc_name} 失败:`, err);
        }
      } else if (name === 'suggest_actions') {
        if (args.actions && Array.isArray(args.actions)) {
          console.log('[Game] 建议动作:', args.actions);
        }
      } else {
        console.warn(`[Game] 未知工具调用: ${name}`);
      }
    } catch (err) {
      console.error(`[Game] 解析工具调用参数失败: ${name}`, argsStr, err);
    }
  }

  // 添加如下日志：

  if (allNewNPCs.length > 0 && currentSessionId.value) {
    console.log('[NPC Debug] 当前会话 ID:', currentSessionId.value);
    console.log('[NPC Debug] 待创建 NPC 列表:', JSON.stringify(allNewNPCs, null, 2));
    
    // 去重（可选，但保留）
    const uniqueNPCs = new Map<string, typeof allNewNPCs[0]>();
    for (const npc of allNewNPCs) {
      if (!uniqueNPCs.has(npc.name)) {
        uniqueNPCs.set(npc.name, npc);
      }
    }
    // 创建或更新每个 NPC
    for (const npc of uniqueNPCs.values()) {
      console.log(`[NPC Debug] 开始创建 NPC: ${npc.name}`);
      try {
        // 先检查是否已存在
        const existingNPCs = await window.electronAPI.game.getNPCsBySession({
          sessionUuid: currentSessionId.value,
        });
        const existing = existingNPCs.success ? existingNPCs.npcs?.find((n: any) => n.name === npc.name) : null;
        if (existing) {
          // NPC 已存在，如果提供了 relation 或 relationValue，则更新
          if (npc.relation !== undefined || npc.relationValue !== undefined) {
            await window.electronAPI.game.updateNPCRelation({
              sessionUuid: currentSessionId.value,
              name: npc.name,
              relation: npc.relation,
              relationValue: npc.relationValue,
            });
            console.log(`[Game] NPC ${npc.name} 已存在，已更新属性`);
          } else {
            console.log(`[Game] NPC ${npc.name} 已存在，无更新内容，跳过`);
          }
        } else {
          // 不存在，创建新 NPC
          await window.electronAPI.game.createNPC({sessionUuid: currentSessionId.value,
            name: npc.name,
            firstAppearanceTurn: turnNumber.value,
            relation: npc.relation || 'neutral',
            relationValue: npc.relationValue ?? 0,
            notes: npc.notes || '',
          });
          console.log(`[Game] 创建 NPC: ${npc.name}`);
        }
      } catch (err: any) {
        // 如果还是因为唯一约束失败（极少数情况），尝试更新
        if (err.message?.includes('already exists')) {
          console.log(`[Game] NPC ${npc.name} 已存在（检测到约束），尝试更新`);
          try {
            await window.electronAPI.game.updateNPCRelation({
              sessionUuid: currentSessionId.value,
              name: npc.name,
              relation: npc.relation,
              relationValue: npc.relationValue,
            });
          } catch (updateErr) {
            console.error(`[Game] 更新 NPC ${npc.name} 也失败:`, updateErr);
          }
        } else {
          console.error(`[Game] 处理 NPC ${npc.name} 失败:`, err);
        }
      }
    }
  }
  
   // 处理记忆添加
  if (allMemoryUpdates.length > 0 && currentSessionId.value) {
    for (const mem of allMemoryUpdates) {
      if (!mem.npc_name) {
        console.warn('[Game] memory_updates 缺少 npc_name，跳过:', mem);
        continue;
      }
      try {
        await window.electronAPI.game.addNPCMemory({
          sessionUuid: currentSessionId.value,
          npc_name: mem.npc_name,
          memoryText: mem.memory_text,
          turn: turnNumber.value,
          timestamp: Date.now(),
        });
        console.log(`[Game] 为 NPC ${mem.npc_name} 添加记忆: ${mem.memory_text}`);
      } catch (err) {
        console.error(`[Game] 为 NPC ${mem.npc_name} 添加记忆失败:`, err);
      }
    }
  }

 // 保存状态（如果发生了变化）
  if (stateChanged && currentSessionId.value) {
    const serializableState = JSON.parse(JSON.stringify(newState));
    console.log('[Store] 准备保存状态:', serializableState);
    const result = await gameService.updateState({
      sessionUuid: currentSessionId.value,
      stateKey: 'game',
      stateDelta: serializableState,
    });
    console.log('[Store] updateState 结果:', result);
    if (result.success) {
      currentState.value = newState;
    } else {
      console.error('[Store] 状态保存失败:', result.error);
    }
  }

  return stateChanged;
}
  // ========== Actions ==========
  /**
   * 加载会话（从后端拉取状态和对话历史）
   */
    async function loadSession(sessionId: string) {
    console.log(`[Store] 开始加载会话: ${sessionId}`);
    try {
        // 清空当前数据
        messages.value = [];
        currentState.value = null;
        recentNPCsTracker = new RecentNPCsTracker(10);

        // 1. 获取状态
        const stateResult = await gameService.getCurrentState({
        sessionUuid: sessionId,
        stateKey: 'game',
        });
        console.log('[Store] getCurrentState 返回:', stateResult);

        // 2. 判断是否存在状态
        // 注意：success 为 true 且 data 不为 null/undefined 时表示有状态
        const hasState = stateResult.success && stateResult.data !== null && stateResult.data !== undefined;
        
        if (hasState) {
        // 有状态，直接使用
        let stateObj = stateResult.data;
        if (typeof stateObj === 'string') {
            try {
            stateObj = JSON.parse(stateObj);
            } catch (e) {
            console.error('解析状态字符串失败:', e);
            stateObj = {};
            }
        }
        currentState.value = stateObj;
        console.log('[Store] 已加载已有状态:', currentState.value);
        } else {
        // 无状态，初始化默认状态
        console.log('[Store] 未找到状态，初始化默认状态');
        await gameService.updateState({
            sessionUuid: sessionId,
            stateKey: 'game',
            stateDelta: DEFAULT_GAME_STATE,
        });
        // 重新获取
        const newStateResult = await gameService.getCurrentState({
            sessionUuid: sessionId,
            stateKey: 'game',
        });
        if (newStateResult.success && newStateResult.data) {
            currentState.value = newStateResult.data;
        } else {
            currentState.value = { ...DEFAULT_GAME_STATE };
        }
        console.log('[Store] 默认状态已写入:', currentState.value);
        }

        // 3. 加载对话历史
        const dialoguesResult = await gameService.getRecentDialogues({
        sessionUuid: sessionId,
        limit: 200,
        });
        console.log('[Store] 对话历史数量:', (dialoguesResult as any).data?.length || 0);
        if (dialoguesResult.success && dialoguesResult.data) {
          // 关键修复：按时间戳升序排序（从旧到新）
      const sortedDialogues = [...dialoguesResult.data].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timeA - timeB;
    });
        messages.value = sortedDialogues.map((d, idx) => ({
            role: d.speaker === 'player' ? 'user' : 'assistant',
            content: d.message,
            turn: idx + 1,
            timestamp: new Date(d.timestamp).getTime(),
        }));
        turnNumber.value = messages.value.length;
        } else {
        messages.value = [];
        turnNumber.value = 0;
        }

        currentSessionId.value = sessionId;
        localStorage.setItem('currentSessionId', sessionId);
        console.log(`[Store] 会话加载完成: ${sessionId}`);
    } catch (error) {
        console.error('[Store] 加载会话失败:', error);
        currentSessionId.value = null;
        localStorage.removeItem('currentSessionId');
        throw error;
    }
    }
  /**
   * 本地更新状态并同步到后端（用于不经过 AI 的手动更新）
   */

  async function sendMessage(userInput: string) {
    if (!currentSessionId.value) throw new Error('没有活动会话，请先选择或创建存档');
    if (isLoading.value) return;
    isLoading.value = true;
    clearSuggestedOptions();

    const originalMessages = [...messages.value];
    const originalTurn = turnNumber.value;
    const settingsStore = useSettingsStore();
    const coreContent = settingsStore.coreSettingsContent;

    try {
      // 乐观添加用户消息
      const userMessage: Message = {
        role: 'user',
        content: userInput,
        turn: turnNumber.value + 1,
        timestamp: Date.now(),
      };
      messages.value.push(userMessage);
      turnNumber.value++;

      
      
    // 准备最近对话历史（不包含刚添加的用户消息，因为我们将单独传入）
    const historyMessages = messages.value.slice(0, -1);
    const recentMessages = historyMessages.slice(-6); // 最近6条
    const userMessageTurn = turnNumber.value; // 此时 turnNumber 是用户消息的轮次（因为之前已 ++）
    // 1. 回复代理（先生成自然语言回复）
    setAgentStep('生成回复中');
    const { reply: finalReply, actions } = await callReplyAndSuggestAgent(
      userInput,
      currentState.value,
      recentMessages,
      coreContent,
      currentSessionId.value
    );
    console.log('[Agent] 最终回复:', finalReply);
    console.log('[Agent] 建议选项:', actions);
    suggestedOptions.value = actions;

 // 立即显示回复和建议按钮
    const assistantTurn = turnNumber.value + 1;
const assistantMessage: Message = {
  role: 'assistant',
  content: finalReply,
  turn: assistantTurn,
  timestamp: Date.now(),
};
messages.value.push(assistantMessage);
turnNumber.value = assistantTurn; // 更新 turnNumber 为助理消息的轮次

        // 异步保存用户和助理对话（可选，不阻塞）
    gameService.addDialogue({
  sessionUuid: currentSessionId.value,
  speaker: 'player',
  message: userInput,
  turn: userMessageTurn, // 用户消息的轮次
}).catch(err => console.error('保存用户对话失败:', err));

gameService.addDialogue({
  sessionUuid: currentSessionId.value,
  speaker: 'assistant',
  message: finalReply,
  turn: assistantTurn, // 助理消息的轮次
  stateAfter: currentState.value ? JSON.parse(JSON.stringify(currentState.value)) : undefined,
}).catch(err => console.error('保存助理对话失败:', err));

// 异步触发摘要生成（使用当前轮次，但实际依赖对话 ID）
checkAndGenerateSummary(currentSessionId.value, turnNumber.value).catch(err => {
  console.error('摘要生成失败:', err);
});
    
     /*
    // 2. 状态更新代理（从回复中推断状态变化）
    setAgentStep('分析状态变化');
      const stateDeltaResult = await callStateUpdateAgent(
        finalReply,
        currentState.value,
        coreContent
      );
      const stateDelta = stateDeltaResult.stateDelta || {};
      console.log('[Agent] 状态变化:', stateDelta);

      // 预览合并后的状态（用于后续 NPC 和建议）
      let previewState = currentState.value ? { ...currentState.value } : {};
      if (Object.keys(stateDelta).length > 0) {
        merge(previewState, stateDelta);
      }
      */
 (async () => {
      try {                
       
       // 3. NPC & 记忆代理
    const existingNPCs = await getExistingNPCNames(currentSessionId.value!);
    const { stateDelta, new_npcs, memory_updates, __audio } = await callStateAndNPCAgent(
      finalReply,
      currentState.value,
      existingNPCs,
      coreContent
    );
    console.log('[Agent] 状态变化:', stateDelta);
    console.log('[Agent] NPC 更新:', { new_npcs, memory_updates });
    if (__audio) {
      console.log('[Agent] 音频切换指令:', __audio);
      if (__audio.bgm) {
        audioService.playCustomBGM(__audio.bgm);
      }
      if (__audio.ambient) {
        audioService.playAmbientByLocation(__audio.ambient);
      }
    }
    console.log('[Agent] 状态变化:', stateDelta);
    console.log('[Agent] NPC 更新:', {new_npcs, memory_updates});
    

      

    /*
      setAgentStep('生成建议行动');
      // 4. 建议动作代理（基于最终状态）
      const actions = await callSuggestAgent(previewState, coreContent);
      suggestedOptions.value = actions;
      console.log('[Agent] 建议选项:', actions);
        */



      // ========== 执行实际的数据变更（IPC） ==========
      // 4.1 更新游戏状态（如果 stateDelta 非空）
     // 执行状态更新（如果有）
        if (Object.keys(stateDelta).length > 0) {
          const newState = { ...currentState.value, ...stateDelta };
          await gameService.updateState({
            sessionUuid: currentSessionId.value!,
            stateKey: 'game',
            stateDelta: newState,
          });
          // 更新本地状态（注意：如果用户已经发了新消息，currentState 可能已变，这里简单覆盖）
          currentState.value = newState;
        }

        // 创建新 NPC
        for (const npc of new_npcs) {
          try {
            await window.electronAPI.game.createNPC({
              sessionUuid: currentSessionId.value!,
              name: npc.name,
              firstAppearanceTurn: turnNumber.value,
              relation: npc.relation || 'neutral',
              relationValue: npc.relationValue ?? 0,
              notes: npc.notes || '',
            });
          } catch (err: any) {
            if (!err.message?.includes('already exists')) {
              console.error(`创建 NPC ${npc.name} 失败:`, err);
            }
          }
        }

        // 添加记忆
        for (const mem of memory_updates) {
          if (!mem.npc_name) continue;
          try {
            await window.electronAPI.game.addNPCMemory({
              sessionUuid: currentSessionId.value!,
              npc_name: mem.npc_name,
              memoryText: mem.memory_text,
              turn: turnNumber.value,
               importance: mem.importance || 1,  // 如果 AI 提供了 importance 就用，否则默认 1
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error(`添加记忆失败:`, err);
          }
        }
      } catch (err) {
        console.error('后台状态/NPC 更新失败:', err);
      }
    })(); // 异步执行，不等待

  } catch (error: any) {
    // 如果第一步失败，回滚用户消息
    messages.value = originalMessages;
    turnNumber.value = originalTurn;
    throw new Error(`对话失败: ${error.message}`);
  } finally {
    isLoading.value = false;
    setAgentStep('')
  }
}


async function updateStateLocally(partialState: Partial<GameState>) {
  if (!currentSessionId.value) {
    console.warn('[Store] 无法更新状态：没有活动会话');
    return;
  }
  const newState = { ...currentState.value, ...partialState };
  currentState.value = newState;
  gameService
    .updateState({
      sessionUuid: currentSessionId.value,
      stateKey: 'game',
      stateDelta: newState,
    })
    .catch(err => console.error('Failed to sync state:', err));
}

  /**
   * 从 localStorage 恢复上次使用的会话
   */
  async function loadCurrentSessionFromLocalStorage() {
    const savedId = localStorage.getItem('currentSessionId');
    if (savedId) {
      try {
        await loadSession(savedId);
      } catch (error) {
        console.warn('Failed to load saved session, clearing localStorage');
        localStorage.removeItem('currentSessionId');
        currentSessionId.value = null;
      }
    }
  }

  /**
   * 创建新会话
   */
  async function createNewSession(sessionUuid: string, sessionName: string) {
    const result = await gameService.createSession({ sessionUuid, sessionName });
    if (!result.success) {
  throw new Error(result.error || 'Failed to create session');
}
await loadSession(sessionUuid);
  }

  return {
    // State
    currentSessionId,
    currentState,
    messages,
    turnNumber,
    // Getters
    lastMessage,
    isLoading, 
    suggestedOptions,
    // Actions
    loadSession,
    updateStateLocally,
    sendMessage,
    loadCurrentSessionFromLocalStorage,
    createNewSession,
    clearSuggestedOptions,
    currentAgentStep,
    setAgentStep,
  };
});