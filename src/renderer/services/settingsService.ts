import type { Settings } from '@shared/types/store';

/**
 * 设置服务 - 封装所有设置相关的 IPC 调用
 * 提供类型安全的读写方法，并统一错误处理
 */
export const settingsService = {
  /**
   * 获取所有设置
   */
  async getAllSettings(): Promise<Settings> {
    try {
      return await window.electronAPI.settings.getAll();
    } catch (error) {
      console.error('[SettingsService] getAllSettings failed:', error);
      throw new Error('Failed to load settings. Please restart the app.');
    }
  },

  /**
   * 获取单个设置值
   */
  async getSetting<K extends keyof Settings>(key: K): Promise<Settings[K] | undefined> {
    try {
      const value = await window.electronAPI.settings.get({ key });
      return value as Settings[K];
    } catch (error) {
      console.error(`[SettingsService] getSetting(${key}) failed:`, error);
      throw new Error(`Failed to get setting: ${key}`);
    }
  },

  /**
   * 设置单个配置
   */
  async setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    try {
      await window.electronAPI.settings.set({ key, value: String(value) });
    } catch (error) {
      console.error(`[SettingsService] setSetting(${key}) failed:`, error);
      throw new Error(`Failed to save setting: ${key}`);
    }
  },

  // 快捷方法
  async getApiKey(): Promise<string> {
    const key = await this.getSetting('apiKey');
    return key || '';
  },

  async setApiKey(apiKey: string): Promise<void> {
    await this.setSetting('apiKey', apiKey);
  },

  async getBaseUrl(): Promise<string> {
    const url = await this.getSetting('baseUrl');
    return url || 'https://api.deepseek.com';
  },

  async setBaseUrl(baseUrl: string): Promise<void> {
    await this.setSetting('baseUrl', baseUrl);
  },

  async getSystemPrompt(): Promise<string> {
    const prompt = await this.getSetting('systemPrompt');
    return prompt || '';
  },

  async setSystemPrompt(prompt: string): Promise<void> {
    await this.setSetting('systemPrompt', prompt);
  },

  async deleteSetting(key: keyof Settings): Promise<void> {
    try {
      await window.electronAPI.settings.delete(key);
    } catch (error) {
      console.error(`[SettingsService] deleteSetting(${key}) failed:`, error);
      throw new Error(`Failed to delete setting: ${key}`);
    }
  },
  /**
 * 获取已清洗文档的 Markdown 内容（通过文件路径）
 * @param filePath 文档的绝对路径
 * @returns 文件内容字符串
 */
    async getCleanedContent(docId: number): Promise<string> {
    try {
      const result = await window.electronAPI.settingsDocs.readDocFile(docId);
      return result.content;
    } catch (error) {
      console.error('[SettingsService] getCleanedContent failed:', error);
      throw new Error('读取核心设定失败');
    }
  }
};