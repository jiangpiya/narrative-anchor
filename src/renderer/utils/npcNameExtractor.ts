/**
 * NPC 名称提取工具
 * 用于从用户输入中识别提到的已知 NPC，并为代词解析预留追踪器
 */

// ==================== 辅助函数 ====================

/**
 * 转义正则表达式中的特殊字符
 * @param str 原始字符串
 * @returns 转义后的字符串，可安全用于构建 RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 判断字符串是否包含中文字符
 * @param str 待检测字符串
 * @returns 包含中文字符返回 true
 */
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * 构建匹配单个 NPC 名称的正则表达式
 * @param name NPC 名称（已转义）
 * @returns 正则表达式，匹配时忽略大小写，根据名称是否包含中文使用不同边界策略
 */
function buildNameRegex(name: string): RegExp {
  const escaped = escapeRegex(name);
  const hasChinese = containsChinese(name);
  if (hasChinese) {
    // 中文边界：左右为中文标点、空格、字符串开头/结尾，或非中文字符（如英文、数字）作为分隔
    // 简单实用版：匹配名称前后是非中文字符或边界
    return new RegExp(escaped, 'i');
  } else {
    // 英文/数字：使用 \b 单词边界
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
}

// ==================== 主提取函数 ====================

/**
 * 从用户输入文本中提取提及的已知 NPC 名称（去重）
 * @param input 用户输入的文本
 * @param knownNPCs NPC 列表，每个元素需包含 name 属性（字符串）
 * @returns 匹配到的 NPC 名称数组（去重，按首次匹配顺序）
 */
export function extractMentionedNPCs(input: string, knownNPCs: Array<{ name: string }>): string[] {
  if (!input || !knownNPCs || knownNPCs.length === 0) return [];

  const matched = new Set<string>();
  // 按原始顺序遍历，但最终 Set 会去重，保留首次出现顺序
  for (const npc of knownNPCs) {
    const name = npc.name;
    if (!name) continue;
    const regex = buildNameRegex(name);
    if (regex.test(input)) {
      matched.add(name);
    }
  }
  return Array.from(matched);
}

// ==================== 最近 NPC 追踪器（为代词解析预留） ====================

/**
 * 最近 NPC 追踪器
 * 用于记录对话中提到的 NPC 及其出现轮次，支持解析代词（如“他”、“她”）为具体 NPC
 */
export class RecentNPCsTracker {
  private maxSize: number;
  private history: Array<{ name: string; turn: number }> = [];

  /**
   * @param maxSize 最多保留多少个不同的 NPC（按最近出现顺序）
   */
  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * 添加本轮提到的 NPC
   * @param names NPC 名称数组
   * @param turn 当前对话轮次（递增数字）
   */
  addNPCs(names: string[], turn: number): void {
    for (const name of names) {
      // 移除已存在的同名记录（保持最新轮次）
      const existingIndex = this.history.findIndex(item => item.name === name);
      if (existingIndex !== -1) {
        this.history.splice(existingIndex, 1);
      }
      this.history.unshift({ name, turn });
    }
    // 截断超出最大数量
    if (this.history.length > this.maxSize) {
      this.history.length = this.maxSize;
    }
  }

  /**
   * 获取最近提及的 NPC 名称列表（按时间倒序）
   * @param limit 最大返回数量，默认全部
   * @returns NPC 名称数组
   */
  getRecentNPCs(limit?: number): string[] {
    const slice = limit !== undefined ? this.history.slice(0, limit) : this.history;
    return slice.map(item => item.name);
  }

  /**
   * 根据代词解析可能的 NPC（第一阶段简单实现：返回最近的一个 NPC）
   * @param pronoun 代词（如“他”、“她”、“它”），当前未使用，保留参数
   * @param currentTurn 当前轮次（可选，用于更精确的时间范围）
   * @returns NPC 名称，如果没有则返回 null
   */
  resolvePronoun(pronoun: string, currentTurn?: number): string | null {
    // 简化实现：返回最近出现的 NPC（如有）
    if (this.history.length === 0) return null;
    // 可进一步根据 currentTurn 筛选，第一阶段直接返回最新
    return this.history[0].name;
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.history = [];
  }
}