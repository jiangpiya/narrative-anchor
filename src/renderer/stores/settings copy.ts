import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settingsService } from '../services/settingsService';
import type { SettingsDoc } from '@shared/types/ipc';
import { useGameSessionStore } from './gameSession';
import { audioService } from '../services/audioService';


export const useSettingsStore = defineStore('settings', () => {
  // AI 配置状态
  const apiKey = ref('');
  const provider = ref<'deepseek' | 'openai' | 'custom'>('deepseek');
  const modelName = ref('deepseek-chat');
  const customBaseUrl = ref('');
  // 原有系统提示词
  const systemPrompt = ref('');
  const docs = ref<SettingsDoc[]>([]);
  const coreSettingsContent = ref('');
  const stateSchema = ref<any[]>([]);
  const stateGroups = ref<any[]>([]);
  const groupsVersion = ref(0); // 用于触发刷新
  const effectiveBaseUrl = computed(() => {
    if (provider.value === 'deepseek') return 'https://api.deepseek.com/v1';
    if (provider.value === 'openai') return 'https://api.openai.com/v1';
    if (provider.value === 'custom' && customBaseUrl.value) return customBaseUrl.value;
    return 'https://api.deepseek.com/v1'; // fallback
     // 新增：音量状态
  const bgmVolume = ref(0.6);
  const ambientVolume = ref(0.4);
  });


  const hasApiKey = () => !!apiKey.value;

async function refreshGroups() {
  groupsVersion.value++;
  await loadStateGroups(); // 重新加载分组
}


  async function loadDocs() {
    try {
      const allDocs = await window.electronAPI.settingsDocs.getDocs();
      docs.value = allDocs;
    } catch (error) {
      console.error('Failed to load docs:', error);
    }
  }

  async function loadCoreSettingsContent() {
    try {
      const coreDocs = docs.value.filter(doc => doc.enabled === true && doc.isCore === true);
      if (coreDocs.length === 0) {
        coreSettingsContent.value = '';
        return;
      }
      const contents = await Promise.all(
        coreDocs.map(async (doc) => {
          try {
            const { content } = await window.electronAPI.settingsDocs.readDocFile(doc.id);
            return content;
          } catch (err) {
            console.error(`Failed to read doc ${doc.id}:`, err);
            return '';
          }
        })
      );
      const merged = contents.filter(c => c.trim()).join('\n\n');
      coreSettingsContent.value = merged;
      console.log('[Settings] Core settings loaded, length:', merged.length);
    } catch (error) {
      console.error('Failed to load core settings content:', error);
      coreSettingsContent.value = '';
    }
  }

  async function refreshCoreSettings() {
    await loadDocs();
    await loadCoreSettingsContent();
  }

// 加载所有设置
  async function loadSettings() {
    try {
      const all = await settingsService.getAllSettings();
      apiKey.value = all.apiKey || '';
      provider.value = all.provider || 'deepseek';
      modelName.value = all.modelName || 'deepseek-chat';
      customBaseUrl.value = all.customBaseUrl || '';
      systemPrompt.value = all.systemPrompt || '';
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    const storedBgm = await settingsService.getSetting('bgmVolume');
    if (storedBgm !== undefined) bgmVolume.value = storedBgm;
    const storedAmbient = await settingsService.getSetting('ambientVolume');
    if (storedAmbient !== undefined) ambientVolume.value = storedAmbient;
    // 应用音量到音频服务
    audioService.setBgmVolume(bgmVolume.value);
    audioService.setAmbientVolume(ambientVolume.value);
  }

  // 保存各个设置
  async function saveApiKey(key: string) {
    await settingsService.setApiKey(key);
    apiKey.value = key;
  }
  async function saveProvider(p: typeof provider.value) {
    await settingsService.setSetting('provider', p);
    provider.value = p;
  }
  async function saveModelName(name: string) {
    await settingsService.setSetting('modelName', name);
    modelName.value = name;
  }
  async function saveCustomBaseUrl(url: string) {
    await settingsService.setSetting('customBaseUrl', url);
    customBaseUrl.value = url;
  }
  async function saveSystemPrompt(prompt: string) {
    await settingsService.setSystemPrompt(prompt);
    systemPrompt.value = prompt;
  }

  async function clearApiKey() {
    await saveApiKey('');
  }


  async function initialize() {
    await loadSettings();
    await loadDocs();
    await loadCoreSettingsContent();
  }

  async function loadStateSchema() {
    const { useGameSessionStore } = await import('./gameSession');
    const gameStore = useGameSessionStore();
    const sessionId = gameStore.currentSessionId;
    if (!sessionId) return;
    try {
      const res = await window.electronAPI.game.getStateSchema(sessionId);
      if (res.success && res.schema) {
        stateSchema.value = res.schema;
      }
    } catch (err) {
      console.error('加载状态 Schema 失败', err);
    }
  }

  // 加载状态分组（动态导入避免循环依赖）
  async function loadStateGroups() {
    const { useGameSessionStore } = await import('./gameSession');
    const gameStore = useGameSessionStore();
    const sessionId = gameStore.currentSessionId;
    if (!sessionId) {
      stateGroups.value = [];
      return;
    }
    try {
      const res = await window.electronAPI.game.getStateGroups(sessionId);
      if (res.success && res.groups) {
        stateGroups.value = JSON.parse(JSON.stringify(res.groups));
      } else {
        stateGroups.value = [];
      }
    } catch (err) {
      console.error('加载状态分组失败', err);
      stateGroups.value = [];
    } 
  }
  async function refreshStateGroups() {
    await loadStateGroups();
  }

  return {
        // state
    apiKey,
    provider,
    modelName,
    customBaseUrl,
    systemPrompt,
    // getters
    effectiveBaseUrl,
    // actions
    loadSettings,
    saveApiKey,
    saveProvider,
    saveModelName,
    saveCustomBaseUrl,
    saveSystemPrompt,
    clearApiKey,
    docs,
    coreSettingsContent,
    stateSchema,
    stateGroups,
    hasApiKey,
    loadDocs,
    loadCoreSettingsContent,
    refreshCoreSettings,
    initialize,
    loadStateSchema,
    loadStateGroups,
    refreshStateGroups,
    refreshGroups
  };
});