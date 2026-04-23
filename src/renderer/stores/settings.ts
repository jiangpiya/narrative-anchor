import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settingsService } from '../services/settingsService';
import type { SettingsDoc } from '@shared/types/ipc';
import { audioService } from '../services/audioService';

export const useSettingsStore = defineStore('settings', () => {
  // AI 配置状态
  const apiKey = ref('');
  const provider = ref<'deepseek' | 'openai' | 'custom'>('deepseek');
  const modelName = ref('deepseek-chat');
  const customBaseUrl = ref('');
  const systemPrompt = ref('');
  const docs = ref<SettingsDoc[]>([]);
  const coreSettingsContent = ref('');
  const stateSchema = ref<any[]>([]);
  const stateGroups = ref<any[]>([]);
  const groupsVersion = ref(0);

  // 音量状态（移到正确位置）
  const bgmVolume = ref(0.6);
  const ambientVolume = ref(0.4);

  // 计算属性
  const effectiveBaseUrl = computed(() => {
    if (provider.value === 'deepseek') return 'https://api.deepseek.com/v1';
    if (provider.value === 'openai') return 'https://api.openai.com/v1';
    if (provider.value === 'custom' && customBaseUrl.value) return customBaseUrl.value;
    return 'https://api.deepseek.com/v1';
  });

  const hasApiKey = () => !!apiKey.value;

  async function refreshGroups() {
    groupsVersion.value++;
    await loadStateGroups();
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

  async function loadSettings() {
    try {
      const all = await settingsService.getAllSettings();
      apiKey.value = all.apiKey || '';
      provider.value = all.provider || 'deepseek';
      modelName.value = all.modelName || 'deepseek-chat';
      customBaseUrl.value = all.customBaseUrl || '';
      systemPrompt.value = all.systemPrompt || '';
      bgmVolume.value = all.bgmVolume ?? 0.6;
      ambientVolume.value = all.ambientVolume ?? 0.4;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    audioService.setBgmVolume(bgmVolume.value);
    audioService.setAmbientVolume(ambientVolume.value);
  }

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

  async function saveBgmVolume(volume: number) {
    bgmVolume.value = volume;
    await settingsService.setSetting('bgmVolume', volume);
    audioService.setBgmVolume(volume);
  }

  async function saveAmbientVolume(volume: number) {
    ambientVolume.value = volume;
    await settingsService.setSetting('ambientVolume', volume);
    audioService.setAmbientVolume(volume);
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
      const res = (await window.electronAPI.game.getStateSchema(sessionId)) as any;
      if (res.success && res.schema) {
        stateSchema.value = res.schema;
      }
    } catch (err) {
      console.error('加载状态 Schema 失败', err);
    }
  }

  async function loadStateGroups() {
    const { useGameSessionStore } = await import('./gameSession');
    const gameStore = useGameSessionStore();
    const sessionId = gameStore.currentSessionId;
    if (!sessionId) {
      stateGroups.value = [];
      return;
    }
    try {
      const res = (await window.electronAPI.game.getStateGroups(sessionId)) as any;
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
    docs,
    coreSettingsContent,
    stateSchema,
    stateGroups,
    groupsVersion,
    bgmVolume,
    ambientVolume,
    // getters
    effectiveBaseUrl,
    hasApiKey,
    // actions
    loadSettings,
    saveApiKey,
    saveProvider,
    saveModelName,
    saveCustomBaseUrl,
    saveSystemPrompt,
    saveBgmVolume,
    saveAmbientVolume,
    clearApiKey,
    loadDocs,
    loadCoreSettingsContent,
    refreshCoreSettings,
    initialize,
    loadStateSchema,
    loadStateGroups,
    refreshStateGroups,
    refreshGroups,
  };
});