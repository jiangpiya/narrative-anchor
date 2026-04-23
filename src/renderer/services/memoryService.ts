import { useSettingsStore } from '../stores/settings';

const SUMMARY_SYSTEM_PROMPT = `你是一个游戏剧情摘要助手。请根据【已有剧情总结】和【新增的对话记录】，生成一份整合后的、连贯的剧情总结（1000字以内）。总结应概括主要事件、角色行动和剧情进展，保持时间顺序，不要遗漏重要转折。输出纯文本，不要包含标题。`;

let isGenerating = false;

/**
 * 检查并生成整合型剧情摘要（每新增 20 幕触发一次，覆盖旧摘要）
 */
export async function checkAndGenerateSummary(sessionId: string, currentTurn: number): Promise<void> {
  if (isGenerating) {
    console.log('[Summary] 已有摘要生成任务进行中，跳过');
    return;
  }
  isGenerating = true;

  try {
    // 1. 获取当前会话的所有对话（按 turn 升序）
    const dialoguesRes = await window.electronAPI.game.getRecentDialogues({ sessionUuid: sessionId, limit: 1000 });
    if (!dialoguesRes.success || !dialoguesRes.data || dialoguesRes.data.length === 0) {
      console.log('[Summary] 无对话记录，跳过');
      return;
    }
    const allDialogues = dialoguesRes.data.sort((a, b) => a.turn - b.turn);
    const maxTurn = allDialogues[allDialogues.length - 1].turn;

    // 2. 获取上次摘要的结束轮次
    const recentRes = await window.electronAPI.game.getRecentSummaries(sessionId, 1);
    let previousEndTurn = 0;
    if (recentRes.success && recentRes.summaries && recentRes.summaries.length > 0) {
      const lastSummary = recentRes.summaries[0];
      const endId = lastSummary.end_dialogue_id;
      if (endId) {
        const endDialogue = allDialogues.find(d => d.id === endId);
        if (endDialogue) previousEndTurn = endDialogue.turn;
      }
    }

    // 3. 判断是否需要生成摘要：新增对话轮次 >= 20
    const newTurns = maxTurn - previousEndTurn;
    if (newTurns < 20) {
      console.log(`[Summary] 新增对话不足 20 轮（新增 ${newTurns}），跳过`);
      return;
    }

    // 4. 获取新增的对话（轮次 > previousEndTurn）
    const newDialogues = allDialogues.filter(d => d.turn > previousEndTurn);
    if (newDialogues.length === 0) return;

    const startDialogueId = newDialogues[0].id;
    const endDialogueId = newDialogues[newDialogues.length - 1].id;
    console.log(`[Summary] 正在为对话轮次 ${previousEndTurn + 1} - ${maxTurn} 生成摘要`);

    // 5. 格式化新增对话文本
    const newDialogueText = newDialogues
      .map(d => `[第 ${d.turn} 幕] ${d.speaker === 'player' ? '用户' : 'AI'}：${d.message}`)
      .join('\n');

    // 6. 准备 AI 请求消息
    const settingsStore = useSettingsStore();
    const apiKey = settingsStore.apiKey;
    const baseUrl = settingsStore.baseUrl;
    if (!apiKey) {
      console.warn('[Summary] API Key 未设置，跳过摘要生成');
      return;
    }

    let userContent = '';
    if (previousEndTurn > 0) {
      // 获取上一次摘要文本（用于整合）
      const lastSummary = recentRes.success && recentRes.summaries ? recentRes.summaries[0] : null;
      const previousSummary = lastSummary ? lastSummary.summary_text : '';
      if (previousSummary) {
        userContent = `【已有剧情总结】\n${previousSummary}\n\n【新增对话记录】\n${newDialogueText}\n\n请整合以上内容，生成一份新的连贯剧情总结。【注意】不能丟失原有的剧情信息，新摘要要完整讲述从开始到现在的内容。`;
      } else {
        userContent = `请根据以下对话记录生成一份剧情总结：\n${newDialogueText}`;
      }
    } else {
      userContent = `请根据以下对话记录生成一份剧情总结：\n${newDialogueText}`;
    }

    const messages = [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];
    const aiResponse = await window.electronAPI.chat(messages, [], apiKey, baseUrl, 0.3);
    const newSummary = aiResponse.content?.trim() || '（无法生成摘要）';

    // 7. 保存新摘要：先删除该会话所有旧摘要，再插入一条新摘要
    const deleteRes = await window.electronAPI.game.deleteAllSummaries?.(sessionId);
    if (!deleteRes || !deleteRes.success) {
      console.warn('[Summary] 无法删除旧摘要，将保留多条记录');
    }
    const saveRes = await window.electronAPI.game.saveSummary(sessionId, startDialogueId, endDialogueId, newSummary);
    if (saveRes.success) {
      console.log(`[Summary] 剧情总结已更新，覆盖对话轮次 ${previousEndTurn + 1} - ${maxTurn}`);
    } else {
      console.error('[Summary] 保存摘要失败:', saveRes.error);
    }
  } catch (error) {
    console.error('[Summary] 摘要生成失败:', error);
  } finally {
    isGenerating = false;
  }
}