import { ipcMain } from 'electron';
import Store from 'electron-store';
import { SETTINGS_CHANNELS, Settings, SettingsGetParams, SettingsSetParams } from '@shared/types/store';

// 配置 electron-store，使用加密（生产环境建议从环境变量读取密钥）
const store = new Store<Settings>({
  name: 'user-settings',
  encryptionKey: 'narrative-anchor-secret-key-2024',
defaults: {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  systemPrompt: '...',
  provider: 'deepseek',
  modelName: 'deepseek-chat',
  customBaseUrl: '',
  bgmVolume: 0.6,
  ambientVolume: 0.4,
},
});

/**
 * 注册 Settings IPC 处理器
 */
export function registerSettingsHandlers() {
  // 获取所有设置
  ipcMain.handle(SETTINGS_CHANNELS.GET_ALL, () => {
    try {
      return store.store;
    } catch (error) {
      console.error('[Settings IPC] GetAll error:', error);
      throw new Error('Failed to get all settings');
    }
  });

  // 获取单个设置
  ipcMain.handle(SETTINGS_CHANNELS.GET, (event, params: SettingsGetParams) => {
    try {
      const { key } = params;
      return store.get(key);
    } catch (error) {
      console.error('[Settings IPC] Get error:', error);
      throw new Error(`Failed to get setting ${params.key}`);
    }
  });

  // 设置单个配置
  ipcMain.handle(SETTINGS_CHANNELS.SET, (event, params: SettingsSetParams) => {
    try {
      const { key, value } = params;
      store.set(key, value);
      return true;
    } catch (error) {
      console.error('[Settings IPC] Set error:', error);
      throw new Error(`Failed to set setting ${params.key}`);
    }
  });

  // 删除设置
  ipcMain.handle(SETTINGS_CHANNELS.DELETE, (event, key: keyof Settings) => {
    try {
      store.delete(key);
      return true;
    } catch (error) {
      console.error('[Settings IPC] Delete error:', error);
      throw new Error(`Failed to delete setting ${key}`);
    }
  });
}