import type { ChatMessage, Tool, ChatResponse } from '@shared/types/ai';
import { useSettingsStore } from '../stores/settings';

export const aiService = {
  async chat(
    messages: ChatMessage[],
    tools?: Tool[],
    temperature: number = 0.7
  ): Promise<ChatResponse> {
    const settingsStore = useSettingsStore();
    const apiKey = settingsStore.apiKey;
    if (!apiKey) throw new Error('API_KEY_MISSING');

    const baseUrl = settingsStore.effectiveBaseUrl;
    const model = settingsStore.modelName;

    const requestBody: any = {
      model,
      messages,
      temperature,
    };
    if (tools && tools.length) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      if (response.status === 401) errorMsg = 'Invalid API key';
      else if (response.status === 429) errorMsg = 'Rate limit exceeded';
      try {
        const data = await response.json();
        errorMsg = data.error?.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const message = data.choices[0]?.message;
    if (!message) throw new Error('Invalid API response');
    return {
      content: message.content || null,
      toolCalls: message.tool_calls || [],
    };
  },
};
